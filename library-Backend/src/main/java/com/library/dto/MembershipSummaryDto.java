package com.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipSummaryDto {
    private String membershipName;
    private String status;
    private Integer allowedBooks;
    private Integer borrowedBooks;
    private Integer remainingBooks;
    private LocalDate startDate;
    private LocalDate expiryDate;
    private Long daysRemaining;
}
