package com.library.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.library.dto.OrderResponseDto;
import com.library.entity.Fine;
import com.library.entity.PaymentTransaction;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final List<String> ACTIVE_STATUSES = List.of(
            PaymentTransaction.STATUS_PENDING, PaymentTransaction.STATUS_SUCCESS);

    private static final List<String> COMPLETED_STATUSES = List.of(
            PaymentTransaction.STATUS_SUCCESS, PaymentTransaction.STATUS_REFUNDED);

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final FineService fineService;
    private final SubscriptionService subscriptionService;
    private final CashfreeGateway cashfreeGateway;
    private final ObjectMapper objectMapper;

    @Value("${app.payments.notify-url:}")
    private String notifyUrl;

    @Transactional
    public OrderResponseDto createOrder(User user, Long fineId, String paymentType) {
        Fine fine = fineService.getFineById(fineId);
        if (!Fine.STATUS_UNPAID.equals(fine.getStatus())) {
            throw new BusinessException(HttpStatus.CONFLICT, "Fine is already paid.");
        }
        boolean isAdmin = user.getRole() == User.Role.ADMIN;
        if (!isAdmin && !fine.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Fine does not belong to this user");
        }
        if (fine.getAmount() == null || fine.getAmount().signum() <= 0) {
            throw new BusinessException("Invalid fine amount: cannot create payment order");
        }
        BigDecimal amountInRupees = fine.getAmount();
        log.info("Fine payment order started: fineId={}, amountInRupees={}, currency=INR", fineId, amountInRupees);

        Optional<PaymentTransaction> active = reusablePending(
                paymentTransactionRepository.findFirstByFineIdAndStatusInOrderByCreatedAtDesc(fineId, ACTIVE_STATUSES),
                amountInRupees);
        if (active.isPresent()) {
            PaymentTransaction existing = active.get();
            if (PaymentTransaction.STATUS_SUCCESS.equals(existing.getStatus())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Fine is already paid.");
            }
            log.info("Reusing existing pending payment order {} for fine id={}", existing.getRazorpayOrderId(), fineId);
            return toOrderDto(existing);
        }

        try {
            PaymentTransaction transaction = persistNewOrder(user, fine, null, amountInRupees, paymentType);
            return toOrderDto(transaction);
        } catch (DataIntegrityViolationException e) {
            Optional<PaymentTransaction> concurrent = paymentTransactionRepository
                    .findFirstByFineIdAndStatusInOrderByCreatedAtDesc(fineId, ACTIVE_STATUSES);
            if (concurrent.isPresent()) {
                log.info("Concurrent order creation detected, reusing existing payment for fine id={}", fineId);
                return toOrderDto(concurrent.get());
            }
            throw e;
        }
    }

    @Transactional
    public OrderResponseDto createSubscriptionOrder(User user, Long subscriptionId) {
        UserSubscription sub = subscriptionService.getUserSubscriptionById(subscriptionId);
        if (!UserSubscription.STATUS_PENDING.equals(sub.getStatus())) {
            throw new BusinessException("Subscription is not in pending state");
        }
        if (!sub.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Subscription does not belong to this user");
        }

        SubscriptionPlan plan = sub.getPlan();
        if (plan == null) {
            throw new BusinessException("Subscription plan is not configured");
        }
        if (plan.getPrice() == null || plan.getValidityDays() <= 0 || plan.getName() == null || plan.getName().isBlank()) {
            throw new BusinessException("Subscription plan is incomplete: price, validity and name are required");
        }
        BigDecimal priceInRupees = plan.getPrice();
        log.info("Subscription order started: planId={}, planName={}, priceInRupees={}, currency=INR",
                plan.getId(), plan.getName(), priceInRupees);

        if (priceInRupees.signum() <= 0) {
            log.info("Free plan detected, activating subscription directly: subscriptionId={}, planId={}",
                    subscriptionId, plan.getId());
            Optional<PaymentTransaction> existingPaid = paymentTransactionRepository
                    .findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(subscriptionId, ACTIVE_STATUSES);
            if (existingPaid.isPresent() && PaymentTransaction.STATUS_SUCCESS.equals(existingPaid.get().getStatus())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Subscription is already paid.");
            }
            subscriptionService.activateSubscription(subscriptionId, "FREE_" + subscriptionId, null);
            PaymentTransaction transaction = PaymentTransaction.builder()
                    .user(user)
                    .subscription(sub)
                    .razorpayOrderId("FREE_" + subscriptionId)
                    .amount(BigDecimal.ZERO)
                    .currency("INR")
                    .paymentType(PaymentTransaction.TYPE_SUBSCRIPTION)
                    .paymentMethod("FREE")
                    .status(PaymentTransaction.STATUS_SUCCESS)
                    .completedAt(LocalDateTime.now())
                    .build();
            return toOrderDto(paymentTransactionRepository.save(transaction));
        }

        Optional<PaymentTransaction> active = reusablePending(
                paymentTransactionRepository.findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(subscriptionId, ACTIVE_STATUSES),
                priceInRupees);
        if (active.isPresent()) {
            PaymentTransaction existing = active.get();
            if (PaymentTransaction.STATUS_SUCCESS.equals(existing.getStatus())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Subscription is already paid.");
            }
            log.info("Reusing existing pending subscription payment order {} for subscription id={}",
                    existing.getRazorpayOrderId(), subscriptionId);
            return toOrderDto(existing);
        }

        try {
            PaymentTransaction transaction = persistNewOrder(user, null, sub, priceInRupees,
                    PaymentTransaction.TYPE_SUBSCRIPTION);
            return toOrderDto(transaction);
        } catch (DataIntegrityViolationException e) {
            Optional<PaymentTransaction> concurrent = paymentTransactionRepository
                    .findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(subscriptionId, ACTIVE_STATUSES);
            if (concurrent.isPresent()) {
                log.info("Concurrent subscription order creation detected, reusing existing payment for subscription id={}", subscriptionId);
                return toOrderDto(concurrent.get());
            }
            throw e;
        }
    }

    private PaymentTransaction persistNewOrder(User user, Fine fine, UserSubscription sub,
                                               BigDecimal amountInRupees, String paymentType) {
        String orderId = generateOrderId();
        PaymentTransaction transaction = PaymentTransaction.builder()
                .user(user)
                .fine(fine)
                .subscription(sub)
                .razorpayOrderId(orderId)
                .amount(amountInRupees)
                .currency("INR")
                .paymentType(paymentType)
                .paymentMethod("CASHFREE")
                .status(PaymentTransaction.STATUS_PENDING)
                .build();
        transaction = paymentTransactionRepository.save(transaction);
        try {
            CashfreeGateway.OrderResult order = cashfreeGateway.createOrder(
                    orderId, amountInRupees, String.valueOf(user.getId()),
                    user.getEmail(), user.getPhone(), notifyUrl);
            transaction.setRazorpaySignature(order.paymentSessionId());
            return paymentTransactionRepository.save(transaction);
        } catch (BusinessException e) {
            transaction.setStatus(PaymentTransaction.STATUS_FAILED);
            transaction.setCompletedAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);
            throw e;
        }
    }

    private OrderResponseDto toOrderDto(PaymentTransaction transaction) {
        return OrderResponseDto.builder()
                .orderId(transaction.getRazorpayOrderId())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency() == null ? "INR" : transaction.getCurrency())
                .paymentSessionId(transaction.getRazorpaySignature())
                .build();
    }

    private Optional<PaymentTransaction> reusablePending(Optional<PaymentTransaction> active, BigDecimal expectedInRupees) {
        if (active.isEmpty()) {
            return active;
        }
        PaymentTransaction existing = active.get();
        if (PaymentTransaction.STATUS_SUCCESS.equals(existing.getStatus())) {
            return active;
        }
        if (PaymentTransaction.STATUS_FAILED.equals(existing.getStatus())) {
            return Optional.empty();
        }
        log.info("Existing pending payment {} (created {}) is not reusable - marking FAILED, creating fresh order",
                existing.getRazorpayOrderId(), existing.getCreatedAt());
        existing.setStatus(PaymentTransaction.STATUS_FAILED);
        existing.setCompletedAt(LocalDateTime.now());
        paymentTransactionRepository.save(existing);
        return Optional.empty();
    }

    @Transactional
    public PaymentTransaction verifyPayment(String orderId, String paymentId) {
        PaymentTransaction transaction = paymentTransactionRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", orderId));

        if (PaymentTransaction.STATUS_SUCCESS.equals(transaction.getStatus())) {
            log.info("Payment already completed for order: {} - returning existing transaction", orderId);
            return transaction;
        }

        if (!PaymentTransaction.STATUS_PENDING.equals(transaction.getStatus())
                && !PaymentTransaction.STATUS_FAILED.equals(transaction.getStatus())) {
            throw new BusinessException("Payment already " + transaction.getStatus());
        }

        try {
            List<CashfreeGateway.PaymentResult> payments = cashfreeGateway.getPayments(orderId);
            CashfreeGateway.PaymentResult success = payments.stream()
                    .filter(p -> "SUCCESS".equals(p.paymentStatus()))
                    .findFirst()
                    .orElse(null);
            if (paymentId != null && !paymentId.isBlank()) {
                success = payments.stream()
                        .filter(p -> paymentId.equals(p.cfPaymentId()) && "SUCCESS".equals(p.paymentStatus()))
                        .findFirst()
                        .orElse(null);
                if (success == null) {
                    throw new BusinessException("Payment not verified with Cashfree");
                }
            }
            if (success == null) {
                throw new BusinessException("Payment is not successful yet");
            }
            if (success.paymentAmount() != null && transaction.getAmount() != null
                    && success.paymentAmount().compareTo(transaction.getAmount()) != 0) {
                log.warn("Payment amount mismatch for order {}: Cashfree={} rupees, expected={} rupees",
                        orderId, success.paymentAmount(), transaction.getAmount());
                throw new BusinessException("Payment amount mismatch");
            }

            completePayment(transaction, success.cfPaymentId());
            return transaction;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            transaction.setStatus(PaymentTransaction.STATUS_FAILED);
            transaction.setCompletedAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);
            log.error("Payment verification failed for order {}: {}", orderId, e.getMessage());
            throw new BusinessException("Payment verification failed: " + e.getMessage());
        }
    }

    @Transactional
    public PaymentTransaction markPaymentFailed(User user, String orderId) {
        PaymentTransaction transaction = paymentTransactionRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", orderId));
        boolean isAdmin = user.getRole() == User.Role.ADMIN;
        if (!isAdmin && !transaction.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Payment does not belong to this user");
        }
        if (PaymentTransaction.STATUS_PENDING.equals(transaction.getStatus())) {
            transaction.setStatus(PaymentTransaction.STATUS_FAILED);
            transaction.setCompletedAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);
            log.info("Payment marked FAILED (client-side) for order: {}", orderId);
        } else {
            log.info("markFailed ignored for order {} - current status {}", orderId, transaction.getStatus());
        }
        return transaction;
    }

    @Transactional
    public void handleWebhook(String rawBody, String timestamp, String signature) {
        if (!cashfreeGateway.verifyWebhookSignature(rawBody, timestamp, signature)) {
            log.warn("Cashfree webhook signature verification failed");
            return;
        }

        try {
            JsonNode payload = objectMapper.readTree(rawBody);
            JsonNode data = payload.path("data");
            String orderId = data.path("order").path("order_id").asText("");
            String paymentId = data.path("payment").path("cf_payment_id").asText("");
            String paymentStatus = data.path("payment").path("payment_status").asText("");

            if (orderId.isEmpty()) {
                log.warn("Cashfree webhook without order_id");
                return;
            }

            Optional<PaymentTransaction> existing = paymentTransactionRepository.findByRazorpayOrderId(orderId);
            if (existing.isEmpty()) {
                log.warn("No transaction found for order: {}", orderId);
                return;
            }

            PaymentTransaction transaction = existing.get();
            if (!PaymentTransaction.STATUS_PENDING.equals(transaction.getStatus())
                    && !PaymentTransaction.STATUS_FAILED.equals(transaction.getStatus())) {
                log.info("Webhook ignored - payment already processed for order: {}", orderId);
                return;
            }

            if ("SUCCESS".equals(paymentStatus)) {
                BigDecimal webhookAmount = decimal(data.path("payment"), "payment_amount");
                if (webhookAmount != null && transaction.getAmount() != null
                        && webhookAmount.compareTo(transaction.getAmount()) != 0) {
                    log.warn("Webhook amount mismatch for order {}: Cashfree={} rupees, expected={} rupees",
                            orderId, webhookAmount, transaction.getAmount());
                    return;
                }
                completePayment(transaction, paymentId);
                log.info("Webhook processed successfully for order: {}", orderId);
            } else if ("FAILED".equals(paymentStatus) || "USER_DROPPED".equals(paymentStatus)
                    || "CANCELLED".equals(paymentStatus) || "VOID".equals(paymentStatus)) {
                transaction.setStatus(PaymentTransaction.STATUS_FAILED);
                transaction.setCompletedAt(LocalDateTime.now());
                paymentTransactionRepository.save(transaction);
                log.info("Webhook recorded failure for order: {}", orderId);
            }
        } catch (Exception e) {
            log.error("Cashfree webhook processing error: {}", e.getMessage());
        }
    }

    private void completePayment(PaymentTransaction transaction, String paymentId) {
        transaction.setRazorpayPaymentId(paymentId);
        transaction.setStatus(PaymentTransaction.STATUS_SUCCESS);
        transaction.setCompletedAt(LocalDateTime.now());
        paymentTransactionRepository.save(transaction);

        if (transaction.getFine() != null) {
            fineService.markFineAsPaid(transaction.getFine().getId());
        }
        if (transaction.getSubscription() != null) {
            subscriptionService.activateSubscription(
                    transaction.getSubscription().getId(),
                    transaction.getRazorpayOrderId(),
                    paymentId);
        }

        log.info("Payment completed for order: {}, payment: {}, type: {}",
                transaction.getRazorpayOrderId(), paymentId, transaction.getPaymentType());
    }

    public List<PaymentTransaction> getUserTransactions(User user) {
        return paymentTransactionRepository.findByUserAndStatusInOrderByCreatedAtDesc(user, COMPLETED_STATUSES);
    }

    public PaymentTransaction getByOrderId(String orderId) {
        return paymentTransactionRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", orderId));
    }

    public PaymentTransaction getById(Long id) {
        return paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", id));
    }

    public List<PaymentTransaction> getFilteredTransactions(User user, String status, String paymentType) {
        List<PaymentTransaction> result;
        if (user.getRole() == User.Role.ADMIN) {
            if (status != null && paymentType != null) {
                result = paymentTransactionRepository.findByStatusAndPaymentTypeOrderByCreatedAtDesc(status, paymentType);
            } else if (status != null) {
                result = paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(status);
            } else if (paymentType != null) {
                result = paymentTransactionRepository.findByPaymentTypeOrderByCreatedAtDesc(paymentType);
            } else {
                result = paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            if (status != null && paymentType != null) {
                result = paymentTransactionRepository.findByUserAndStatusAndPaymentTypeOrderByCreatedAtDesc(user, status, paymentType);
            } else if (status != null) {
                result = paymentTransactionRepository.findByUserAndStatusOrderByCreatedAtDesc(user, status);
            } else if (paymentType != null) {
                result = paymentTransactionRepository.findByUserAndPaymentTypeOrderByCreatedAtDesc(user, paymentType);
            } else {
                result = paymentTransactionRepository.findByUserOrderByCreatedAtDesc(user);
            }
        }
        return result.stream()
                .filter(t -> COMPLETED_STATUSES.contains(t.getStatus()))
                .collect(Collectors.toList());
    }

    private String generateOrderId() {
        return "LIB" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }

    private BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        try {
            return new BigDecimal(value.asText());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
