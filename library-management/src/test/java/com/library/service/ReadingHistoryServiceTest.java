package com.library.service;

import com.library.entity.Book;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.ReadingHistory;
import com.library.entity.User;
import com.library.repository.BookRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.ReadingHistoryRepository;
import com.library.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReadingHistoryServiceTest {

    @Mock
    private ReadingHistoryRepository readingHistoryRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private IssuedBookRepository issuedBookRepository;

    @InjectMocks
    private ReadingHistoryService readingHistoryService;

    private User member() {
        return User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(true).build();
    }

    @Test
    void markFinePaid_updatesHistoryStatusToPaid() {
        User user = member();
        Book book = Book.builder().id(1L).title("Test Book").availableCopies(0).build();
        IssuedBook issued = IssuedBook.builder().id(7L).book(book).user(user)
                .issueDate(LocalDate.now().minusDays(10))
                .dueDate(LocalDate.now().minusDays(3))
                .returnDate(LocalDate.now())
                .status(IssuedBook.STATUS_RETURNED)
                .build();
        ReadingHistory history = ReadingHistory.builder()
                .user(user).book(book).issuedBook(issued)
                .status(ReadingHistory.STATUS_OVERDUE)
                .fineAmount(java.math.BigDecimal.valueOf(15))
                .fineStatus(Fine.STATUS_UNPAID)
                .build();
        when(readingHistoryRepository.findByUserAndIssuedBook(user, issued))
                .thenReturn(Optional.of(history));
        when(readingHistoryRepository.save(any(ReadingHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        readingHistoryService.markFinePaid(issued);

        assertEquals(Fine.STATUS_PAID, history.getFineStatus());
        verify(readingHistoryRepository).save(history);
    }

    @Test
    void markFinePaid_doesNothingWhenAlreadyPaid() {
        User user = member();
        IssuedBook issued = IssuedBook.builder().id(7L).book(book()).user(user).build();
        ReadingHistory history = ReadingHistory.builder()
                .user(user).issuedBook(issued)
                .status(ReadingHistory.STATUS_OVERDUE)
                .fineStatus(Fine.STATUS_PAID)
                .build();
        when(readingHistoryRepository.findByUserAndIssuedBook(user, issued))
                .thenReturn(Optional.of(history));

        readingHistoryService.markFinePaid(issued);

        verify(readingHistoryRepository, never()).save(any(ReadingHistory.class));
    }

    private Book book() {
        return Book.builder().id(1L).title("Test Book").availableCopies(0).build();
    }
}
