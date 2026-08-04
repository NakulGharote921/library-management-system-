package com.library.dto;

import com.library.entity.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MemberProfileDto(
        Long id,
        String name,
        String email,
        String phone,
        User.Role role,
        String status,
        boolean active,
        LocalDate enrollmentDate,
        LocalDateTime lastLogin,
        LocalDateTime createdAt,
        String membershipId,
        String subscriptionPlan,
        String subscriptionStatus,
        LocalDate subscriptionStart,
        LocalDate subscriptionEnd,
        BigDecimal outstandingFine,
        MemberStatsDto stats
) {
}
