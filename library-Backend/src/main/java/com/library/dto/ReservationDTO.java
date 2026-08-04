package com.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDTO {
    private Long id;
    private String reservationNumber;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookIsbn;
    private String bookPublisher;
    private String bookCoverImageUrl;
    private String bookShelf;
    private String bookCategory;
    private LocalDateTime reservationDate;
    private Integer queuePosition;
    private String status;
    private LocalDateTime pickupExpiryDate;
    private LocalDateTime completedAt;
    private Boolean notificationSent;
    private String membershipPlanName;
    private Integer estimatedWaitDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long loanId;
}
