package com.library.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class AdminDashboardDto {
    long totalBooks;
    long totalMembers;
    long totalCopies;
    long availableCopies;
    long borrowedCopies;
    long activeLoans;
    long overdueBooks;
    long activeReservations;
    long waitingReservations;
    long activeSubscriptions;
    BigDecimal overdueRate;
    BigDecimal monthlyRevenue;
    BigDecimal totalRevenue;
}
