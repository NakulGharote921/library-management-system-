package com.library.service;

import com.library.dto.AdminDashboardDto;
import com.library.dto.AnalyticsDto;
import com.library.entity.Book;
import com.library.entity.IssuedBook;
import com.library.entity.PaymentTransaction;
import com.library.entity.Reservation;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.repository.BookRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.PaymentTransactionRepository;
import com.library.repository.ReservationRepository;
import com.library.repository.UserRepository;
import com.library.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final ReservationRepository reservationRepository;

    @Transactional(readOnly = true)
    public AnalyticsDto getAnalytics() {
        long totalBooks = bookRepository.count();
        long totalMembers = userRepository.count();

        List<IssuedBook> activeIssues = issuedBookRepository.findByStatus(IssuedBook.STATUS_ISSUED);
        long activeLoans = activeIssues.size();

        LocalDate now = LocalDate.now();
        long overdueLoans = activeIssues.stream()
                .filter(ib -> ib.getDueDate() != null && ib.getDueDate().isBefore(now))
                .count();
        double overdueRate = activeLoans > 0 ? (double) overdueLoans / activeLoans * 100 : 0;

        List<UserSubscription> allSubs = userSubscriptionRepository.findAll();
        long activeSubscriptions = allSubs.stream()
                .filter(s -> UserSubscription.STATUS_ACTIVE.equals(s.getStatus()))
                .count();
        long silverSubscriptions = allSubs.stream()
                .filter(s -> UserSubscription.STATUS_ACTIVE.equals(s.getStatus()) && s.getPlan().getName().equals("Silver"))
                .count();
        long goldSubscriptions = allSubs.stream()
                .filter(s -> UserSubscription.STATUS_ACTIVE.equals(s.getStatus()) && s.getPlan().getName().equals("Gold"))
                .count();
        long premiumSubscriptions = allSubs.stream()
                .filter(s -> UserSubscription.STATUS_ACTIVE.equals(s.getStatus()) && s.getPlan().getName().equals("Premium"))
                .count();
        long studentSubscriptions = allSubs.stream()
                .filter(s -> UserSubscription.STATUS_ACTIVE.equals(s.getStatus()) && s.getPlan().getName().equals("Student"))
                .count();

        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        List<PaymentTransaction> payments = paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(
                PaymentTransaction.STATUS_SUCCESS);
        BigDecimal totalRevenue = payments.stream()
                .map(PaymentTransaction::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlyRevenue = payments.stream()
                .filter(p -> p.getCompletedAt() != null && p.getCompletedAt().isAfter(monthStart))
                .map(PaymentTransaction::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<AnalyticsDto.MostBorrowedDto> mostBorrowed = buildMostBorrowed();

        return AnalyticsDto.builder()
                .totalBooks(totalBooks)
                .totalMembers(totalMembers)
                .activeLoans(activeLoans)
                .overdueLoans(overdueLoans)
                .overdueRate(Math.round(overdueRate * 10.0) / 10.0)
                .activeSubscriptions(activeSubscriptions)
                .silverSubscriptions(silverSubscriptions)
                .goldSubscriptions(goldSubscriptions)
                .premiumSubscriptions(premiumSubscriptions)
                .studentSubscriptions(studentSubscriptions)
                .monthlyRevenue(monthlyRevenue)
                .totalRevenue(totalRevenue)
                .mostBorrowed(mostBorrowed)
                .build();
    }

    private List<AnalyticsDto.MostBorrowedDto> buildMostBorrowed() {
        List<IssuedBook> allIssued = issuedBookRepository.findAllByOrderByIssueDateDesc();
        Map<Long, Long> bookCounts = allIssued.stream()
                .filter(ib -> ib.getBook() != null)
                .collect(Collectors.groupingBy(ib -> ib.getBook().getId(), Collectors.counting()));
        return bookCounts.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    var book = bookRepository.findById(entry.getKey()).orElse(null);
                    if (book == null) return null;
                    return AnalyticsDto.MostBorrowedDto.builder()
                            .title(book.getTitle())
                            .author(book.getAuthor())
                            .borrowed(entry.getValue())
                            .available(book.getAvailableCopies() == null ? 0 : book.getAvailableCopies())
                            .build();
                })
                .filter(dto -> dto != null)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminDashboardDto getAdminDashboard() {
        long totalBooks = bookRepository.count();

        List<User> users = userRepository.findAll();
        long totalMembers = users.stream().filter(u -> u.getRole() == User.Role.MEMBER).count();

        List<Book> books = bookRepository.findAll();
        long totalCopies = books.stream().mapToLong(b -> b.getTotalCopies() != null ? b.getTotalCopies() : 0).sum();
        long availableCopies = books.stream().mapToLong(b -> b.getAvailableCopies() != null ? b.getAvailableCopies() : 0).sum();
        long borrowedCopies = totalCopies - availableCopies;

        List<IssuedBook> activeIssues = issuedBookRepository.findByStatus(IssuedBook.STATUS_ISSUED);
        long activeLoans = activeIssues.size();

        LocalDate now = LocalDate.now();
        long overdueBooks = activeIssues.stream()
                .filter(ib -> ib.getDueDate() != null && ib.getDueDate().isBefore(now))
                .count();
        BigDecimal overdueRate = activeLoans > 0
                ? BigDecimal.valueOf(Math.round((double) overdueBooks / activeLoans * 100 * 10.0) / 10.0)
                : BigDecimal.ZERO;

        long activeReservations = reservationRepository.countByStatus(Reservation.STATUS_READY);
        long waitingReservations = reservationRepository.countByStatus(Reservation.STATUS_PENDING);

        List<UserSubscription> allSubs = userSubscriptionRepository.findAll();
        long activeSubscriptions = allSubs.stream()
                .filter(s -> UserSubscription.STATUS_ACTIVE.equals(s.getStatus()))
                .count();

        LocalDateTime monthStart = now.withDayOfMonth(1).atStartOfDay();
        List<PaymentTransaction> successfulPayments = paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(
                PaymentTransaction.STATUS_SUCCESS);
        BigDecimal totalRevenue = successfulPayments.stream()
                .map(PaymentTransaction::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlyRevenue = successfulPayments.stream()
                .filter(p -> p.getCompletedAt() != null && p.getCompletedAt().isAfter(monthStart))
                .map(PaymentTransaction::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<AnalyticsDto.MostBorrowedDto> mostBorrowed = buildMostBorrowed();

        return AdminDashboardDto.builder()
                .totalBooks(totalBooks)
                .totalMembers(totalMembers)
                .totalCopies(totalCopies)
                .availableCopies(availableCopies)
                .borrowedCopies(borrowedCopies)
                .activeLoans(activeLoans)
                .overdueBooks(overdueBooks)
                .activeReservations(activeReservations)
                .waitingReservations(waitingReservations)
                .activeSubscriptions(activeSubscriptions)
                .overdueRate(overdueRate)
                .monthlyRevenue(monthlyRevenue)
                .totalRevenue(totalRevenue)
                .mostBorrowed(mostBorrowed)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDto.MonthlyRevenuePoint> getMonthlyRevenueSeries(int months) {
        Map<YearMonth, BigDecimal> byMonth = paymentTransactionRepository
                .findByStatusOrderByCreatedAtDesc(PaymentTransaction.STATUS_SUCCESS)
                .stream()
                .filter(p -> p.getCompletedAt() != null && p.getAmount() != null)
                .collect(Collectors.groupingBy(
                        p -> YearMonth.from(p.getCompletedAt()),
                        Collectors.mapping(PaymentTransaction::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

        YearMonth currentMonth = YearMonth.from(LocalDate.now());
        List<AnalyticsDto.MonthlyRevenuePoint> points = new ArrayList<>(months);
        for (int i = months - 1; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            points.add(AnalyticsDto.MonthlyRevenuePoint.builder()
                    .month(month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                    .revenue(byMonth.getOrDefault(month, BigDecimal.ZERO))
                    .build());
        }
        return points;
    }
}
