package com.library.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reading_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingHistory {

    public static final String STATUS_BORROWED = "BORROWED";
    public static final String STATUS_RETURNED = "RETURNED";
    public static final String STATUS_OVERDUE = "OVERDUE";
    public static final String STATUS_LOST = "LOST";
    public static final String STATUS_DAMAGED = "DAMAGED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_book_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private IssuedBook issuedBook;

    @Column(nullable = false)
    private LocalDate borrowDate;

    @Column(nullable = false)
    private LocalDate dueDate;

    private LocalDate returnDate;

    private Integer daysBorrowed;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = STATUS_BORROWED;

    @Column(precision = 10, scale = 2)
    private BigDecimal fineAmount;

    @Column(length = 20)
    private String fineStatus;

    @Column(length = 50)
    private String membershipPlanName;

    @Min(1)
    @Max(5)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String review;

    private LocalDateTime reviewSubmittedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = STATUS_BORROWED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
