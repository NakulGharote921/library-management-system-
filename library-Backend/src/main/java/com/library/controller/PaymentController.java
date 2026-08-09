package com.library.controller;

import com.library.dto.OrderResponseDto;
import com.library.entity.PaymentTransaction;
import com.library.entity.User;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

@PostMapping("/create-order")
    public ResponseEntity<OrderResponseDto> createOrder(Authentication auth,
                                                            @RequestBody Map<String, Object> body) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        Long fineId = parseLong(body.get("fineId"));
        if (fineId == null) {
            return ResponseEntity.badRequest().build();
        }
        String paymentType = parseString(body.get("paymentType"), PaymentTransaction.TYPE_FINE);
        log.info("User {} creating payment order for fine id={}", user.getEmail(), fineId);
        OrderResponseDto order = paymentService.createOrder(user, fineId, paymentType);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/create-subscription-order")
    public ResponseEntity<OrderResponseDto> createSubscriptionOrder(Authentication auth,
                                                                            @RequestBody Map<String, Object> body) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        Long subscriptionId = parseLong(body.get("subscriptionId"));
        if (subscriptionId == null) {
            return ResponseEntity.badRequest().build();
        }
        log.info("User {} creating subscription payment order for subscription id={}", user.getEmail(), subscriptionId);
        OrderResponseDto order = paymentService.createSubscriptionOrder(user, subscriptionId);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/verify")
    public ResponseEntity<PaymentTransaction> verifyPayment(@RequestBody Map<String, String> body) {
        String orderId = body.get("razorpay_order_id");
        String paymentId = body.get("razorpay_payment_id");
        String signature = body.get("razorpay_signature");
        if (orderId == null || paymentId == null || signature == null) {
            log.warn("Payment verify request missing fields: orderId={}, paymentId={}, signature={}",
                    orderId != null, paymentId != null, signature != null);
            throw new BusinessException("Missing required payment verification fields");
        }
        PaymentTransaction transaction = paymentService.verifyPayment(orderId, paymentId, signature);
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/my")
    public List<PaymentTransaction> myTransactions(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        return paymentService.getUserTransactions(user);
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<PaymentTransaction> getByOrderId(@PathVariable String orderId, Authentication auth) {
        PaymentTransaction transaction = paymentService.getByOrderId(orderId);
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN && !transaction.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentTransaction> getById(@PathVariable Long id, Authentication auth) {
        PaymentTransaction transaction = paymentService.getById(id);
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        if (user.getRole() != User.Role.ADMIN && !transaction.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/history")
    public ResponseEntity<List<PaymentTransaction>> history(
            Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentType) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        List<PaymentTransaction> transactions = paymentService.getFilteredTransactions(user, status, paymentType);
        return ResponseEntity.ok(transactions);
    }

    @PostMapping("/{orderId}/failed")
    public ResponseEntity<PaymentTransaction> markFailed(@PathVariable String orderId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        PaymentTransaction transaction = paymentService.markPaymentFailed(user, orderId);
        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(HttpServletRequest request) {
        try {
            BufferedReader reader = request.getReader();
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            String rawBody = sb.toString();
            String signature = request.getHeader("X-Razorpay-Signature");

            log.info("Webhook received, signature present: {}", signature != null);

            if (signature == null || signature.isEmpty()) {
                log.warn("Webhook missing X-Razorpay-Signature header");
                return ResponseEntity.badRequest().body("Missing signature");
            }
            if (rawBody.isBlank()) {
                log.warn("Webhook received empty body");
                return ResponseEntity.badRequest().body("Empty body");
            }

            paymentService.handleWebhook(rawBody, signature);
            return ResponseEntity.ok("received");
        } catch (Exception e) {
            log.error("Webhook processing failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("ignored");
        }
    }

    private Long parseLong(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof Number) {
            return ((Number) obj).longValue();
        }
        try {
            return Long.parseLong(obj.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String parseString(Object obj, String defaultValue) {
        if (obj == null) {
            return defaultValue;
        }
        String value = obj.toString().trim();
        return value.isEmpty() ? defaultValue : value;
    }
}
