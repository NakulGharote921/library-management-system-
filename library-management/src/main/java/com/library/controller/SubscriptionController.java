package com.library.controller;

import com.library.entity.User;
import com.library.entity.UserSubscription;
import com.library.exception.BusinessException;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.repository.UserSubscriptionRepository;
import com.library.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

    @PostMapping("/purchase/{planId}")
    public ResponseEntity<UserSubscription> purchase(@PathVariable Long planId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        UserSubscription sub = subscriptionService.purchaseSubscription(user, planId);
        log.info("User {} purchased subscription plan id={}", user.getEmail(), planId);
        return ResponseEntity.ok(sub);
    }

    @PostMapping("/{subscriptionId}/activate")
    public ResponseEntity<UserSubscription> activate(
            @PathVariable Long subscriptionId,
            @RequestBody Map<String, String> body) {
        String orderId = body.get("razorpayOrderId");
        String paymentId = body.get("razorpayPaymentId");
        UserSubscription sub = subscriptionService.activateSubscription(subscriptionId, orderId, paymentId);
        log.info("Subscription id={} activated for user id={}", subscriptionId, sub.getUser().getId());
        return ResponseEntity.ok(sub);
    }

    @PostMapping("/{subscriptionId}/cancel")
    public ResponseEntity<Void> cancel(
            @PathVariable Long subscriptionId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        UserSubscription sub = userSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("UserSubscription", subscriptionId));
        if (!sub.getUser().getId().equals(user.getId()) && user.getRole() != User.Role.ADMIN) {
            throw new BusinessException("You can only cancel your own subscriptions");
        }
        subscriptionService.cancelSubscription(subscriptionId);
        log.info("User {} cancelled subscription id={}", user.getEmail(), subscriptionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    public List<UserSubscription> mySubscriptions(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        return subscriptionService.getUserSubscriptions(user);
    }

    @GetMapping("/active")
    public ResponseEntity<UserSubscription> activeSubscription(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        return subscriptionService.getActiveSubscription(user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
