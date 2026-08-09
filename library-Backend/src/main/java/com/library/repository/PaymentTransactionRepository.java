package com.library.repository;

import com.library.entity.PaymentTransaction;
import com.library.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    List<PaymentTransaction> findByUserOrderByCreatedAtDesc(User user);

    List<PaymentTransaction> findByUserAndStatusInOrderByCreatedAtDesc(User user, Collection<String> statuses);

    Optional<PaymentTransaction> findByCashfreeOrderId(String cashfreeOrderId);

    Optional<PaymentTransaction> findByCashfreePaymentId(String cashfreePaymentId);

    Optional<PaymentTransaction> findFirstByFineIdAndStatusInOrderByCreatedAtDesc(Long fineId, Collection<String> statuses);

    Optional<PaymentTransaction> findFirstBySubscriptionIdAndStatusInOrderByCreatedAtDesc(Long subscriptionId, Collection<String> statuses);

    List<PaymentTransaction> findByStatusOrderByCreatedAtDesc(String status);

    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();

    List<PaymentTransaction> findByPaymentTypeOrderByCreatedAtDesc(String paymentType);

    List<PaymentTransaction> findByStatusAndPaymentTypeOrderByCreatedAtDesc(String status, String paymentType);

    List<PaymentTransaction> findByUserAndStatusOrderByCreatedAtDesc(User user, String status);

    List<PaymentTransaction> findByUserAndPaymentTypeOrderByCreatedAtDesc(User user, String paymentType);

    List<PaymentTransaction> findByUserAndStatusAndPaymentTypeOrderByCreatedAtDesc(User user, String status, String paymentType);
}
