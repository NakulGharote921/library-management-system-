package com.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BorrowRequestDecisionInfo {
    private Long requestId;

    private Long memberId;
    private String memberName;
    private String memberEmail;

    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookIsbn;
    private String bookCoverImageUrl;

    private LocalDate borrowStartDate;
    private LocalDate dueDate;
    private String membershipPlanName;

    private int borrowLimit;
    private long booksCurrentlyBorrowed;
    private int availableCopies;
    private int totalCopies;
    private long outstandingFineCount;
    private BigDecimal outstandingFineAmount;

    private boolean canApprove;
    private List<String> warnings;
}
