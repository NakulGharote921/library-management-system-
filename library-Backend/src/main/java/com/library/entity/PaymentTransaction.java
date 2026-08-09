package com.library.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_REFUNDED = "REFUNDED";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String TYPE_FINE = "FINE";
    public static final String TYPE_SUBSCRIPTION = "SUBSCRIPTION";
    public static final String GATEWAY_CASHFREE = "CASHFREE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fine_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Fine fine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private UserSubscription subscription;

    @NotNull
    @Column(nullable = false, unique = true)
    private String orderId;

    private String paymentId;

    private String paymentSessionId;

    @Column(length = 20)
    @Builder.Default
    private String paymentGateway = GATEWAY_CASHFREE;

    @NotNull
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @NotNull
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = STATUS_PENDING;

    @Column(length = 20)
    @Builder.Default
    private String paymentType = TYPE_FINE;

    @Column(length = 20)
    private String paymentMethod;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = STATUS_PENDING;
        }
        if (currency == null) {
            currency = "INR";
        }
    }
}
