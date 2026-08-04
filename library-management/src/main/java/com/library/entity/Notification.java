package com.library.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_user", columnList = "user_id"),
        @Index(name = "idx_notifications_user_read", columnList = "user_id, is_read")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    public static final String TYPE_RESERVATION_CREATED = "RESERVATION_CREATED";
    public static final String TYPE_RESERVATION_READY = "RESERVATION_READY";
    public static final String TYPE_RESERVATION_CANCELLED = "RESERVATION_CANCELLED";
    public static final String TYPE_RESERVATION_EXPIRED = "RESERVATION_EXPIRED";
    public static final String TYPE_RESERVATION_COMPLETED = "RESERVATION_COMPLETED";
    public static final String TYPE_PICKUP_REMINDER = "PICKUP_REMINDER";
    public static final String TYPE_FINE = "FINE";
    public static final String TYPE_BOOK_DUE = "BOOK_DUE";
    public static final String TYPE_MEMBERSHIP = "MEMBERSHIP";
    public static final String TYPE_RETURN_REQUESTED = "RETURN_REQUESTED";
    public static final String TYPE_RETURN_APPROVED = "RETURN_APPROVED";
    public static final String TYPE_BORROW_REQUESTED = "BORROW_REQUESTED";
    public static final String TYPE_BORROW_APPROVED = "BORROW_APPROVED";
    public static final String TYPE_BORROW_REJECTED = "BORROW_REJECTED";
    public static final String TYPE_BORROW_CANCELLED = "BORROW_CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(length = 200)
    private String link;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isRead == null) isRead = false;
    }
}
