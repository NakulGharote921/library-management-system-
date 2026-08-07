package com.library.service;

import com.library.entity.Book;
import com.library.entity.IssuedBook;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.config.UploadPaths;
import com.library.entity.Category;
import com.library.repository.BookRepository;
import com.library.repository.CategoryRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookService {

    private final BookRepository bookRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SubscriptionService subscriptionService;
    private final WishlistService wishlistService;
    private final ReservationService reservationService;
    private final ReadingHistoryService readingHistoryService;
    private final FineService fineService;

    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }

    public Book getBookById(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", id));
    }

    @Transactional
    public Book addBook(Book book) {
        validateCopies(book);
        if (book.getAvailableCopies() == null) {
            book.setAvailableCopies(book.getTotalCopies());
        }
        return bookRepository.save(book);
    }

    @Transactional
    public Book updateBook(Long id, Book incoming) {
        Book existing = getBookById(id);
        validateCopies(incoming);
        int borrowed = existing.getTotalCopies() - existing.getAvailableCopies();
        if (incoming.getTotalCopies() < borrowed) {
            throw new BusinessException("totalCopies cannot be less than copies currently issued (" + borrowed + ")");
        }
        existing.setTitle(incoming.getTitle());
        existing.setAuthor(incoming.getAuthor());
        existing.setCategory(incoming.getCategory());
        existing.setIsbn(incoming.getIsbn());
        existing.setTotalCopies(incoming.getTotalCopies());
        int newAvailable = incoming.getTotalCopies() - borrowed;
        existing.setAvailableCopies(newAvailable);
        return bookRepository.save(existing);
    }

    @Transactional
    public void deleteBook(Long id) {
        Book book = getBookById(id);
        boolean hasActive = issuedBookRepository.findByBook(book).stream()
                .anyMatch(ib -> IssuedBook.STATUS_ISSUED.equals(ib.getStatus()));
        if (hasActive) {
            throw new BusinessException("Cannot delete book with active issues");
        }
        bookRepository.delete(book);
    }

    public List<Book> searchBooks(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return getAllBooks();
        }
        return bookRepository.searchByTitleOrAuthor(keyword.trim());
    }

    public boolean checkAvailability(Long bookId) {
        Book book = getBookById(bookId);
        return book.getAvailableCopies() != null && book.getAvailableCopies() > 0;
    }

    public List<Book> getAvailableBooks() {
        return bookRepository.findByAvailableCopiesGreaterThan(0);
    }

    @Transactional
    public IssuedBook borrowBook(String userEmail, Long bookId) {
        return borrowBook(userEmail, bookId, LocalDate.now(), null);
    }

    @Transactional
    public IssuedBook borrowBook(String userEmail, Long bookId, LocalDate issueDate) {
        return borrowBook(userEmail, bookId, issueDate, null);
    }

    @Transactional
    public IssuedBook borrowBook(String userEmail, Long bookId, LocalDate issueDate, LocalDate dueDate) {
        Book book = getBookById(bookId);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));

        UserSubscription sub = validateBorrowPrivileges(user, book);
        SubscriptionPlan plan = sub.getPlan();

        LocalDate issue = (issueDate != null) ? issueDate : LocalDate.now();
        LocalDate maxDue = issue.plusDays(plan.getMaxLoanDays());
        LocalDate due = (dueDate != null) ? dueDate : maxDue;
        if (due.isBefore(issue)) due = issue;
        if (due.isAfter(maxDue)) due = maxDue;

        IssuedBook issued = IssuedBook.builder()
                .book(book)
                .user(user)
                .issueDate(issue)
                .dueDate(due)
                .status(IssuedBook.STATUS_ISSUED)
                .build();

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);

        log.info("Book id={} borrowed by user id={} under plan '{}'", bookId, user.getId(), plan.getName());

        wishlistService.autoRemoveOnBorrow(userEmail, bookId);

        reservationService.autoCloseReservation(user, bookId);

        IssuedBook saved = issuedBookRepository.save(issued);

        readingHistoryService.recordBorrow(user, book, saved, plan.getName());

        return saved;
    }

    public UserSubscription validateBorrowPrivileges(User user, Book book) {
        if (!user.isActive()) {
            throw new BusinessException("Your account is suspended. Contact an administrator.");
        }

        subscriptionService.validateBorrowingPrivileges(user);

        if (fineService.getOutstandingFineCount(user.getId()) > 0) {
            throw new BusinessException("You have unpaid fines. Clear them before borrowing a book.");
        }

        if (book.getAvailableCopies() == null || book.getAvailableCopies() <= 0) {
            throw new BusinessException("No copies available for this book.");
        }

        boolean alreadyBorrowed = issuedBookRepository.findByUser(user).stream()
                .anyMatch(ib -> ib.getBook().getId().equals(book.getId()) && IssuedBook.STATUS_ISSUED.equals(ib.getStatus()));
        if (alreadyBorrowed) {
            throw new BusinessException("You have already borrowed this book.");
        }

        UserSubscription sub = subscriptionService.getActiveSubscription(user)
                .orElseThrow(() -> new BusinessException("No active subscription."));
        SubscriptionPlan plan = sub.getPlan();

        long activeLoans = issuedBookRepository.findByUser(user).stream()
                .filter(ib -> IssuedBook.STATUS_ISSUED.equals(ib.getStatus()))
                .count();
        if (activeLoans >= plan.getMaxBooks()) {
            throw new BusinessException("Borrowing limit reached (" + plan.getMaxBooks() + "). Return a book first.");
        }

        return sub;
    }

    @Transactional
    public int removeCategory(String categoryName) {
        List<Book> books = bookRepository.findByCategory(categoryName);
        for (Book book : books) {
            book.setCategory("");
        }
        bookRepository.saveAll(books);
        log.info("Removed category '{}' from {} books", categoryName, books.size());
        return books.size();
    }

    @Transactional(readOnly = true)
    public List<Book> findByCategoryId(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryId));
        return bookRepository.findByCategory(category.getName());
    }

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    @Transactional
    public Book uploadCover(Long id, MultipartFile file) {
        Book book = getBookById(id);
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Please choose a cover image file to upload.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("Cover image must be 5MB or smaller.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BusinessException("Only image files are allowed (JPEG, PNG, etc).");
        }
        try {
            Path dir = UploadPaths.coversDir();
            Files.createDirectories(dir);
            String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
            if (extension == null) {
                extension = switch (contentType) {
                    case "image/png" -> "png";
                    case "image/webp" -> "webp";
                    case "image/gif" -> "gif";
                    default -> "jpg";
                };
            }
            String filename = "book-" + id + "-" + UUID.randomUUID() + "." + extension.toLowerCase();
            Path target = dir.resolve(filename);
            file.transferTo(target);
            book.setCoverImageUrl("/api/uploads/covers/" + filename);
            bookRepository.save(book);
            log.info("Uploaded cover for book {} -> {}", id, filename);
            return book;
        } catch (IOException e) {
            log.error("Failed to store cover for book {}", id, e);
            throw new BusinessException("Failed to store cover image: " + e.getMessage());
        }
    }

    private void validateCopies(Book book) {
        if (book.getTotalCopies() == null || book.getTotalCopies() < 0) {
            throw new BusinessException("totalCopies must be zero or positive");
        }
        if (book.getAvailableCopies() != null && book.getAvailableCopies() > book.getTotalCopies()) {
            throw new BusinessException("availableCopies cannot exceed totalCopies");
        }
    }
}
