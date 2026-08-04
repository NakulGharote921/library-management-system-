package com.library.service;

import com.library.dto.ReadingHistoryDTO;
import com.library.dto.ReadingStatsDTO;
import com.library.entity.*;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BookRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.ReadingHistoryRepository;
import com.library.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReadingHistoryService {

    private final ReadingHistoryRepository readingHistoryRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final IssuedBookRepository issuedBookRepository;

    @Transactional
    public void recordBorrow(User user, Book book, IssuedBook issuedBook, String planName) {
        ReadingHistory history = ReadingHistory.builder()
                .user(user)
                .book(book)
                .issuedBook(issuedBook)
                .borrowDate(issuedBook.getIssueDate() != null ? issuedBook.getIssueDate() : LocalDate.now())
                .dueDate(issuedBook.getDueDate())
                .status(ReadingHistory.STATUS_BORROWED)
                .membershipPlanName(planName)
                .build();
        readingHistoryRepository.save(history);
        log.info("Reading history record created for user id={}, book id={}", user.getId(), book.getId());
    }

    @Transactional
    public void recordReturn(IssuedBook issuedBook) {
        ReadingHistory history = readingHistoryRepository
                .findByUserAndIssuedBook(issuedBook.getUser(), issuedBook)
                .orElse(null);
        if (history == null) return;

        LocalDate returnDate = issuedBook.getReturnDate() != null ? issuedBook.getReturnDate() : LocalDate.now();
        history.setReturnDate(returnDate);
        history.setDaysBorrowed((int) ChronoUnit.DAYS.between(history.getBorrowDate(), returnDate));

        if (issuedBook.getDueDate() != null && returnDate.isAfter(issuedBook.getDueDate())) {
            history.setStatus(ReadingHistory.STATUS_OVERDUE);
        } else {
            history.setStatus(ReadingHistory.STATUS_RETURNED);
        }

        history.setFineAmount(null);
        history.setFineStatus(null);

        readingHistoryRepository.save(history);
        log.info("Reading history updated for issued book id={}", issuedBook.getId());
    }

    @Transactional
    public void recordReturnWithFine(IssuedBook issuedBook, Fine fine) {        ReadingHistory history = readingHistoryRepository
                .findByUserAndIssuedBook(issuedBook.getUser(), issuedBook)
                .orElse(null);
        if (history == null) return;

        LocalDate returnDate = issuedBook.getReturnDate() != null ? issuedBook.getReturnDate() : LocalDate.now();
        history.setReturnDate(returnDate);
        history.setDaysBorrowed((int) ChronoUnit.DAYS.between(history.getBorrowDate(), returnDate));
        history.setStatus(ReadingHistory.STATUS_OVERDUE);

        if (fine != null) {
            history.setFineAmount(fine.getAmount());
            history.setFineStatus(fine.getStatus());
        }

        readingHistoryRepository.save(history);
        log.info("Reading history updated with fine for issued book id={}", issuedBook.getId());
    }

    @Transactional
    public void markFinePaid(IssuedBook issuedBook) {
        ReadingHistory history = readingHistoryRepository
                .findByUserAndIssuedBook(issuedBook.getUser(), issuedBook)
                .orElse(null);
        if (history == null) return;

        if (history.getFineStatus() != null && !Fine.STATUS_PAID.equals(history.getFineStatus())) {
            history.setFineStatus(Fine.STATUS_PAID);
            readingHistoryRepository.save(history);
            log.info("Reading history fine marked PAID for issued book id={}", issuedBook.getId());
        }
    }

    @Transactional
    public void markLostOrDamaged(IssuedBook issuedBook, String status, BigDecimal fineAmount, String fineStatus) {
        ReadingHistory history = readingHistoryRepository
                .findByUserAndIssuedBook(issuedBook.getUser(), issuedBook)
                .orElse(null);
        if (history == null) return;

        history.setStatus(status);
        history.setFineAmount(fineAmount);
        history.setFineStatus(fineStatus);
        readingHistoryRepository.save(history);
        log.info("Reading history marked as {} for issued book id={}", status, issuedBook.getId());
    }

    @Transactional(readOnly = true)
    public List<ReadingHistoryDTO> getMyHistory(String email, String status, String keyword, String sort) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));

        List<ReadingHistory> records;
        if (status != null && !status.isEmpty()) {
            records = readingHistoryRepository.findByUserAndStatusOrderByBorrowDateDesc(user, status.toUpperCase());
        } else {
            records = readingHistoryRepository.findByUserOrderByBorrowDateDesc(user);
        }

        if (keyword != null && !keyword.isEmpty()) {
            String k = keyword.toLowerCase();
            records = records.stream()
                    .filter(r -> r.getBook().getTitle().toLowerCase().contains(k)
                            || r.getBook().getAuthor().toLowerCase().contains(k))
                    .collect(Collectors.toList());
        }

        if (sort != null) {
            switch (sort) {
                case "oldest":
                    records.sort(Comparator.comparing(ReadingHistory::getBorrowDate));
                    break;
                case "recentlyReturned":
                    records.sort(Comparator.comparing(ReadingHistory::getReturnDate, Comparator.nullsLast(Comparator.reverseOrder())));
                    break;
                case "highestRated":
                    records.sort(Comparator.comparing(ReadingHistory::getRating, Comparator.nullsLast(Comparator.reverseOrder())));
                    break;
                case "alphabetical":
                    records.sort(Comparator.comparing(r -> r.getBook().getTitle()));
                    break;
                default:
                    records.sort(Comparator.comparing(ReadingHistory::getBorrowDate).reversed());
            }
        }

        return records.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReadingHistoryDTO getById(Long id) {
        ReadingHistory history = readingHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReadingHistory", id));
        return toDTO(history);
    }

    @Transactional(readOnly = true)
    public ReadingStatsDTO getMyStats(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
        return buildStats(user);
    }

    @Transactional(readOnly = true)
    public List<ReadingHistoryDTO> getHistoryByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return readingHistoryRepository.findByUserOrderByBorrowDateDesc(user)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReadingStatsDTO getStatsByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return buildStats(user);
    }

    private ReadingStatsDTO buildStats(User user) {

        long totalBooksRead = readingHistoryRepository.countByUser(user);
        long currentlyBorrowed = readingHistoryRepository.countByUserAndStatus(user, ReadingHistory.STATUS_BORROWED);
        long returned = readingHistoryRepository.countByUserAndStatus(user, ReadingHistory.STATUS_RETURNED);
        long overdue = readingHistoryRepository.countByUserAndStatus(user, ReadingHistory.STATUS_OVERDUE);

        List<ReadingHistory> all = readingHistoryRepository.findByUserOrderByBorrowDateDesc(user);

        String favoriteGenre = all.stream()
                .filter(r -> r.getBook().getCategory() != null)
                .collect(Collectors.groupingBy(r -> r.getBook().getCategory(), Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        long totalReadingDays = all.stream()
                .filter(r -> r.getDaysBorrowed() != null)
                .mapToLong(ReadingHistory::getDaysBorrowed)
                .sum();

        BigDecimal totalFinePaid = all.stream()
                .filter(r -> r.getFineAmount() != null && Fine.STATUS_PAID.equals(r.getFineStatus()))
                .map(ReadingHistory::getFineAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double averageRating = all.stream()
                .filter(r -> r.getRating() != null)
                .mapToInt(ReadingHistory::getRating)
                .average()
                .orElse(0.0);

        double averageDuration = all.stream()
                .filter(r -> r.getDaysBorrowed() != null)
                .mapToInt(ReadingHistory::getDaysBorrowed)
                .average()
                .orElse(0.0);

        long onTimeReturns = all.stream()
                .filter(r -> ReadingHistory.STATUS_RETURNED.equals(r.getStatus()))
                .count();

        Map<String, Long> genreDistribution = all.stream()
                .filter(r -> r.getBook().getCategory() != null)
                .collect(Collectors.groupingBy(r -> r.getBook().getCategory(), Collectors.counting()));

        return ReadingStatsDTO.builder()
                .totalBooksRead(totalBooksRead)
                .currentlyBorrowed(currentlyBorrowed)
                .returnedBooks(returned)
                .overdueReturns(overdue)
                .favoriteGenre(favoriteGenre)
                .totalReadingDays(totalReadingDays)
                .totalFinePaid(totalFinePaid)
                .averageRating(Math.round(averageRating * 100.0) / 100.0)
                .averageBorrowDuration(Math.round(averageDuration * 10.0) / 10.0)
                .onTimeReturns(onTimeReturns)
                .genreDistribution(genreDistribution)
                .build();
    }

    @Transactional
    public ReadingHistoryDTO updateRating(Long id, int rating, String email) {
        ReadingHistory history = readingHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReadingHistory", id));

        if (!history.getUser().getEmail().equals(email)) {
            throw new BusinessException("You can only rate your own reading history entries.");
        }

        if (ReadingHistory.STATUS_BORROWED.equals(history.getStatus())) {
            throw new BusinessException("You can only rate returned books.");
        }

        history.setRating(rating);
        history.setReviewSubmittedAt(LocalDateTime.now());
        readingHistoryRepository.save(history);
        log.info("Rating updated for reading history id={}", id);

        return toDTO(history);
    }

    @Transactional
    public ReadingHistoryDTO updateReview(Long id, String review, String email) {
        ReadingHistory history = readingHistoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReadingHistory", id));

        if (!history.getUser().getEmail().equals(email)) {
            throw new BusinessException("You can only review your own reading history entries.");
        }

        if (ReadingHistory.STATUS_BORROWED.equals(history.getStatus())) {
            throw new BusinessException("You can only review returned books.");
        }

        history.setReview(review);
        history.setReviewSubmittedAt(LocalDateTime.now());
        readingHistoryRepository.save(history);
        log.info("Review updated for reading history id={}", id);

        return toDTO(history);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRecommendations(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));

        List<ReadingHistory> history = readingHistoryRepository.findByUserOrderByBorrowDateDesc(user);
        Set<String> borrowedIsbns = history.stream()
                .map(r -> r.getBook().getIsbn())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Long> categoryCounts = history.stream()
                .filter(r -> r.getBook().getCategory() != null)
                .collect(Collectors.groupingBy(r -> r.getBook().getCategory(), Collectors.counting()));

        String topCategory = categoryCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        if (topCategory == null) return List.of();

        List<Book> candidates = bookRepository.findByCategory(topCategory);
        List<Map<String, Object>> recommendations = candidates.stream()
                .filter(b -> !borrowedIsbns.contains(b.getIsbn()))
                .limit(4)
                .map(b -> {
                    Map<String, Object> rec = new LinkedHashMap<>();
                    rec.put("id", b.getId());
                    rec.put("title", b.getTitle());
                    rec.put("author", b.getAuthor());
                    rec.put("category", b.getCategory());
                    rec.put("coverImageUrl", b.getCoverImageUrl());
                    rec.put("averageRating", b.getAverageRating());
                    return rec;
                })
                .collect(Collectors.toList());

        return recommendations;
    }

    private ReadingHistoryDTO toDTO(ReadingHistory r) {
        return ReadingHistoryDTO.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .userName(r.getUser().getName())
                .bookId(r.getBook().getId())
                .bookTitle(r.getBook().getTitle())
                .bookAuthor(r.getBook().getAuthor())
                .bookIsbn(r.getBook().getIsbn())
                .bookCategory(r.getBook().getCategory())
                .bookCoverImageUrl(r.getBook().getCoverImageUrl())
                .issuedBookId(r.getIssuedBook() != null ? r.getIssuedBook().getId() : null)
                .borrowDate(r.getBorrowDate())
                .dueDate(r.getDueDate())
                .returnDate(r.getReturnDate())
                .daysBorrowed(r.getDaysBorrowed())
                .status(r.getStatus())
                .fineAmount(r.getFineAmount())
                .fineStatus(r.getFineStatus())
                .membershipPlanName(r.getMembershipPlanName())
                .rating(r.getRating())
                .review(r.getReview())
                .reviewSubmittedAt(r.getReviewSubmittedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
