package com.library.controller;

import com.library.dto.AdminDashboardDto;
import com.library.dto.AnalyticsDto;
import com.library.entity.User;
import com.library.exception.ResourceNotFoundException;
import com.library.repository.UserRepository;
import com.library.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    private void requireAdmin(User user) {
        if (user.getRole() != User.Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("Forbidden");
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardDto> getAdminDashboard(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        requireAdmin(user);
        return ResponseEntity.ok(analyticsService.getAdminDashboard());
    }

    @GetMapping("/revenue")
    public ResponseEntity<List<AnalyticsDto.MonthlyRevenuePoint>> getMonthlyRevenue(
            Authentication auth,
            @RequestParam(defaultValue = "12") int months) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", auth.getName()));
        requireAdmin(user);
        int clamped = Math.max(1, Math.min(months, 24));
        return ResponseEntity.ok(analyticsService.getMonthlyRevenueSeries(clamped));
    }
}
