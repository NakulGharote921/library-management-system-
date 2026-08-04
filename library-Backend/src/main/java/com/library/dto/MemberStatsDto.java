package com.library.dto;

import java.math.BigDecimal;

public record MemberStatsDto(
        long booksIssued,
        long booksReturned,
        long overdueBooks,
        long activeReservations,
        long waitingReservations,
        long readyReservations,
        long completedReservations,
        long pendingBorrowRequests,
        long unpaidFines,
        BigDecimal outstandingFine,
        BigDecimal totalFine,
        long totalPayments,
        BigDecimal totalPaymentsAmount
) {
}
