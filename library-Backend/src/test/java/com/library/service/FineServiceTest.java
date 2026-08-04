package com.library.service;

import com.library.entity.Book;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.User;
import com.library.repository.FineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FineServiceTest {

    @Mock
    private FineRepository fineRepository;
    @Mock
    private ReadingHistoryService readingHistoryService;

    @InjectMocks
    private FineService fineService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(fineService, "fineRatePerDay", 5);
    }

    private User member() {
        return User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(true).build();
    }

    private Book book() {
        return Book.builder().id(1L).title("Test Book").availableCopies(0).build();
    }

    @Test
    void generateOverdueFine_returnsNullWhenReturnedOnTime() {
        IssuedBook issued = IssuedBook.builder()
                .book(book()).user(member())
                .issueDate(LocalDate.now().minusDays(5))
                .dueDate(LocalDate.now())
                .returnDate(LocalDate.now())
                .status(IssuedBook.STATUS_RETURNED)
                .build();

        Fine fine = fineService.generateOverdueFine(issued);

        assertNull(fine);
        verify(fineRepository, never()).save(any(Fine.class));
    }

    @Test
    void generateOverdueFine_calculatesRateTimesDays() {
        IssuedBook issued = IssuedBook.builder()
                .book(book()).user(member())
                .issueDate(LocalDate.now().minusDays(10))
                .dueDate(LocalDate.now().minusDays(3))
                .returnDate(LocalDate.now())
                .status(IssuedBook.STATUS_RETURNED)
                .build();
        when(fineRepository.save(any(Fine.class))).thenAnswer(inv -> inv.getArgument(0));

        Fine fine = fineService.generateOverdueFine(issued);

        assertNotNull(fine);
        assertEquals(BigDecimal.valueOf(15), fine.getAmount());
        assertEquals(Fine.REASON_OVERDUE, fine.getReason());
        assertEquals(Fine.STATUS_UNPAID, fine.getStatus());
        assertEquals(issued, fine.getIssuedBook());
    }

    @Test
    void markFineAsPaid_setsStatusAndPropagatesToReadingHistory() {
        User user = member();
        IssuedBook issued = IssuedBook.builder().id(7L).book(book()).user(user).build();
        Fine fine = Fine.builder().id(1L).user(user).issuedBook(issued)
                .amount(BigDecimal.valueOf(15)).status(Fine.STATUS_UNPAID).build();
        when(fineRepository.findById(1L)).thenReturn(Optional.of(fine));

        fineService.markFineAsPaid(1L);

        assertEquals(Fine.STATUS_PAID, fine.getStatus());
        assertNotNull(fine.getPaidDate());
        verify(readingHistoryService).markFinePaid(issued);
    }

    @Test
    void markFineAsPaid_skipsHistoryWhenNoLinkedLoan() {
        User user = member();
        Fine fine = Fine.builder().id(2L).user(user)
                .amount(BigDecimal.valueOf(10)).status(Fine.STATUS_UNPAID).issuedBook(null).build();
        when(fineRepository.findById(2L)).thenReturn(Optional.of(fine));

        fineService.markFineAsPaid(2L);

        assertEquals(Fine.STATUS_PAID, fine.getStatus());
        verify(readingHistoryService, never()).markFinePaid(any(IssuedBook.class));
    }
}
