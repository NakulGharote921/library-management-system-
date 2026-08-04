package com.library.service;

import com.library.dto.BorrowRequestDecisionInfo;
import com.library.dto.BorrowRequestDTO;
import com.library.entity.Book;
import com.library.entity.BorrowRequest;
import com.library.entity.IssuedBook;
import com.library.entity.Notification;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BookRepository;
import com.library.repository.BorrowRequestRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class BorrowRequestService {

    private final BorrowRequestRepository borrowRequestRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final BookService bookService;
    private final NotificationService notificationService;
    private final MailService mailService;
    private final SubscriptionService subscriptionService;
    private final FineService fineService;
    private final AuditLogService auditLogService;

    @Transactional
    public BorrowRequestDTO requestBorrow(String userEmail, Long bookId, LocalDate borrowStartDate, LocalDate requestedDueDate) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book", bookId));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));

        UserSubscription sub = bookService.validateBorrowPrivileges(user, book);
        SubscriptionPlan plan = sub.getPlan();

        if (borrowRequestRepository.existsByBookAndUserAndStatus(book, user, BorrowRequest.STATUS_PENDING)) {
            throw new BusinessException("You already have a pending borrow request for this book.");
        }

        LocalDate start = (borrowStartDate != null) ? borrowStartDate : LocalDate.now();
        if (start.isBefore(LocalDate.now())) {
            throw new BusinessException("Borrow start date cannot be in the past.");
        }
        LocalDate maxDue = start.plusDays(plan.getMaxLoanDays());
        LocalDate due = (requestedDueDate != null) ? requestedDueDate : maxDue;
        if (due.isBefore(start)) {
            throw new BusinessException("Due date cannot be before the borrow start date.");
        }
        if (due.isAfter(maxDue)) {
            throw new BusinessException("Due date cannot be later than " + maxDue
                    + " (maximum " + plan.getMaxLoanDays() + " days on the " + plan.getName() + " plan).");
        }

        BorrowRequest request = BorrowRequest.builder()
                .book(book)
                .user(user)
                .status(BorrowRequest.STATUS_PENDING)
                .borrowStartDate(start)
                .dueDate(due)
                .membershipPlanName(plan.getName())
                .build();
        BorrowRequest saved = borrowRequestRepository.save(request);

        notificationService.notify(user, Notification.TYPE_BORROW_REQUESTED,
                "Borrow Request Received",
                "Your borrow request for '" + book.getTitle() + "' has been submitted. An administrator will review it shortly.",
                "/borrow-requests");
        mailService.send(user.getEmail(), "Borrow Request Received",
                "Hello " + user.getName() + ",\n\nYour borrow request for '" + book.getTitle() + "' (ISBN: "
                        + (book.getIsbn() != null ? book.getIsbn() : "N/A")
                        + ") has been submitted and is awaiting review by an administrator.\n\n"
                        + "Borrow start date: " + start + "\n"
                        + "Estimated due date (based on your " + plan.getName() + " plan): " + due + "\n\n"
                        + "We will notify you once a decision is made.\n\nRegards,\nLumina Library Team");

        notifyStaff("New Borrow Request",
                "Member " + user.getName() + " requested to borrow '" + book.getTitle()
                        + "' starting " + start,
                "/borrow-requests",
                (staff) -> "A member is awaiting your review of a borrow request:\n\nBook: '" + book.getTitle()
                        + "'\nMember: " + user.getName() + " (" + user.getEmail() + ")\n"
                        + "Borrow start date: " + start + "\n"
                        + "Requested due date: " + due + "\n\n"
                        + "Review and approve or reject this request.\n\nRegards,\nLumina Library Team");

        log.info("User {} requested to borrow book id={} starting {}", userEmail, bookId, start);
        auditLogService.log(userEmail, user.getName(), user.getRole().name(),
                "BORROW_REQUEST_CREATED", "BorrowRequest", saved.getId(),
                "Requested '" + book.getTitle() + "' from " + start + " to " + due
                        + " (" + plan.getName() + " plan)");
        return BorrowRequestDTO.fromEntity(saved);
    }

    @Transactional
    public BorrowRequestDTO approve(Long requestId, String staffEmail) {
        BorrowRequest request = findPending(requestId);
        String email = request.getUser().getEmail();
        Book book = request.getBook();
        User member = request.getUser();
        User staff = resolveStaff(staffEmail);

        LocalDate start = (request.getBorrowStartDate() != null) ? request.getBorrowStartDate() : LocalDate.now();
        LocalDate due = request.getDueDate();

        IssuedBook issued = bookService.borrowBook(email, book.getId(), start, due);

        request.setStatus(BorrowRequest.STATUS_APPROVED);
        request.setDecidedAt(LocalDateTime.now());
        request.setDecisionNotes("Approved by " + staffEmail);
        if (request.getBorrowStartDate() == null) request.setBorrowStartDate(start);
        if (request.getDueDate() == null) request.setDueDate(issued.getDueDate());
        request.setIssuedBookId(issued.getId());
        BorrowRequest saved = borrowRequestRepository.save(request);

        notificationService.notify(member, Notification.TYPE_BORROW_APPROVED,
                "Borrow Request Approved",
                "Your borrow request for '" + book.getTitle() + "' was approved. The book has been issued to you. Due date: "
                        + issued.getDueDate(),
                "/history");
        mailService.send(email, "Borrow Request Approved",
                "Hello " + member.getName() + ",\n\nYour borrow request for '" + book.getTitle()
                        + "' has been approved and the book has been issued to you.\n\n"
                        + "Issue Date: " + issued.getIssueDate() + "\n"
                        + "Due Date: " + issued.getDueDate() + ". Return it on time to avoid fines.\n\n"
                        + "Regards,\nLumina Library Team");

        auditLogService.log(staff.getEmail(), staff.getName(), staff.getRole().name(),
                "BORROW_REQUEST_APPROVED", "BorrowRequest", saved.getId(),
                "Approved '" + book.getTitle() + "' for " + member.getName() + " (" + member.getEmail()
                        + ") — loan #" + issued.getId() + " created, issue " + issued.getIssueDate()
                        + ", due " + issued.getDueDate());

        log.info("Admin {} approved borrow request id={} -> book issued", staffEmail, requestId);
        return BorrowRequestDTO.fromEntity(saved);
    }

    @Transactional
    public BorrowRequestDTO reject(Long requestId, String staffEmail, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("A rejection reason is required.");
        }
        BorrowRequest request = findPending(requestId);
        String email = request.getUser().getEmail();
        Book book = request.getBook();
        User staff = resolveStaff(staffEmail);

        String notes = "Rejected by " + staffEmail + " — " + reason.trim();
        request.setStatus(BorrowRequest.STATUS_REJECTED);
        request.setDecidedAt(LocalDateTime.now());
        request.setDecisionNotes(notes);
        BorrowRequest saved = borrowRequestRepository.save(request);

        notificationService.notify(request.getUser(), Notification.TYPE_BORROW_REJECTED,
                "Borrow Request Rejected",
                "Your borrow request for '" + book.getTitle() + "' was rejected. Reason: " + reason,
                "/borrow-requests");
        mailService.send(email, "Borrow Request Rejected",
                "Hello " + request.getUser().getName() + ",\n\nYour borrow request for '" + book.getTitle()
                        + "' was rejected.\n\nReason: " + reason
                        + "\nIf you believe this is a mistake, please contact the library.\n\nRegards,\nLumina Library Team");

        auditLogService.log(staff.getEmail(), staff.getName(), staff.getRole().name(),
                "BORROW_REQUEST_REJECTED", "BorrowRequest", saved.getId(),
                "Rejected '" + book.getTitle() + "' for " + request.getUser().getName()
                        + " (" + request.getUser().getEmail() + ") — Reason: " + reason);

        log.info("Admin {} rejected borrow request id={}", staffEmail, requestId);
        return BorrowRequestDTO.fromEntity(saved);
    }

    @Transactional
    public BorrowRequestDTO cancel(Long requestId, String userEmail) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowRequest", requestId));
        if (!request.getUser().getEmail().equalsIgnoreCase(userEmail)) {
            throw new BusinessException("You can only cancel your own borrow requests.");
        }
        if (!BorrowRequest.STATUS_PENDING.equals(request.getStatus())) {
            throw new BusinessException("Only pending requests can be cancelled.");
        }
        request.setStatus(BorrowRequest.STATUS_CANCELLED);
        request.setCancelledAt(LocalDateTime.now());
        request.setDecisionNotes("Cancelled by " + request.getUser().getName());
        BorrowRequest saved = borrowRequestRepository.save(request);

        notificationService.notify(request.getUser(), Notification.TYPE_BORROW_CANCELLED,
                "Borrow Request Cancelled",
                "Your borrow request for '" + request.getBook().getTitle() + "' has been cancelled.",
                "/borrow-requests");
        notifyStaff("Borrow Request Cancelled",
                "Member " + request.getUser().getName() + " cancelled their borrow request for '"
                        + request.getBook().getTitle() + "'.",
                "/borrow-requests",
                (staff) -> "A borrow request was cancelled:\n\nBook: '" + request.getBook().getTitle()
                        + "'\nMember: " + request.getUser().getName() + " (" + request.getUser().getEmail() + ")\n\n"
                        + "Regards,\nLumina Library Team");

        auditLogService.log(userEmail, request.getUser().getName(), request.getUser().getRole().name(),
                "BORROW_REQUEST_CANCELLED", "BorrowRequest", saved.getId(),
                "Cancelled request for '" + request.getBook().getTitle() + "'");

        log.info("User {} cancelled borrow request id={}", userEmail, requestId);
        return BorrowRequestDTO.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("pending", borrowRequestRepository.countByStatus(BorrowRequest.STATUS_PENDING));
        stats.put("approved", borrowRequestRepository.countByStatus(BorrowRequest.STATUS_APPROVED));
        stats.put("rejected", borrowRequestRepository.countByStatus(BorrowRequest.STATUS_REJECTED));
        stats.put("cancelled", borrowRequestRepository.countByStatus(BorrowRequest.STATUS_CANCELLED));
        stats.put("total", borrowRequestRepository.count());
        return stats;
    }

    @Transactional(readOnly = true)
    public BorrowRequestDecisionInfo getDecisionInfo(Long requestId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowRequest", requestId));
        User member = request.getUser();
        Book book = request.getBook();

        UserSubscription sub = subscriptionService.getActiveSubscription(member).orElse(null);
        SubscriptionPlan plan = sub != null ? sub.getPlan() : null;

        long activeLoans = issuedBookRepository.findByUser(member).stream()
                .filter(ib -> IssuedBook.STATUS_ISSUED.equals(ib.getStatus()))
                .count();
        long outstandingFineCount = fineService.getOutstandingFineCount(member.getId());
        BigDecimal outstandingFineAmount = fineService.getOutstandingFineAmount(member.getId());

        List<String> warnings = new ArrayList<>();
        if (plan == null) {
            warnings.add("Member has no active subscription. The request cannot be approved.");
        }
        if (book.getAvailableCopies() == null || book.getAvailableCopies() <= 0) {
            warnings.add("No copies of this book are currently available.");
        }
        if (plan != null && activeLoans >= plan.getMaxBooks()) {
            warnings.add("Member has reached the borrowing limit of " + plan.getMaxBooks() + " books.");
        }
        if (outstandingFineCount > 0) {
            warnings.add("Member has " + outstandingFineCount + " unpaid fine"
                    + (outstandingFineCount == 1 ? "" : "s") + " totalling $" + outstandingFineAmount + ".");
        }

        return BorrowRequestDecisionInfo.builder()
                .requestId(request.getId())
                .memberId(member.getId())
                .memberName(member.getName())
                .memberEmail(member.getEmail())
                .bookId(book.getId())
                .bookTitle(book.getTitle())
                .bookAuthor(book.getAuthor())
                .bookIsbn(book.getIsbn())
                .bookCoverImageUrl(book.getCoverImageUrl())
                .borrowStartDate(request.getBorrowStartDate())
                .dueDate(request.getDueDate())
                .membershipPlanName(request.getMembershipPlanName() != null
                        ? request.getMembershipPlanName()
                        : (plan != null ? plan.getName() : "—"))
                .borrowLimit(plan != null ? plan.getMaxBooks() : 0)
                .booksCurrentlyBorrowed(activeLoans)
                .availableCopies(book.getAvailableCopies() != null ? book.getAvailableCopies() : 0)
                .totalCopies(book.getTotalCopies())
                .outstandingFineCount(outstandingFineCount)
                .outstandingFineAmount(outstandingFineAmount)
                .canApprove(warnings.isEmpty())
                .warnings(warnings)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BorrowRequestDTO> getMyRequests(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", userEmail));
        return borrowRequestRepository.findByUserOrderByRequestDateDesc(user)
                .stream()
                .map(BorrowRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BorrowRequestDTO> getAllRequests(String status) {
        List<BorrowRequest> requests = (status == null || status.isBlank())
                ? borrowRequestRepository.findAllByOrderByRequestDateDesc()
                : borrowRequestRepository.findByStatusOrderByRequestDateDesc(status);
        return requests.stream()
                .map(BorrowRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return borrowRequestRepository.countByStatus(BorrowRequest.STATUS_PENDING);
    }

    private void notifyStaff(String title, String message, String link, Function<User, String> emailBody) {
        List<User> staff = userRepository.findByRole(User.Role.ADMIN).stream()
                .distinct()
                .collect(Collectors.toList());
        for (User member : staff) {
            notificationService.notify(member, Notification.TYPE_BORROW_REQUESTED, title, message, link);
            mailService.send(member.getEmail(), title, emailBody.apply(member));
        }
    }

    private BorrowRequest findPending(Long requestId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowRequest", requestId));
        if (!BorrowRequest.STATUS_PENDING.equals(request.getStatus())) {
            throw new BusinessException("This borrow request has already been decided.");
        }
        return request;
    }

    private User resolveStaff(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }
}