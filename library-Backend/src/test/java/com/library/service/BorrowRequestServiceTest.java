package com.library.service;

import com.library.dto.BorrowRequestDTO;
import com.library.entity.Book;
import com.library.entity.BorrowRequest;
import com.library.entity.IssuedBook;
import com.library.entity.Notification;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.repository.BookRepository;
import com.library.repository.BorrowRequestRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BorrowRequestServiceTest {

    @Mock
    private BorrowRequestRepository borrowRequestRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private IssuedBookRepository issuedBookRepository;
    @Mock
    private BookService bookService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private MailService mailService;
    @Mock
    private SubscriptionService subscriptionService;
    @Mock
    private FineService fineService;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private BorrowRequestService borrowRequestService;

    private void stubAudit() {
        when(auditLogService.log(any(), any(), any(), anyString(), anyString(), any(), anyString()))
                .thenReturn(null);
    }

    private User member() {
        return User.builder().id(10L).name("Alice").email("alice@example.com")
                .role(User.Role.MEMBER).active(true).build();
    }

    private User staff() {
        return User.builder().id(1L).name("Admin").email("admin@example.com")
                .role(User.Role.ADMIN).active(true).build();
    }

    private Book book() {
        return Book.builder().id(1L).title("Test Book").author("Author").build();
    }

    private UserSubscription subscription() {
        return UserSubscription.builder()
                .plan(SubscriptionPlan.builder().id(1L).name("Gold").maxBooks(5).maxLoanDays(14).build())
                .status(UserSubscription.STATUS_ACTIVE)
                .build();
    }

    private BorrowRequest pendingRequest(User user, Book book) {
        return BorrowRequest.builder()
                .id(5L).user(user).book(book)
                .status(BorrowRequest.STATUS_PENDING)
                .requestDate(LocalDateTime.now().minusHours(2))
                .build();
    }

    @Test
    void requestBorrow_createsPendingRequestWithDatesAndNotifies() {
        User user = member();
        User staffUser = staff();
        Book book = book();
        UserSubscription sub = subscription();
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(bookService.validateBorrowPrivileges(user, book)).thenReturn(sub);
        when(userRepository.findByRole(User.Role.ADMIN)).thenReturn(List.of(staffUser));
        when(borrowRequestRepository.existsByBookAndUserAndStatus(book, user, BorrowRequest.STATUS_PENDING))
                .thenReturn(false);
        when(borrowRequestRepository.save(any(BorrowRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        stubAudit();

        LocalDate start = LocalDate.now().plusDays(1);
        BorrowRequestDTO dto = borrowRequestService.requestBorrow("alice@example.com", 1L, start, null);

        assertNotNull(dto);
        assertEquals(BorrowRequest.STATUS_PENDING, dto.getStatus());
        assertEquals("Test Book", dto.getBookTitle());
        assertEquals(start, dto.getBorrowStartDate());
        assertEquals(start.plusDays(14), dto.getDueDate());
        assertEquals("Gold", dto.getMembershipPlanName());
        verify(bookService).validateBorrowPrivileges(user, book);
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_BORROW_REQUESTED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), anyString(), anyString());
        verify(notificationService).notify(eq(staffUser), eq(Notification.TYPE_BORROW_REQUESTED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("admin@example.com"), anyString(), anyString());
    }

    @Test
    void requestBorrow_throwsWhenStartDateInPast() {
        User user = member();
        Book book = book();
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(bookService.validateBorrowPrivileges(user, book)).thenReturn(subscription());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowRequestService.requestBorrow("alice@example.com", 1L, LocalDate.now().minusDays(1), null));

        assertTrue(ex.getMessage().contains("cannot be in the past"));
        verify(borrowRequestRepository, never()).save(any(BorrowRequest.class));
    }

    @Test
    void requestBorrow_defaultsStartDateToToday() {
        User user = member();
        Book book = book();
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(bookService.validateBorrowPrivileges(user, book)).thenReturn(subscription());
        when(userRepository.findByRole(User.Role.ADMIN)).thenReturn(List.of());
        when(borrowRequestRepository.existsByBookAndUserAndStatus(book, user, BorrowRequest.STATUS_PENDING))
                .thenReturn(false);
        when(borrowRequestRepository.save(any(BorrowRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        stubAudit();

        BorrowRequestDTO dto = borrowRequestService.requestBorrow("alice@example.com", 1L, null, null);

        assertEquals(LocalDate.now(), dto.getBorrowStartDate());
        assertEquals(LocalDate.now().plusDays(14), dto.getDueDate());
    }

    @Test
    void requestBorrow_throwsWhenDuplicatePendingExists() {
        User user = member();
        Book book = book();
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(bookService.validateBorrowPrivileges(user, book)).thenReturn(subscription());
        when(borrowRequestRepository.existsByBookAndUserAndStatus(book, user, BorrowRequest.STATUS_PENDING))
                .thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowRequestService.requestBorrow("alice@example.com", 1L, null, null));

        assertTrue(ex.getMessage().contains("already have a pending"));
        verify(borrowRequestRepository, never()).save(any(BorrowRequest.class));
    }

    @Test
    void requestBorrow_throwsWhenBookMissing() {
        when(bookRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(com.library.exception.ResourceNotFoundException.class,
                () -> borrowRequestService.requestBorrow("alice@example.com", 1L, LocalDate.now(), null));
    }

    @Test
    void approve_marksApprovedAndIssuesBookOnRequestedStartDate() {
        User user = member();
        Book book = book();
        BorrowRequest request = pendingRequest(user, book);
        LocalDate start = LocalDate.now().plusDays(2);
        request.setBorrowStartDate(start);
        request.setDueDate(start.plusDays(14));
        request.setMembershipPlanName("Gold");
        IssuedBook issued = IssuedBook.builder()
                .id(7L).user(user).book(book)
                .issueDate(start)
                .dueDate(start.plusDays(14))
                .status(IssuedBook.STATUS_ISSUED)
                .build();
        when(borrowRequestRepository.findById(5L)).thenReturn(Optional.of(request));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(staff()));
        when(bookService.borrowBook(eq("alice@example.com"), eq(1L), eq(start), any(LocalDate.class))).thenReturn(issued);
        when(borrowRequestRepository.save(any(BorrowRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        stubAudit();

        BorrowRequestDTO dto = borrowRequestService.approve(5L, "admin@example.com");

        assertEquals(BorrowRequest.STATUS_APPROVED, dto.getStatus());
        assertEquals(start, dto.getBorrowStartDate());
        assertEquals(start.plusDays(14), dto.getDueDate());
        assertEquals(7L, dto.getIssuedBookId());
        assertNotNull(dto.getDecidedAt());
        assertTrue(dto.getDecisionNotes().contains("admin@example.com"));
        verify(bookService).borrowBook(eq("alice@example.com"), eq(1L), eq(start), any(LocalDate.class));
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_BORROW_APPROVED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), anyString(), anyString());
    }

    @Test
    void approve_rollsBackWhenBorrowFails() {
        User user = member();
        Book book = book();
        BorrowRequest request = pendingRequest(user, book);
        when(borrowRequestRepository.findById(5L)).thenReturn(Optional.of(request));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(staff()));
        when(bookService.borrowBook(eq("alice@example.com"), eq(1L), any(LocalDate.class), any()))
                .thenThrow(new BusinessException("Limit reached"));

        assertThrows(BusinessException.class, () -> borrowRequestService.approve(5L, "admin@example.com"));

        assertEquals(BorrowRequest.STATUS_PENDING, request.getStatus());
        verify(borrowRequestRepository, never()).save(any(BorrowRequest.class));
    }

    @Test
    void approve_throwsWhenAlreadyDecided() {
        BorrowRequest request = pendingRequest(member(), book());
        request.setStatus(BorrowRequest.STATUS_REJECTED);
        when(borrowRequestRepository.findById(5L)).thenReturn(Optional.of(request));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> borrowRequestService.approve(5L, "admin@example.com"));

        assertTrue(ex.getMessage().contains("already been decided"));
        verify(bookService, never()).borrowBook(anyString(), any(), any(LocalDate.class));
    }

    @Test
    void reject_marksRejectedAndNotifies() {
        User user = member();
        Book book = book();
        BorrowRequest request = pendingRequest(user, book);
        when(borrowRequestRepository.findById(5L)).thenReturn(Optional.of(request));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(staff()));
        when(borrowRequestRepository.save(any(BorrowRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        stubAudit();

        BorrowRequestDTO dto = borrowRequestService.reject(5L, "admin@example.com", "Book limit met");

        assertEquals(BorrowRequest.STATUS_REJECTED, dto.getStatus());
        assertTrue(dto.getDecisionNotes().contains("Book limit met"));
        verify(bookService, never()).borrowBook(anyString(), any(), any(LocalDate.class));
        verify(notificationService).notify(eq(user), eq(Notification.TYPE_BORROW_REJECTED),
                anyString(), anyString(), anyString());
        verify(mailService).send(eq("alice@example.com"), anyString(), anyString());
    }

    @Test
    void getMyRequests_mapsToDtos() {
        User user = member();
        Book book = book();
        BorrowRequest request = pendingRequest(user, book);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(borrowRequestRepository.findByUserOrderByRequestDateDesc(user)).thenReturn(List.of(request));

        List<BorrowRequestDTO> dtos = borrowRequestService.getMyRequests("alice@example.com");

        assertEquals(1, dtos.size());
        assertEquals(request.getId(), dtos.get(0).getId());
        assertEquals("alice@example.com", dtos.get(0).getUserEmail());
        assertEquals("Test Book", dtos.get(0).getBookTitle());
    }

    @Test
    void countPending_delegatesToRepository() {
        when(borrowRequestRepository.countByStatus(BorrowRequest.STATUS_PENDING)).thenReturn(3L);

        assertEquals(3L, borrowRequestService.countPending());
    }
}