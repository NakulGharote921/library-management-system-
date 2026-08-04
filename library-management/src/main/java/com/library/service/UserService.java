package com.library.service;

import com.library.dto.MemberProfileDto;
import com.library.dto.MemberStatsDto;
import com.library.dto.UserRequest;
import com.library.dto.UserResponse;
import com.library.dto.UserStatusRequest;
import com.library.dto.UsersOverviewDto;
import com.library.entity.BorrowRequest;
import com.library.entity.Fine;
import com.library.entity.IssuedBook;
import com.library.entity.PaymentTransaction;
import com.library.entity.Reservation;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.BorrowRequestRepository;
import com.library.repository.FineRepository;
import com.library.repository.IssuedBookRepository;
import com.library.repository.PaymentTransactionRepository;
import com.library.repository.ReservationRepository;
import com.library.repository.UserRepository;
import com.library.repository.UserSubscriptionRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> ACTIVE_SUBSCRIPTION_STATUSES =
            Set.of(UserSubscription.STATUS_ACTIVE, UserSubscription.STATUS_EXPIRING);

    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final ReservationRepository reservationRepository;
    private final FineRepository fineRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() != User.Role.ADMIN)
                .toList();
    }

    public Page<UserResponse> getUsersFiltered(int page, int size, String role, Boolean active,
                                                String subscriptionPlan, String keyword,
                                                String status, String borrowStatus, String sort) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.notEqual(root.get("role"), User.Role.ADMIN));

            if (StringUtils.hasText(role)) {
                predicates.add(cb.equal(root.get("role"), User.Role.valueOf(role.toUpperCase())));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (StringUtils.hasText(status)) {
                if ("INACTIVE".equalsIgnoreCase(status)) {
                    predicates.add(root.get("status").in(User.STATUS_SUSPENDED, User.STATUS_BLOCKED));
                } else {
                    predicates.add(cb.equal(root.get("status"), status.toUpperCase()));
                }
            }
            if (StringUtils.hasText(keyword)) {
                String k = keyword.trim();
                String like = "%" + k.toLowerCase() + "%";
                List<Predicate> kwPreds = new ArrayList<>();
                kwPreds.add(cb.like(cb.lower(root.get("name")), like));
                kwPreds.add(cb.like(cb.lower(root.get("email")), like));
                kwPreds.add(cb.like(cb.lower(cb.concat("", root.get("phone"))), like));
                String numeric = k.toUpperCase().startsWith("MEM-") ? k.substring(4).trim() : k;
                if (numeric.matches("\\d+")) {
                    kwPreds.add(cb.equal(root.get("id"), Long.parseLong(numeric)));
                }
                predicates.add(cb.or(kwPreds.toArray(new Predicate[0])));
            }
            if (StringUtils.hasText(subscriptionPlan)) {
                Subquery<UserSubscription> sub = query.subquery(UserSubscription.class);
                Root<UserSubscription> sRoot = sub.from(UserSubscription.class);
                sub.select(sRoot).where(cb.and(
                        cb.equal(sRoot.get("user"), root),
                        sRoot.get("status").in(ACTIVE_SUBSCRIPTION_STATUSES),
                        cb.equal(cb.upper(sRoot.get("plan").get("name")), subscriptionPlan.trim().toUpperCase())
                ));
                predicates.add(cb.exists(sub));
            }
            if (StringUtils.hasText(borrowStatus)) {
                predicates.add(buildBorrowStatusPredicate(root, query, cb, borrowStatus.toUpperCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sortOrder = "oldest".equalsIgnoreCase(sort)
                ? Sort.by("createdAt").ascending()
                : Sort.by("createdAt").descending();
        return userRepository.findAll(spec, PageRequest.of(page, size, sortOrder))
                .map(this::toResponse);
    }

    private Predicate buildBorrowStatusPredicate(Root<User> root, jakarta.persistence.criteria.CriteriaQuery<?> query,
                                                 jakarta.persistence.criteria.CriteriaBuilder cb, String borrowStatus) {
        switch (borrowStatus) {
            case "ISSUED": {
                Subquery<IssuedBook> sub = query.subquery(IssuedBook.class);
                Root<IssuedBook> ib = sub.from(IssuedBook.class);
                sub.select(ib).where(cb.and(
                        cb.equal(ib.get("user"), root),
                        cb.equal(ib.get("status"), IssuedBook.STATUS_ISSUED)));
                return cb.exists(sub);
            }
            case "OVERDUE": {
                Subquery<IssuedBook> sub = query.subquery(IssuedBook.class);
                Root<IssuedBook> ib = sub.from(IssuedBook.class);
                sub.select(ib).where(cb.and(
                        cb.equal(ib.get("user"), root),
                        cb.equal(ib.get("status"), IssuedBook.STATUS_ISSUED),
                        cb.lessThan(ib.get("dueDate"), LocalDate.now())));
                return cb.exists(sub);
            }
            case "RESERVED": {
                Subquery<Reservation> sub = query.subquery(Reservation.class);
                Root<Reservation> r = sub.from(Reservation.class);
                sub.select(r).where(cb.and(
                        cb.equal(r.get("user"), root),
                        r.get("status").in(Reservation.STATUS_PENDING, Reservation.STATUS_READY)));
                return cb.exists(sub);
            }
            case "PENDING_REQUEST": {
                Subquery<BorrowRequest> sub = query.subquery(BorrowRequest.class);
                Root<BorrowRequest> br = sub.from(BorrowRequest.class);
                sub.select(br).where(cb.and(
                        cb.equal(br.get("user"), root),
                        cb.equal(br.get("status"), BorrowRequest.STATUS_PENDING)));
                return cb.exists(sub);
            }
            default:
                return cb.conjunction();
        }
    }

    private UserSubscription findActiveSubscription(User u) {
        return userSubscriptionRepository.findByUserOrderByCreatedAtDesc(u).stream()
                .filter(s -> ACTIVE_SUBSCRIPTION_STATUSES.contains(s.getStatus()))
                .findFirst()
                .orElse(null);
    }

    private String toMembershipId(User u) {
        return "MEM-" + String.format("%06d", u.getId());
    }

    private BigDecimal sumFines(List<Fine> fines) {
        return fines.stream()
                .map(Fine::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private UserResponse toResponse(User u) {
        String subscriptionPlan = "NONE";
        UserSubscription active = findActiveSubscription(u);
        if (active != null) {
            subscriptionPlan = active.getPlan().getName().toUpperCase();
        }

        long issued = issuedBookRepository.countByUser_IdAndStatus(u.getId(), IssuedBook.STATUS_ISSUED);
        long overdue = issuedBookRepository.countByUser_IdAndStatusAndDueDateBefore(
                u.getId(), IssuedBook.STATUS_ISSUED, LocalDate.now());
        long reservations = reservationRepository.countByUser(u);
        BigDecimal outstandingFine = sumFines(
                fineRepository.findByUserIdAndStatusOrderByCreatedAtDesc(u.getId(), Fine.STATUS_UNPAID));

        return new UserResponse(
                u.getId(),
                u.getName(),
                u.getEmail(),
                u.getPhone(),
                u.getEnrollmentDate(),
                u.getRole(),
                u.isActive(),
                u.getLastLogin(),
                subscriptionPlan,
                issued,
                reservations,
                overdue,
                outstandingFine,
                u.getStatus(),
                toMembershipId(u)
        );
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Transactional
    public User addUser(UserRequest request) {
        userRepository.findByEmail(request.email()).ifPresent(s -> {
            throw new BusinessException("Email already registered");
        });
        if (!StringUtils.hasText(request.password())) {
            throw new BusinessException("Password is required to create a user");
        }
        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .phone(request.phone())
                .enrollmentDate(request.enrollmentDate())
                .role(request.role() != null ? request.role() : User.Role.MEMBER)
                .active(true)
                .status(User.STATUS_ACTIVE)
                .build();
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Long id, UserRequest incoming) {
        User existing = getUserById(id);
        if (existing.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Cannot modify the admin account");
        }
        if (!existing.getEmail().equalsIgnoreCase(incoming.email())) {
            userRepository.findByEmail(incoming.email()).ifPresent(s -> {
                throw new BusinessException("Email already registered");
            });
        }
        existing.setName(incoming.name());
        existing.setEmail(incoming.email());
        existing.setPhone(incoming.phone());
        existing.setEnrollmentDate(incoming.enrollmentDate());
        return userRepository.save(existing);
    }

    @Transactional
    public User updateStatus(Long id, UserStatusRequest request) {
        User existing = getUserById(id);
        if (existing.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Cannot change the status of the admin account");
        }
        String status = request.status().toUpperCase();
        if (!List.of(User.STATUS_ACTIVE, User.STATUS_PENDING_VERIFICATION,
                User.STATUS_SUSPENDED, User.STATUS_BLOCKED).contains(status)) {
            throw new BusinessException("Invalid status: " + request.status());
        }
        existing.setStatus(status);
        existing.setActive(!User.STATUS_SUSPENDED.equals(status) && !User.STATUS_BLOCKED.equals(status));
        return userRepository.save(existing);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = getUserById(id);
        if (user.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Cannot delete the admin account");
        }
        boolean hasActive = issuedBookRepository.findByUser(user).stream()
                .anyMatch(ib -> IssuedBook.STATUS_ISSUED.equals(ib.getStatus()));
        if (hasActive) {
            throw new BusinessException("Cannot delete user with active book issues");
        }
        userRepository.delete(user);
    }

    public List<User> searchUsers(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return getAllUsers();
        }
        return userRepository.searchByNameOrEmail(keyword.trim()).stream()
                .filter(u -> u.getRole() != User.Role.ADMIN)
                .toList();
    }

    @Transactional
    public void updateLastLogin(Long userId) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            userRepository.save(u);
        });
    }

    public UsersOverviewDto getUserOverview() {
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getRole() != User.Role.ADMIN)
                .toList();

        long active = users.stream().filter(u -> User.STATUS_ACTIVE.equals(u.getStatus())).count();
        long inactive = users.stream()
                .filter(u -> User.STATUS_SUSPENDED.equals(u.getStatus())
                        || User.STATUS_BLOCKED.equals(u.getStatus()))
                .count();
        long blocked = users.stream().filter(u -> User.STATUS_BLOCKED.equals(u.getStatus())).count();
        long premium = users.stream()
                .filter(u -> findActiveSubscription(u) != null
                        && "PREMIUM".equalsIgnoreCase(findActiveSubscription(u).getPlan().getName()))
                .count();
        long withOverdue = users.stream()
                .filter(u -> issuedBookRepository.countByUser_IdAndStatusAndDueDateBefore(
                        u.getId(), IssuedBook.STATUS_ISSUED, LocalDate.now()) > 0)
                .count();

        return new UsersOverviewDto(users.size(), active, inactive, blocked, premium, withOverdue);
    }

    public MemberProfileDto getMemberProfile(Long id) {
        User user = getUserById(id);
        if (user.getRole() == User.Role.ADMIN) {
            throw new BusinessException("Admin accounts cannot be viewed as members");
        }

        MemberStatsDto stats = getMemberStats(user);

        String plan = "NONE";
        String planStatus = null;
        LocalDate start = null;
        LocalDate end = null;
        UserSubscription active = findActiveSubscription(user);
        if (active != null) {
            plan = active.getPlan().getName().toUpperCase();
            planStatus = active.getStatus();
            start = active.getStartDate();
            end = active.getEndDate();
        }

        return new MemberProfileDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.isActive(),
                user.getEnrollmentDate(),
                user.getLastLogin(),
                user.getCreatedAt(),
                toMembershipId(user),
                plan,
                planStatus,
                start,
                end,
                stats.outstandingFine(),
                stats
        );
    }

    public MemberStatsDto getMemberStats(User user) {
        long booksIssued = issuedBookRepository.countByUser_IdAndStatus(user.getId(), IssuedBook.STATUS_ISSUED);
        long booksReturned = issuedBookRepository.countByUser_IdAndStatus(user.getId(), IssuedBook.STATUS_RETURNED);
        long overdueBooks = issuedBookRepository.countByUser_IdAndStatusAndDueDateBefore(
                user.getId(), IssuedBook.STATUS_ISSUED, LocalDate.now());

        long activeReservations = reservationRepository.countByUserAndStatusIn(user,
                List.of(Reservation.STATUS_PENDING, Reservation.STATUS_READY));
        long waitingReservations = reservationRepository.countByUserAndStatus(user, Reservation.STATUS_PENDING);
        long readyReservations = reservationRepository.countByUserAndStatus(user, Reservation.STATUS_READY);
        long completedReservations = reservationRepository.countByUserAndStatus(user, Reservation.STATUS_FULFILLED);

        long pendingBorrowRequests = borrowRequestRepository.countByUserAndStatus(user, BorrowRequest.STATUS_PENDING);

        long unpaidFines = fineRepository.countByUserIdAndStatus(user.getId(), Fine.STATUS_UNPAID);
        BigDecimal outstandingFine = sumFines(
                fineRepository.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), Fine.STATUS_UNPAID));
        BigDecimal totalFine = sumFines(fineRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));

        List<PaymentTransaction> payments = paymentTransactionRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .filter(p -> PaymentTransaction.STATUS_SUCCESS.equals(p.getStatus()))
                .toList();
        long totalPayments = payments.size();
        BigDecimal totalPaymentsAmount = payments.stream()
                .map(PaymentTransaction::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MemberStatsDto(
                booksIssued,
                booksReturned,
                overdueBooks,
                activeReservations,
                waitingReservations,
                readyReservations,
                completedReservations,
                pendingBorrowRequests,
                unpaidFines,
                outstandingFine,
                totalFine,
                totalPayments,
                totalPaymentsAmount
        );
    }
}
