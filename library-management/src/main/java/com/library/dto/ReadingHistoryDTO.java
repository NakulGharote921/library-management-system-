package com.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingHistoryDTO {
    private Long id;
    private Long userId;
    private String userName;
    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookIsbn;
    private String bookCategory;
    private String bookCoverImageUrl;
    private Long issuedBookId;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    private Integer daysBorrowed;
    private String status;
    private BigDecimal fineAmount;
    private String fineStatus;
    private String membershipPlanName;
    private Integer rating;
    private String review;
    private LocalDateTime reviewSubmittedAt;
    private LocalDateTime createdAt;
}
