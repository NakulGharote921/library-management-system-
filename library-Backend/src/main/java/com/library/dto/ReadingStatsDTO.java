package com.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingStatsDTO {
    private long totalBooksRead;
    private long currentlyBorrowed;
    private long returnedBooks;
    private long overdueReturns;
    private String favoriteGenre;
    private long totalReadingDays;
    private BigDecimal totalFinePaid;
    private double averageRating;
    private double averageBorrowDuration;
    private long onTimeReturns;
    private Map<String, Long> genreDistribution;
}
