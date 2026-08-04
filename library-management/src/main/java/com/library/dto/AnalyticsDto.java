package com.library.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class AnalyticsDto {
    long totalBooks;
    long totalMembers;
    long activeLoans;
    long overdueLoans;
    double overdueRate;
    long activeSubscriptions;
    long silverSubscriptions;
    long goldSubscriptions;
    long premiumSubscriptions;
    long studentSubscriptions;
    BigDecimal monthlyRevenue;
    BigDecimal totalRevenue;
    List<MostBorrowedDto> mostBorrowed;

    @Value
    @Builder
    public static class MostBorrowedDto {
        String title;
        String author;
        long borrowed;
        int available;
    }

    @Value
    @Builder
    public static class MonthlyRevenuePoint {
        String month;
        BigDecimal revenue;
    }
}
