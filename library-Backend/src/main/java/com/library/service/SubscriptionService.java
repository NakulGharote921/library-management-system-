package com.library.service;

import com.library.dto.MembershipSummaryDto;
import com.library.entity.IssuedBook;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.IssuedBookRepository;
import com.library.repository.UserRepository;
import com.library.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionPlanService planService;
    private final UserRepository userRepository;
    private final IssuedBookRepository issuedBookRepository;

    @Transactional(readOnly = true)
    public Optional<UserSubscription> getActiveSubscription(User user) {
        return userSubscriptionRepository.findTopByUserAndStatusOrderByEndDateDesc(user, UserSubscription.STATUS_ACTIVE);
    }

    @Transactional(readOnly = true)
    public Optional<MembershipSummaryDto> getMembershipSummary(User user) {
        Optional<UserSubscription> active = getActiveSubscription(user);
        if (active.isEmpty()) {
            active = userSubscriptionRepository.findTopByUserAndStatusOrderByEndDateDesc(user, UserSubscription.STATUS_EXPIRING);
        }
        if (active.isEmpty()) {
            return Optional.empty();
        }
        UserSubscription sub = active.get();
        SubscriptionPlan plan = sub.getPlan();
        long borrowed = issuedBookRepository.countByUser_IdAndStatus(user.getId(), IssuedBook.STATUS_ISSUED);
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(LocalDate.now(), sub.getEndDate()));
        return Optional.of(MembershipSummaryDto.builder()
                .membershipName(plan.getName())
                .status(sub.getStatus())
                .allowedBooks(plan.getMaxBooks())
                .borrowedBooks((int) borrowed)
                .remainingBooks(Math.max(0, plan.getMaxBooks() - (int) borrowed))
                .startDate(sub.getStartDate())
                .expiryDate(sub.getEndDate())
                .daysRemaining(daysRemaining)
                .build());
    }

    public boolean hasActiveSubscription(User user) {
        return userSubscriptionRepository.countByUserAndStatus(user, UserSubscription.STATUS_ACTIVE) > 0
                || userSubscriptionRepository.countByUserAndStatus(user, UserSubscription.STATUS_EXPIRING) > 0;
    }

    public void validateBorrowingPrivileges(User user) {
        UserSubscription sub = getActiveSubscription(user)
                .orElseThrow(() -> new BusinessException("No active subscription. Please purchase a plan."));
        if (sub.getEndDate().isBefore(LocalDate.now())) {
            sub.setStatus(UserSubscription.STATUS_EXPIRED);
            userSubscriptionRepository.save(sub);
            throw new BusinessException("Your subscription has expired. Please renew.");
        }
        if (sub.getEndDate().isBefore(LocalDate.now().plusDays(3))
                && UserSubscription.STATUS_ACTIVE.equals(sub.getStatus())) {
            sub.setStatus(UserSubscription.STATUS_EXPIRING);
            userSubscriptionRepository.save(sub);
        }
    }

    public SubscriptionPlan getPlanByName(String name) {
        return planService.getActivePlans().stream()
                .filter(p -> p.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("SubscriptionPlan", name));
    }

    @Transactional
    public UserSubscription purchaseSubscription(User user, Long planId) {
        SubscriptionPlan plan = planService.getPlanById(planId);
        if (!SubscriptionPlan.STATUS_ACTIVE.equals(plan.getStatus())) {
            throw new BusinessException("This plan is not available for purchase");
        }
        Optional<UserSubscription> pending = userSubscriptionRepository
                .findTopByUserAndPlanIdAndStatusOrderByCreatedAtDesc(user, planId, UserSubscription.STATUS_PENDING);
        if (pending.isPresent()) {
            log.info("Reusing existing pending subscription id={} for user {} plan {}", pending.get().getId(), user.getEmail(), planId);
            return pending.get();
        }
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(plan.getValidityDays());
        UserSubscription sub = UserSubscription.builder()
                .user(user)
                .plan(plan)
                .startDate(start)
                .endDate(end)
                .status(UserSubscription.STATUS_PENDING)
                .build();
        return userSubscriptionRepository.save(sub);
    }

    @Transactional
    public UserSubscription activateSubscription(Long subscriptionId, String razorpayOrderId, String razorpayPaymentId) {
        UserSubscription sub = userSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("UserSubscription", subscriptionId));
        sub.setStatus(UserSubscription.STATUS_ACTIVE);
        sub.setRazorpayOrderId(razorpayOrderId);
        sub.setRazorpayPaymentId(razorpayPaymentId);
        sub.setActivatedAt(java.time.LocalDateTime.now());
        return userSubscriptionRepository.save(sub);
    }

    @Transactional
    public void cancelSubscription(Long subscriptionId) {
        UserSubscription sub = userSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("UserSubscription", subscriptionId));
        sub.setStatus(UserSubscription.STATUS_CANCELLED);
        sub.setCancelledAt(java.time.LocalDateTime.now());
        userSubscriptionRepository.save(sub);
    }

    public UserSubscription getUserSubscriptionById(Long id) {
        return userSubscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserSubscription", id));
    }

    public List<UserSubscription> getUserSubscriptions(User user) {
        return userSubscriptionRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void expireSubscriptions() {
        List<UserSubscription> expired = userSubscriptionRepository.findExpiredSubscriptions(
                UserSubscription.STATUS_ACTIVE, LocalDate.now());
        for (UserSubscription sub : expired) {
            sub.setStatus(UserSubscription.STATUS_EXPIRED);
            userSubscriptionRepository.save(sub);
            log.info("Subscription {} expired for user {}", sub.getId(), sub.getUser().getEmail());
        }
        List<UserSubscription> expiringSoon = userSubscriptionRepository.findExpiredSubscriptions(
                UserSubscription.STATUS_EXPIRING, LocalDate.now());
        for (UserSubscription sub : expiringSoon) {
            sub.setStatus(UserSubscription.STATUS_EXPIRED);
            userSubscriptionRepository.save(sub);
            log.info("Subscription {} expired (was expiring) for user {}", sub.getId(), sub.getUser().getEmail());
        }
        LocalDate soon = LocalDate.now().plusDays(3);
        List<UserSubscription> nearingExpiry = userSubscriptionRepository.findExpiringSubscriptions(
                UserSubscription.STATUS_ACTIVE, LocalDate.now(), soon);
        for (UserSubscription sub : nearingExpiry) {
            sub.setStatus(UserSubscription.STATUS_EXPIRING);
            userSubscriptionRepository.save(sub);
            log.info("Subscription {} marked as expiring for user {}", sub.getId(), sub.getUser().getEmail());
        }
    }
}
