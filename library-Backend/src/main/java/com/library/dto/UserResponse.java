package com.library.dto;

import com.library.entity.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String email,
        String phone,
        LocalDate enrollmentDate,
        User.Role role,
        boolean active,
        LocalDateTime lastLogin,
        String subscriptionPlan,
        long booksIssued,
        long reservations,
        long overdue,
        BigDecimal outstandingFine,
        String status,
        String membershipId
) {
}