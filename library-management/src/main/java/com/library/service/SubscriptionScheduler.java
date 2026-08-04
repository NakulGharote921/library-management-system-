package com.library.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionService subscriptionService;

    @Scheduled(cron = "0 0 2 * * ?")
    public void processExpiredSubscriptions() {
        log.info("Running subscription expiration check...");
        try {
            subscriptionService.expireSubscriptions();
            log.info("Subscription expiration check completed");
        } catch (Exception e) {
            log.error("Subscription expiration check failed: {}", e.getMessage(), e);
        }
    }
}
