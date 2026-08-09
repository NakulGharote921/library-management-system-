package com.library.controller;

import com.library.entity.PaymentTransaction;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

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
}
