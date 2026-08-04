package com.library.service;

import com.library.dto.IssuedBookDTO;
import com.library.dto.IssueBookRequest;
import com.library.entity.Book;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.Notification;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BookRepository;
import com.library.repository.FineRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IssuedBookService {

    public static final String STATUS_ISSUED = IssuedBook.STATUS_ISSUED;
    public static final String STATUS_RETURNED = IssuedBook.STATUS_RETURNED;

    private final IssuedBookRepository issuedBookRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final FineRepository fineRepository;
    private final FineService fineService;
    private final ReservationService reservationService;
    private final ReadingHistoryService readingHistoryService;
    private final NotificationService notificationService;
    private final MailService mailService;

    public List<IssuedBookDTO> getAllIssuedBooks() {
        return issuedBookRepository.findAllByOrderByIssueDateDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<IssuedBookDTO> getActiveIssuedBooks() {
        return issuedBookRepository.findByStatusOrderByIssueDateDesc(STATUS_ISSUED)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<IssuedBookDTO> getReturnedIssuedBooks() {
        return issuedBookRepository.findByStatusOrderByIssueDateDesc(STATUS_RETURNED)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public IssuedBook getById(Long id) {
        return issuedBookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IssuedBook", id));
    }

    @Transactional
    public IssuedBook issueBook(Long bookId, Long studentId) {
        return issueBook(bookId, studentId, null, null);
    }

    @Transactional
    public IssuedBook issueBook(Long bookId, Long studentId, String issueDateStr, String returnDateStr) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User", studentId));
        if (book.getAvailableCopies() == null || book.getAvailableCopies() <= 0) {
            throw new BusinessException("No copies available for this book");
        }
        LocalDate issue = (issueDateStr != null && !issueDateStr.isBlank())
                ? LocalDate.parse(issueDateStr) : LocalDate.now();
        LocalDate due = (returnDateStr != null && !returnDateStr.isBlank())
                ? LocalDate.parse(returnDateStr) : issue.plusDays(14);
        IssuedBook issued = IssuedBook.builder()
                .book(book)
                .user(user)
                .issueDate(issue)
                .dueDate(due)
                .status(STATUS_ISSUED)
                .build();
        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);
        IssuedBook saved = issuedBookRepository.save(issued);

        readingHistoryService.recordBorrow(user, book, saved, "Admin Issue");

        return issuedBookRepository.findDetailedById(saved.getId()).orElse(saved);
    }

    @Transactional
    public IssuedBook issueBook(IssueBookRequest request) {
        return issueBook(request.getBookId(), request.getUserId(), request.getIssueDate(), request.getReturnDate());
    }

    @Transactional
    public IssuedBook requestReturn(Long issuedBookId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        IssuedBook issued = issuedBookRepository.findDetailedById(issuedBookId)
                .orElseThrow(() -> new ResourceNotFoundException("IssuedBook", issuedBookId));
        if (STATUS_RETURNED.equals(issued.getStatus())) {
            throw new BusinessException("Book is already returned");
        }
        if (user.getRole() != User.Role.ADMIN
                && issued.getUser() != null && !issued.getUser().getId().equals(user.getId())) {
            throw new BusinessException("You can only request a return for a book you borrowed.");
        }
        if (issued.getReturnRequestedAt() != null) {
            throw new BusinessException("Return already requested and pending admin approval.");
        }
        issued.setReturnRequestedAt(LocalDate.now());
        IssuedBook saved = issuedBookRepository.save(issued);

        String bookTitle = issued.getBook() != null ? issued.getBook().getTitle() : "book";
        notificationService.notify(user, Notification.TYPE_RETURN_REQUESTED,
                "Return Request Submitted",
                "Your return request for \"" + bookTitle + "\" has been submitted and is awaiting administrator approval.",
                "/issued-books");
        mailService.send(user.getEmail(), "Return Request Received",
                "Dear " + user.getName() + ",\n\n"
                        + "Your return request for \"" + bookTitle + "\" has been received. "
                        + "An administrator will verify and approve the return shortly.\n\n— Lumina Library");

        log.info("User {} requested return for IssuedBook id={}", user.getId(), issuedBookId);
        return issuedBookRepository.findDetailedById(saved.getId()).orElse(saved);
    }

    @Transactional
    public IssuedBook returnBook(Long issuedBookId) {
        IssuedBook issued = issuedBookRepository.findDetailedById(issuedBookId)
                .orElseThrow(() -> new ResourceNotFoundException("IssuedBook", issuedBookId));
        if (STATUS_RETURNED.equals(issued.getStatus())) {
            throw new BusinessException("Book is already returned");
        }
        Book book = issued.getBook();
        issued.setReturnDate(LocalDate.now());
        issued.setReturnRequestedAt(null);
        issued.setStatus(STATUS_RETURNED);
        book.setAvailableCopies(book.getAvailableCopies() + 1);
        bookRepository.save(book);
        IssuedBook saved = issuedBookRepository.save(issued);

        User borrower = issued.getUser();
        if (borrower != null) {
            notificationService.notify(borrower, Notification.TYPE_RETURN_APPROVED,
                    "Return Approved",
                    "Your return for \"" + book.getTitle() + "\" was approved by the library. Thank you!",
                    "/issued-books");
            mailService.send(borrower.getEmail(), "Return Approved",
                    "Dear " + borrower.getName() + ",\n"
                            + "Your return for \"" + book.getTitle() + "\" has been approved by the library. "
                            + "Any overdue fines, if applicable, have been recorded.\n\n— Lumina Library");
        }

        Fine fine = null;
        if (issued.getDueDate() != null && LocalDate.now().isAfter(issued.getDueDate())) {
            try {
                fine = fineService.generateOverdueFine(saved);
                log.info("Overdue fine generated for IssuedBook id={}", saved.getId());
            } catch (Exception e) {
                log.error("Failed to generate fine for IssuedBook id={}: {}", saved.getId(), e.getMessage());
            }
        }

        try {
            readingHistoryService.recordReturnWithFine(saved, fine);
        } catch (Exception e) {
            log.error("Failed to update reading history for IssuedBook id={}: {}", saved.getId(), e.getMessage());
        }

        try {
            reservationService.fulfillNextInQueue(book);
        } catch (Exception e) {
            log.error("Failed to fulfill next reservation for book id={}: {}", book.getId(), e.getMessage());
        }

        return issuedBookRepository.findDetailedById(saved.getId()).orElse(saved);
    }

    public List<IssuedBookDTO> getIssuedBooksByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
        return issuedBookRepository.findByUser_IdOrderByIssueDateDesc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<IssuedBook> getIssuedBooksByStudent(Long studentId) {
        if (!userRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("User", studentId);
        }
        return issuedBookRepository.findByUser_IdOrderByIssueDateDesc(studentId);
    }

    public List<IssuedBook> getMyIssuedBooks(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        return issuedBookRepository.findByUser_IdOrderByIssueDateDesc(user.getId());
    }

    public List<IssuedBook> getOverdueBooks() {
        return issuedBookRepository.findByStatusAndDueDateBeforeOrderByDueDateAsc(STATUS_ISSUED, LocalDate.now());
    }

    @Transactional
    public void sendOverdueReminder(Long issuedBookId) {
        IssuedBook issued = issuedBookRepository.findDetailedById(issuedBookId)
                .orElseThrow(() -> new ResourceNotFoundException("IssuedBook", issuedBookId));
        if (STATUS_RETURNED.equals(issued.getStatus())) {
            throw new BusinessException("This loan has already been returned.");
        }
        User borrower = issued.getUser();
        if (borrower == null) {
            throw new BusinessException("No borrower is attached to this loan.");
        }
        String bookTitle = issued.getBook() != null ? issued.getBook().getTitle() : "book";
        notificationService.notify(borrower, Notification.TYPE_BOOK_DUE,
                "Book Due / Overdue Reminder",
                "Your loan of \"" + bookTitle + "\" is due on " + issued.getDueDate()
                        + ". Please return it on time to avoid overdue fines.",
                "/issued-books");
        mailService.send(borrower.getEmail(), "Book Due Reminder",
                "Dear " + borrower.getName() + ",\n\n"
                        + "This is a reminder that your loan of \"" + bookTitle + "\" is due on "
                        + issued.getDueDate() + ".\n"
                        + "Please return it by the due date to avoid overdue fines.\n\n— Lumina Library");
        log.info("Overdue reminder sent for IssuedBook id={}", issuedBookId);
    }

    @Transactional
    public Fine generateOverdueFineFor(Long issuedBookId) {
        IssuedBook issued = issuedBookRepository.findDetailedById(issuedBookId)
                .orElseThrow(() -> new ResourceNotFoundException("IssuedBook", issuedBookId));
        if (STATUS_RETURNED.equals(issued.getStatus())) {
            throw new BusinessException("This loan has already been returned.");
        }
        if (issued.getDueDate() == null || !LocalDate.now().isAfter(issued.getDueDate())) {
            throw new BusinessException("This loan is not overdue yet.");
        }
        if (fineRepository.existsByIssuedBookIdAndStatus(issuedBookId, Fine.STATUS_UNPAID)) {
            throw new BusinessException("An unpaid fine already exists for this loan.");
        }
        Fine fine = fineService.generateOverdueFine(issued);
        if (fine == null) {
            throw new BusinessException("No fine could be generated for this loan.");
        }
        User borrower = issued.getUser();
        if (borrower != null) {
            String bookTitle = issued.getBook() != null ? issued.getBook().getTitle() : "book";
            notificationService.notify(borrower, Notification.TYPE_FINE,
                    "Overdue Fine Charged",
                    "A fine of $" + fine.getAmount() + " has been charged for the overdue loan of \""
                            + bookTitle + "\".",
                    "/fines");
            mailService.send(borrower.getEmail(), "Overdue Fine Charged",
                    "Dear " + borrower.getName() + ",\n\n"
                            + "An overdue fine of $" + fine.getAmount() + " has been charged for \""
                            + bookTitle + "\". Please pay it at your earliest convenience.\n\n— Lumina Library");
        }
        log.info("Overdue fine id={} generated for IssuedBook id={}", fine.getId(), issuedBookId);
        return fine;
    }

    private IssuedBookDTO toDTO(IssuedBook issued) {
        return IssuedBookDTO.builder()
                .id(issued.getId())
                .bookId(issued.getBook() != null ? issued.getBook().getId() : null)
                .bookTitle(issued.getBook() != null ? issued.getBook().getTitle() : "Unknown Book")
                .bookCover(issued.getBook() != null ? issued.getBook().getCoverImageUrl() : null)
                .bookAuthor(issued.getBook() != null ? issued.getBook().getAuthor() : null)
                .bookIsbn(issued.getBook() != null ? issued.getBook().getIsbn() : null)
                .bookCategory(issued.getBook() != null ? issued.getBook().getCategory() : null)
                .bookPublisher(issued.getBook() != null ? issued.getBook().getPublisher() : null)
                .bookShelf(issued.getBook() != null ? issued.getBook().getShelfLocation() : null)
                .memberId(issued.getUser() != null ? issued.getUser().getId() : null)
                .memberName(issued.getUser() != null ? issued.getUser().getName() : null)
                .memberEmail(issued.getUser() != null ? issued.getUser().getEmail() : null)
                .issuedByName(null)
                .issueDate(issued.getIssueDate())
                .dueDate(issued.getDueDate())
                .returnDate(issued.getReturnDate())
                .returnRequestedAt(issued.getReturnRequestedAt())
                .issueStatus(issued.getStatus())
                .fineAmount(null)
                .reservationId(null)
                .build();
    }
}
