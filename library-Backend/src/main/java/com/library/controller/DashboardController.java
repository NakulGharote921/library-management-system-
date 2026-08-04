package com.library.controller;

import com.library.dto.DashboardStatsDto;
import com.library.entity.User;
import com.library.repository.UserRepository;
import com.library.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    public DashboardStatsDto stats(Principal principal) {
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new com.library.exception.ResourceNotFoundException("User", principal.getName()));
        if (user.getRole() == User.Role.MEMBER) {
            return dashboardService.getMemberDashboardStats(principal.getName());
        }
        return dashboardService.getDashboardStats();
    }
}
