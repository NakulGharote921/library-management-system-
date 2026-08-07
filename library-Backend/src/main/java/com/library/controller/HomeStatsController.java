package com.library.controller;

import com.library.dto.HomeStatsDto;
import com.library.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class HomeStatsController {

    private final DashboardService dashboardService;

    @GetMapping("/home-stats")
    public HomeStatsDto homeStats() {
        return dashboardService.getHomeStats();
    }
}
