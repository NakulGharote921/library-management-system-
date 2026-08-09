package com.library.service;

import com.library.entity.PaymentTransaction;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final List<String> COMPLETED_STATUSES = List.of(
            PaymentTransaction.STATUS_SUCCESS, PaymentTransaction.STATUS_REFUNDED);

    private final PaymentTransactionRepository paymentTransactionRepository;

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
}
