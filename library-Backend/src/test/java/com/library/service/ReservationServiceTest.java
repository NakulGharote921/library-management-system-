package com.library.service;

import com.library.dto.ReservationDTO;
import com.library.entity.Book;
import com.library.entity.IssuedBook;
import com.library.entity.Notification;
import com.library.entity.Reservation;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.repository.BookRepository;
import com.library.repository.FineRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.ReservationRepository;
import com.library.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private IssuedBookRepository issuedBookRepository;
    @Mock
    private FineRepository fineRepository;
    @Mock
    private SubscriptionService subscriptionService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private MailService mailService;

    @InjectMocks
    private ReservationService reservationService;

    private Book unavailableBook() {
        return Book.builder().id(1L).title("Test Book").availableCopies(0).build();
    }

    private User activeMember() {
        return User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(true).build();
    }

    @Test
    void reserveBook_throwsWhenUserInactive() {
        Book book = unavailableBook();
        User user = User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(false).build();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reservationService.reserveBook("alice@example.com", 1L));
        assertTrue(ex.getMessage().toLowerCase().contains("suspended"));
    }

    @Test
    void reserveBook_throwsWhenBookAvailable() {
        Book book = Book.builder().id(1L).title("Test Book").availableCopies(2).build();
        User user = activeMember();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reservationService.reserveBook("alice@example.com", 1L));
        assertTrue(ex.getMessage().contains("No reservation needed"));
    }

    @Test
    void reserveBook_throwsWhenAlreadyReserved() {
        Book book = unavailableBook();
        User user = activeMember();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(reservationRepository.findByBookAndUserAndStatusIn(eq(book), eq(user), anyList()))
                .thenReturn(List.of(Reservation.builder().status(Reservation.STATUS_PENDING).build()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reservationService.reserveBook("alice@example.com", 1L));
        assertTrue(ex.getMessage().contains("already have an active reservation"));
    }

    @Test
    void reserveBook_throwsWhenAlreadyBorrowed() {
        Book book = unavailableBook();
        User user = activeMember();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(reservationRepository.findByBookAndUserAndStatusIn(eq(book), eq(user), anyList()))
                .thenReturn(List.of());
        when(issuedBookRepository.findByUserAndBookAndStatus(eq(user), eq(book), eq(IssuedBook.STATUS_ISSUED)))
                .thenReturn(Optional.of(IssuedBook.builder().id(5L).build()));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reservationService.reserveBook("alice@example.com", 1L));
        assertTrue(ex.getMessage().contains("already have this book borrowed"));
    }

    @Test
    void reserveBook_throwsWhenUnpaidFines() {
        Book book = unavailableBook();
        User user = activeMember();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(reservationRepository.findByBookAndUserAndStatusIn(eq(book), eq(user), anyList()))
                .thenReturn(List.of());
        when(issuedBookRepository.findByUserAndBookAndStatus(eq(user), eq(book), eq(IssuedBook.STATUS_ISSUED)))
                .thenReturn(Optional.empty());
        when(fineRepository.countByUser_IdAndStatus(10L, "UNPAID")).thenReturn(2L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reservationService.reserveBook("alice@example.com", 1L));
        assertTrue(ex.getMessage().contains("unpaid fine"));
    }

    @Test
    void reserveBook_throwsWhenReservationLimitReached() {
        User user = activeMember();
        Book book = unavailableBook();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(reservationRepository.findByBookAndUserAndStatusIn(eq(book), eq(user), anyList()))
                .thenReturn(List.of());
        when(issuedBookRepository.findByUserAndBookAndStatus(eq(user), eq(book), eq(IssuedBook.STATUS_ISSUED)))
                .thenReturn(Optional.empty());
        when(fineRepository.countByUser_IdAndStatus(10L, "UNPAID")).thenReturn(0L);
        when(reservationRepository.countByUserAndStatusIn(eq(user), anyList())).thenReturn(5L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> reservationService.reserveBook("alice@example.com", 1L));
        assertTrue(ex.getMessage().contains("Reservation limit reached"));
    }

    @Test
    void reserveBook_createsWaitingReservationWithFifoPosition() {
        User user = activeMember();
        Book book = unavailableBook();
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(reservationRepository.findByBookAndUserAndStatusIn(eq(book), eq(user), anyList()))
                .thenReturn(List.of());
        when(issuedBookRepository.findByUserAndBookAndStatus(eq(user), eq(book), eq(IssuedBook.STATUS_ISSUED)))
                .thenReturn(Optional.empty());
        when(fineRepository.countByUser_IdAndStatus(10L, "UNPAID")).thenReturn(0L);
        when(reservationRepository.countByUserAndStatusIn(eq(user), anyList())).thenReturn(1L);
        when(reservationRepository.countByBookAndStatus(eq(book), eq(Reservation.STATUS_PENDING))).thenReturn(2);
        when(reservationRepository.countByBookAndStatus(eq(book), eq(Reservation.STATUS_READY))).thenReturn(1);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ReservationDTO dto = reservationService.reserveBook("alice@example.com", 1L);

        assertEquals(4, dto.getQueuePosition());
        assertEquals(Reservation.STATUS_PENDING, dto.getStatus());
        assertNotNull(dto.getReservationNumber());
        assertTrue(dto.getReservationNumber().startsWith("RES-"));

        ArgumentCaptor<Reservation> captor = ArgumentCaptor.forClass(Reservation.class);
        verify(reservationRepository, atLeast(1)).save(captor.capture());
        assertFalse(captor.getAllValues().isEmpty());
        assertEquals(Reservation.STATUS_PENDING, captor.getAllValues().get(0).getStatus());
        verify(notificationService).notify(eq(user), eq("RESERVATION_CREATED"), anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), anyString(), anyString());
    }

    @Test
    void fulfillNextInQueue_marksReadyWith48HourHold() {
        Book book = unavailableBook();
        User user = activeMember();
        Reservation reservation = Reservation.builder()
                .id(2L).book(book).user(user).queuePosition(1)
                .status(Reservation.STATUS_PENDING).notificationSent(false).build();
        when(reservationRepository.findTopByBookAndStatusOrderByQueuePosition(book, Reservation.STATUS_PENDING))
                .thenReturn(Optional.of(reservation));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        reservationService.fulfillNextInQueue(book);

        assertEquals(Reservation.STATUS_READY, reservation.getStatus());
        assertNotNull(reservation.getPickupExpiryDate());
        assertTrue(reservation.getPickupExpiryDate().isAfter(LocalDateTime.now().plusHours(47)));
        assertTrue(reservation.getPickupExpiryDate().isBefore(LocalDateTime.now().plusHours(49)));
        assertTrue(reservation.getNotificationSent());
        verify(notificationService).notify(eq(user), eq("RESERVATION_READY"), anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), eq("Book Ready for Pickup"), anyString());
    }

    @Test
    void markAsPickedUp_createsLoanAndCompletes() {
        User user = activeMember();
        Book book = unavailableBook();
        book.setAvailableCopies(1);
        Reservation reservation = Reservation.builder()
                .id(3L).book(book).user(user).queuePosition(1)
                .status(Reservation.STATUS_READY).notificationSent(true).build();
        SubscriptionPlan plan = SubscriptionPlan.builder().id(1L).name("Gold").maxLoanDays(14).build();
        UserSubscription sub = UserSubscription.builder().plan(plan).build();

        when(reservationRepository.findById(3L)).thenReturn(Optional.of(reservation));
        when(issuedBookRepository.findByUserAndBookAndStatus(eq(user), eq(book), eq(IssuedBook.STATUS_ISSUED)))
                .thenReturn(Optional.empty());
        when(subscriptionService.getActiveSubscription(user)).thenReturn(Optional.of(sub));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        reservationService.markAsPickedUp(3L);

        ArgumentCaptor<IssuedBook> loanCaptor = ArgumentCaptor.forClass(IssuedBook.class);
        verify(issuedBookRepository).save(loanCaptor.capture());
        assertEquals(IssuedBook.STATUS_ISSUED, loanCaptor.getValue().getStatus());
        assertEquals(0, book.getAvailableCopies());
        assertEquals(Reservation.STATUS_FULFILLED, reservation.getStatus());
        assertNotNull(reservation.getCompletedAt());
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_RESERVATION_COMPLETED),
                anyString(), anyString(), anyString());
    }

    @Test
    void expireOverduePickups_expiresAndFulfillsNext() {
        Book book = Book.builder().id(1L).title("Test Book").availableCopies(1).build();
        User user = activeMember();
        Reservation expired = Reservation.builder()
                .id(4L).book(book).user(user).queuePosition(1)
                .status(Reservation.STATUS_READY).notificationSent(true).build();
        Reservation next = Reservation.builder()
                .id(5L).book(book).user(user).queuePosition(2)
                .status(Reservation.STATUS_PENDING).notificationSent(false).build();
        when(reservationRepository.findExpiredPickups(eq(Reservation.STATUS_READY), any(LocalDateTime.class)))
                .thenReturn(List.of(expired));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reservationRepository.findTopByBookAndStatusOrderByQueuePosition(book, Reservation.STATUS_PENDING))
                .thenReturn(Optional.of(next));

        reservationService.expireOverduePickups();

        assertEquals(Reservation.STATUS_EXPIRED, expired.getStatus());
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_RESERVATION_EXPIRED),
                anyString(), anyString(), anyString());
        assertEquals(Reservation.STATUS_READY, next.getStatus());
    }

    @Test
    void cancelReservation_cancelsOwnReservation() {
        User user = activeMember();
        Book book = unavailableBook();
        Reservation reservation = Reservation.builder()
                .id(6L).book(book).user(user).queuePosition(1)
                .status(Reservation.STATUS_PENDING).notificationSent(false).build();
        when(reservationRepository.findById(6L)).thenReturn(Optional.of(reservation));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(User.builder()
                .id(20L).role(User.Role.MEMBER).build()));
        when(reservationRepository.findByBookOrderByQueuePosition(book)).thenReturn(List.of(reservation));
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        reservationService.cancelReservation(6L, "alice@example.com");

        assertEquals(Reservation.STATUS_CANCELLED, reservation.getStatus());
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_RESERVATION_CANCELLED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), eq("Reservation Cancelled"), anyString());
    }
}
