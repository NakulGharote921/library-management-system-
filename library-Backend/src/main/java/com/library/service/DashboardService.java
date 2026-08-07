package com.library.service;

import com.library.dto.DashboardStatsDto;
import com.library.dto.HomeStatsDto;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.Reservation;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BookRepository;
import com.library.repository.CategoryRepository;
import com.library.repository.FineRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.ReservationRepository;
import com.library.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final ReservationRepository reservationRepository;
    private final FineRepository fineRepository;
    private final CategoryRepository categoryRepository;

    @Value("${app.home.satisfaction:98}")
    private int satisfactionPercent;

    @Transactional(readOnly = true)
    public HomeStatsDto getHomeStats() {
        long books = bookRepository.count();
        long members = userRepository.countByRole(User.Role.MEMBER);
        long borrowedBooks = issuedBookRepository.countByStatus(IssuedBook.STATUS_ISSUED);
        long reservations = reservationRepository.countByStatus(Reservation.STATUS_PENDING);
        long categories = categoryRepository.count();
        return HomeStatsDto.builder()
                .books(books)
                .members(members)
                .borrowedBooks(borrowedBooks)
                .reservations(reservations)
                .satisfaction(satisfactionPercent)
                .categories(categories)
                .build();
    }

    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats() {
        long totalBooks = bookRepository.count();
        long totalStudents = userRepository.count();
        long activeIssues = issuedBookRepository.findByStatusOrderByIssueDateDesc(IssuedBook.STATUS_ISSUED).size();
        long availableBooks = bookRepository.findAll().stream()
                .mapToLong(b -> b.getAvailableCopies() == null ? 0L : b.getAvailableCopies())
                .sum();

        List<DashboardStatsDto.RecentIssueDto> recent = issuedBookRepository.findTop5ByOrderByIssueDateDesc().stream()
                .map(ib -> {
                    try {
                        String bookTitle = ib.getBook() != null ? ib.getBook().getTitle() : "Unknown";
                        String userName = ib.getUser() != null ? ib.getUser().getName() : "Unknown";
                        return DashboardStatsDto.RecentIssueDto.builder()
                                .id(ib.getId())
                                .bookTitle(bookTitle)
                                .userName(userName)
                                .issueDate(ib.getIssueDate())
                                .dueDate(ib.getDueDate())
                                .returnDate(ib.getReturnDate())
                                .status(ib.getStatus())
                                .build();
                    } catch (Exception e) {
                        log.warn("Skipping malformed IssuedBook id={}: {}", ib.getId(), e.getMessage());
                        return null;
                    }
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());

        return DashboardStatsDto.builder()
                .totalBooks(totalBooks)
                .totalStudents(totalStudents)
                .activeIssues(activeIssues)
                .availableBooks(availableBooks)
                .recentIssues(recent)
                .build();
    }

    @Transactional(readOnly = true)
    public DashboardStatsDto getMemberDashboardStats(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));

        long activeIssues = issuedBookRepository.countByUser_IdAndStatus(user.getId(), IssuedBook.STATUS_ISSUED);

        List<IssuedBook> activeLoans = issuedBookRepository.findByUser_IdAndStatus(user.getId(), IssuedBook.STATUS_ISSUED);
        long dueSoon = activeLoans.stream()
                .filter(ib -> ib.getDueDate() != null
                        && !ib.getDueDate().isBefore(LocalDate.now())
                        && ib.getDueDate().isBefore(LocalDate.now().plusDays(3)))
                .count();

        long reservations = reservationRepository.countByUserAndStatus(user, Reservation.STATUS_PENDING);

        long outstandingFines = fineRepository.countByUserAndStatus(user, Fine.STATUS_UNPAID);

        List<DashboardStatsDto.RecentIssueDto> recent = issuedBookRepository.findTop5ByOrderByIssueDateDesc().stream()
                .map(ib -> {
                    try {
                        String bookTitle = ib.getBook() != null ? ib.getBook().getTitle() : "Unknown";
                        String userName = ib.getUser() != null ? ib.getUser().getName() : "Unknown";
                        return DashboardStatsDto.RecentIssueDto.builder()
                                .id(ib.getId())
                                .bookTitle(bookTitle)
                                .userName(userName)
                                .issueDate(ib.getIssueDate())
                                .dueDate(ib.getDueDate())
                                .returnDate(ib.getReturnDate())
                                .status(ib.getStatus())
                                .build();
                    } catch (Exception e) {
                        log.warn("Skipping malformed IssuedBook id={}: {}", ib.getId(), e.getMessage());
                        return null;
                    }
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());

        return DashboardStatsDto.builder()
                .activeIssues(activeIssues)
                .dueSoon(dueSoon)
                .reservations(reservations)
                .outstandingFines(outstandingFines)
                .recentIssues(recent)
                .build();
    }
}
