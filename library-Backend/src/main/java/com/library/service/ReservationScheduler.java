package com.library.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationScheduler {

    private final ReservationService reservationService;

    @Scheduled(cron = "0 0 */6 * * ?")
    public void expireOverduePickups() {
        log.info("Running scheduled task: expire overdue reservation pickups");
        try {
            reservationService.expireOverduePickups();
        } catch (Exception e) {
            log.error("Failed to expire overdue pickups: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "0 0 */3 * * ?")
    public void sendPickupReminders() {
        log.info("Running scheduled task: send pickup reminders");
        try {
            reservationService.sendPickupReminders();
        } catch (Exception e) {
            log.error("Failed to send pickup reminders: {}", e.getMessage(), e);
        }
    }
}
