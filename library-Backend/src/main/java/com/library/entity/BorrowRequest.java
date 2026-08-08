package com.library.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "borrow_requests", indexes = {
        @Index(name = "idx_borrow_requests_status", columnList = "status"),
        @Index(name = "idx_borrow_requests_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BorrowRequest {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Book book;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = STATUS_PENDING;

    @Column(name = "request_date", nullable = false, updatable = false)
    private LocalDateTime requestDate;

    @NotNull
    @Column(name = "borrow_start_date", nullable = false)
    private LocalDate borrowStartDate;

    @NotNull
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "membership_plan_name", length = 100)
    private String membershipPlanName;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "decision_notes", length = 500)
    private String decisionNotes;

    @Column(name = "issued_book_id")
    private Long issuedBookId;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (requestDate == null) requestDate = LocalDateTime.now();
        if (status == null) status = STATUS_PENDING;
    }

    @PreUpdate
    protected void onUpdate() {
        if (status != null && !STATUS_PENDING.equals(status)) {
            if (decidedAt == null) decidedAt = LocalDateTime.now();
        }
    }
}