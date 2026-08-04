package com.library.dto;

public record UsersOverviewDto(
        long totalMembers,
        long activeMembers,
        long inactiveMembers,
        long blockedMembers,
        long premiumMembers,
        long membersWithOverdueBooks
) {
}
