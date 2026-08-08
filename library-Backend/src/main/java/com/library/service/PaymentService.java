package com.library.service;

import com.library.dto.OrderResponseDto;
import com.library.entity.Fine;
import com.library.entity.PaymentTransaction;
import com.library.entity.SubscriptionPlan;
import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.PaymentTransactionRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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

    @Value("${razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret:}")
    private String razorpayWebhookSecret;

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
        int amountPaise = fine.getAmount().multiply(BigDecimal.valueOf(100)).intValue();
        log.info("Fine payment order started: fineId={}, amountPaise={}, currency=INR", fineId, amountPaise);

        Optional<PaymentTransaction> active = paymentTransactionRepository
                .findFirstByFineIdAndStatusInOrderByCreatedAtDesc(fineId, ACTIVE_STATUSES);
        if (active.isPresent()) {
            PaymentTransaction existing = active.get();
            if (PaymentTransaction.STATUS_SUCCESS.equals(existing.getStatus())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Fine is already paid.");
            }
            log.info("Reusing existing pending payment order {} for fine id={}", existing.getRazorpayOrderId(), fineId);
            return toOrderDto(existing, amountPaise);
        }

        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", paymentType.toLowerCase() + "_" + fineId);
            Order razorpayOrder = client.orders.create(orderRequest);
            log.info("Razorpay fine order created: orderId={}, amountPaise={}, currency=INR", razorpayOrder.get("id"), amountPaise);

            PaymentTransaction transaction = PaymentTransaction.builder()
                    .user(user)
                    .fine(fine)
                    .razorpayOrderId(razorpayOrder.get("id"))
                    .amount(fine.getAmount())
                    .currency("INR")
                    .paymentType(paymentType)
                    .status(PaymentTransaction.STATUS_PENDING)
                    .build();
            return toOrderDto(paymentTransactionRepository.save(transaction), amountPaise);
        } catch (DataIntegrityViolationException e) {
            Optional<PaymentTransaction> concurrent = paymentTransactionRepository
                    .findFirstByFineIdAndStatusInOrderByCreatedAtDesc(fineId, ACTIVE_STATUSES);
            if (concurrent.isPresent()) {
                log.info("Concurrent order creation detected, reusing existing payment for fine id={}", fineId);
                return toOrderDto(concurrent.get(), amountPaise);
            }
            throw e;
        } catch (Exception e) {
            log.error("Razorpay fine order creation failed: fineId={}, error={}", fineId, e.getMessage());
            throw new BusinessException("Failed to create Razorpay order: " + e.getMessage());
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
        int amountPaise = plan.getPrice().multiply(BigDecimal.valueOf(100)).intValue();
        log.info("Subscription order started: planId={}, planName={}, price={}, amountPaise={}, currency=INR",
                plan.getId(), plan.getName(), plan.getPrice(), amountPaise);

        if (amountPaise <= 0) {
            log.info("Free plan detected, activating subscription directly: subscriptionId={}, planId={}",
                    subscriptionId, plan.getId());
            Optional<PaymentTransaction> existingPaid = paymentTransactionRepository
                    .findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(subscriptionId, ACTIVE_STATUSES);
            if (existingPaid.isPresent() && PaymentTransaction.STATUS_SUCCESS.equals(existingPaid.get().getStatus())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Subscription is already paid.");
            }
            subscriptionService.activateSubscription(subscriptionId, null, null);
            PaymentTransaction transaction = PaymentTransaction.builder()
                    .user(user)
                    .subscription(sub)
                    .razorpayOrderId("FREE_" + subscriptionId)
                    .amount(BigDecimal.ZERO)
                    .currency("INR")
                    .paymentType(PaymentTransaction.TYPE_SUBSCRIPTION)
                    .status(PaymentTransaction.STATUS_SUCCESS)
                    .completedAt(LocalDateTime.now())
                    .build();
            return toOrderDto(paymentTransactionRepository.save(transaction), 0);
        }

        Optional<PaymentTransaction> active = paymentTransactionRepository
                .findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(subscriptionId, ACTIVE_STATUSES);
        if (active.isPresent()) {
            PaymentTransaction existing = active.get();
            if (PaymentTransaction.STATUS_SUCCESS.equals(existing.getStatus())) {
                throw new BusinessException(HttpStatus.CONFLICT, "Subscription is already paid.");
            }
            log.info("Reusing existing pending subscription payment order {} for subscription id={}",
                    existing.getRazorpayOrderId(), subscriptionId);
            return toOrderDto(existing, amountPaise);
        }

        try {
            RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "sub_" + subscriptionId);
            Order razorpayOrder = client.orders.create(orderRequest);
            log.info("Razorpay subscription order created: orderId={}, amountPaise={}, currency=INR",
                    razorpayOrder.get("id"), amountPaise);

            PaymentTransaction transaction = PaymentTransaction.builder()
                    .user(user)
                    .subscription(sub)
                    .razorpayOrderId(razorpayOrder.get("id"))
                    .amount(plan.getPrice())
                    .currency("INR")
                    .paymentType(PaymentTransaction.TYPE_SUBSCRIPTION)
                    .status(PaymentTransaction.STATUS_PENDING)
                    .build();
            return toOrderDto(paymentTransactionRepository.save(transaction), amountPaise);
        } catch (DataIntegrityViolationException e) {
            Optional<PaymentTransaction> concurrent = paymentTransactionRepository
                    .findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(subscriptionId, ACTIVE_STATUSES);
            if (concurrent.isPresent()) {
                log.info("Concurrent subscription order creation detected, reusing existing payment for subscription id={}", subscriptionId);
                return toOrderDto(concurrent.get(), amountPaise);
            }
            throw e;
        } catch (Exception e) {
            log.error("Razorpay subscription order creation failed: subscriptionId={}, error={}", subscriptionId, e.getMessage());
            throw new BusinessException("Failed to create Razorpay order: " + e.getMessage());
        }
    }

    private OrderResponseDto toOrderDto(PaymentTransaction transaction, int amountPaise) {
        return OrderResponseDto.builder()
                .orderId(transaction.getRazorpayOrderId())
                .amount(amountPaise)
                .currency(transaction.getCurrency() == null ? "INR" : transaction.getCurrency())
                .keyId(razorpayKeyId)
                .build();
    }

    @Transactional
    public PaymentTransaction verifyPayment(String razorpayOrderId, String razorpayPaymentId,
                                             String razorpaySignature) {
        PaymentTransaction transaction = paymentTransactionRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", razorpayOrderId));

        if (!PaymentTransaction.STATUS_PENDING.equals(transaction.getStatus())) {
            throw new BusinessException("Payment already " + transaction.getStatus());
        }

        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", razorpayOrderId);
            options.put("razorpay_payment_id", razorpayPaymentId);
            options.put("razorpay_signature", razorpaySignature);

            boolean isValid = Utils.verifyPaymentSignature(options, razorpayKeySecret);
            if (!isValid) {
                transaction.setStatus(PaymentTransaction.STATUS_FAILED);
                transaction.setCompletedAt(LocalDateTime.now());
                paymentTransactionRepository.save(transaction);
                log.warn("Payment signature verification failed for order: {}", razorpayOrderId);
                throw new BusinessException("Payment signature verification failed");
            }

            completePayment(transaction, razorpayPaymentId, razorpaySignature);
            return transaction;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            transaction.setStatus(PaymentTransaction.STATUS_FAILED);
            transaction.setCompletedAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);
            log.error("Payment verification failed for order {}: {}", razorpayOrderId, e.getMessage());
            throw new BusinessException("Payment verification failed: " + e.getMessage());
        }
    }

    @Transactional
    public PaymentTransaction markPaymentFailed(User user, String razorpayOrderId) {
        PaymentTransaction transaction = paymentTransactionRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", razorpayOrderId));
        boolean isAdmin = user.getRole() == User.Role.ADMIN;
        if (!isAdmin && !transaction.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Payment does not belong to this user");
        }
        if (PaymentTransaction.STATUS_PENDING.equals(transaction.getStatus())) {
            transaction.setStatus(PaymentTransaction.STATUS_FAILED);
            transaction.setCompletedAt(LocalDateTime.now());
            paymentTransactionRepository.save(transaction);
            log.info("Payment marked FAILED (client-side) for order: {}", razorpayOrderId);
        } else {
            log.info("markFailed ignored for order {} - current status {}", razorpayOrderId, transaction.getStatus());
        }
        return transaction;
    }

    @Transactional
    public void handleWebhook(String rawBody, String signature) {
        String webhookSecret = razorpayWebhookSecret.isEmpty() ? razorpayKeySecret : razorpayWebhookSecret;

        try {
            if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
                log.warn("Webhook signature verification failed");
                return;
            }

            JSONObject payload = new JSONObject(rawBody);
            String event = payload.optString("event");

            JSONObject paymentEntity = extractPaymentEntity(payload, event);
            if (paymentEntity == null) return;

            String razorpayOrderId = paymentEntity.optString("order_id");
            String razorpayPaymentId = paymentEntity.optString("id");
            String eventStatus = paymentEntity.optString("status");

            if (razorpayOrderId.isEmpty() || razorpayPaymentId.isEmpty()) return;

            Optional<PaymentTransaction> existing = paymentTransactionRepository
                    .findByRazorpayOrderId(razorpayOrderId);
            if (existing.isEmpty()) {
                log.warn("No transaction found for order: {}", razorpayOrderId);
                return;
            }

            PaymentTransaction transaction = existing.get();
            if (!PaymentTransaction.STATUS_PENDING.equals(transaction.getStatus())) {
                log.info("Webhook ignored - payment already processed for order: {}", razorpayOrderId);
                return;
            }

            if ("captured".equals(eventStatus)) {
                completePayment(transaction, razorpayPaymentId, "webhook_" + signature.hashCode());
                log.info("Webhook processed successfully for order: {}", razorpayOrderId);
            } else if ("failed".equals(eventStatus)) {
                transaction.setStatus(PaymentTransaction.STATUS_FAILED);
                transaction.setCompletedAt(LocalDateTime.now());
                paymentTransactionRepository.save(transaction);
                log.info("Webhook recorded failure for order: {}", razorpayOrderId);
            }
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage());
        }
    }

    private JSONObject extractPaymentEntity(JSONObject payload, String event) {
        JSONObject paymentPayload = payload.optJSONObject("payload");
        if (paymentPayload == null) return null;

        if ("payment.captured".equals(event) || "payment.failed".equals(event)) {
            JSONObject payment = paymentPayload.optJSONObject("payment");
            return payment != null ? payment.optJSONObject("entity") : null;
        } else if ("order.paid".equals(event)) {
            JSONObject order = paymentPayload.optJSONObject("order");
            return order != null ? order.optJSONObject("entity") : null;
        }
        return null;
    }

    private void completePayment(PaymentTransaction transaction, String razorpayPaymentId, String razorpaySignature) {
        transaction.setRazorpayPaymentId(razorpayPaymentId);
        transaction.setRazorpaySignature(razorpaySignature);
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
                    razorpayPaymentId);
        }

        log.info("Payment completed for order: {}, payment: {}, type: {}",
                transaction.getRazorpayOrderId(), razorpayPaymentId, transaction.getPaymentType());
    }

    public List<PaymentTransaction> getUserTransactions(User user) {
        return paymentTransactionRepository.findByUserAndStatusInOrderByCreatedAtDesc(user, COMPLETED_STATUSES);
    }

    public PaymentTransaction getByOrderId(String orderId) {
        return paymentTransactionRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentTransaction", orderId));
    }

    private boolean verifyWebhookSignature(String body, String signatureHeader, String secret) {
        try {
            if (signatureHeader == null || signatureHeader.isBlank()) {
                return false;
            }
            String expectedSignature = null;
            if (signatureHeader.contains("|")) {
                for (String part : signatureHeader.split("\\|")) {
                    if (part.startsWith("v1=")) {
                        expectedSignature = part.substring(3);
                        break;
                    }
                }
            } else {
                expectedSignature = signatureHeader;
            }
            if (expectedSignature == null || expectedSignature.isBlank()) {
                return false;
            }

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            String computedSignature = sb.toString();

            return MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), computedSignature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Webhook signature verification error: {}", e.getMessage());
            return false;
        }
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
}
