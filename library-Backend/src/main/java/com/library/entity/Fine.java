package com.library.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fine {

    public static final String STATUS_UNPAID = "UNPAID";
    public static final String STATUS_PAID = "PAID";
    public static final String STATUS_WAIVED = "WAIVED";

    public static final String REASON_OVERDUE = "OVERDUE";
    public static final String REASON_DAMAGED = "DAMAGED";
    public static final String REASON_LOST = "LOST";
    public static final String REASON_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issued_book_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private IssuedBook issuedBook;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @NotNull
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @NotNull
    @Column(nullable = false, length = 20)
    private String reason;

    @NotNull
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = STATUS_UNPAID;

    private Long waivedBy;

    @Column(columnDefinition = "TEXT")
    private String waivedReason;

    private LocalDateTime waivedDate;

    private LocalDateTime paidDate;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = STATUS_UNPAID;
        }
    }
}
