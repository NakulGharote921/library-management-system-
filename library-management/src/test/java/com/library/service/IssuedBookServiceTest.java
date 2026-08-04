package com.library.service;

import com.library.entity.Book;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.Notification;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.repository.BookRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IssuedBookServiceTest {

    @Mock
    private IssuedBookRepository issuedBookRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private FineService fineService;
    @Mock
    private ReservationService reservationService;
    @Mock
    private ReadingHistoryService readingHistoryService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private MailService mailService;

    @InjectMocks
    private IssuedBookService issuedBookService;

    private User member() {
        return User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(true).build();
    }

    private Book book() {
        return Book.builder().id(1L).title("Test Book").availableCopies(0).build();
    }

    private IssuedBook issuedLoan(User user, Book book) {
        return IssuedBook.builder()
                .id(7L).book(book).user(user)
                .issueDate(LocalDate.now().minusDays(5))
                .dueDate(LocalDate.now().plusDays(9))
                .status(IssuedBook.STATUS_ISSUED)
                .build();
    }

    @Test
    void requestReturn_setsRequestedAtAndNotifies() {
        User user = member();
        Book book = book();
        IssuedBook issued = issuedLoan(user, book);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(issuedBookRepository.findDetailedById(7L)).thenReturn(Optional.of(issued));
        when(issuedBookRepository.save(any(IssuedBook.class))).thenAnswer(inv -> inv.getArgument(0));
        when(issuedBookRepository.findDetailedById(7L)).thenReturn(Optional.of(issued));

        issuedBookService.requestReturn(7L, "alice@example.com");

        assertNotNull(issued.getReturnRequestedAt());
        assertEquals(IssuedBook.STATUS_ISSUED, issued.getStatus());
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_RETURN_REQUESTED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), anyString(), anyString());
    }

    @Test
    void requestReturn_throwsForAnotherMembersBook() {
        User user = member();
        User other = User.builder().id(99L).name("Bob").email("bob@example.com")
                .role(User.Role.MEMBER).active(true).build();
        IssuedBook issued = issuedLoan(other, book());
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(issuedBookRepository.findDetailedById(7L)).thenReturn(Optional.of(issued));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> issuedBookService.requestReturn(7L, "alice@example.com"));
        assertTrue(ex.getMessage().contains("only request a return"));
    }

    @Test
    void requestReturn_throwsWhenAlreadyRequested() {
        User user = member();
        IssuedBook issued = issuedLoan(user, book());
        issued.setReturnRequestedAt(LocalDate.now());
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(issuedBookRepository.findDetailedById(7L)).thenReturn(Optional.of(issued));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> issuedBookService.requestReturn(7L, "alice@example.com"));
        assertTrue(ex.getMessage().contains("already requested"));
    }

    @Test
    void returnBook_incrementsCopiesAndFulfillsNextInQueue() {
        User user = member();
        Book book = book();
        book.setAvailableCopies(0);
        IssuedBook issued = issuedLoan(user, book);
        when(issuedBookRepository.findDetailedById(7L)).thenReturn(Optional.of(issued));
        when(issuedBookRepository.save(any(IssuedBook.class))).thenAnswer(inv -> inv.getArgument(0));

        issuedBookService.returnBook(7L);

        assertEquals(IssuedBook.STATUS_RETURNED, issued.getStatus());
        assertEquals(1, book.getAvailableCopies());
        assertNotNull(issued.getReturnDate());
        assertNull(issued.getReturnRequestedAt());
        verify(fineService, never()).generateOverdueFine(any());
        verify(reservationService).fulfillNextInQueue(book);
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_RETURN_APPROVED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), anyString(), anyString());
    }

    @Test
    void returnBook_generatesOverdueFineWhenLate() {
        User user = member();
        Book book = book();
        IssuedBook issued = issuedLoan(user, book);
        issued.setDueDate(LocalDate.now().minusDays(3));
        Fine fine = Fine.builder().id(1L).amount(java.math.BigDecimal.valueOf(15)).build();
        when(issuedBookRepository.findDetailedById(7L)).thenReturn(Optional.of(issued));
        when(issuedBookRepository.save(any(IssuedBook.class))).thenAnswer(inv -> inv.getArgument(0));
        when(fineService.generateOverdueFine(issued)).thenReturn(fine);

        issuedBookService.returnBook(7L);

        verify(fineService).generateOverdueFine(issued);
        verify(readingHistoryService).recordReturnWithFine(issued, fine);
        verify(reservationService).fulfillNextInQueue(book);
    }
}
