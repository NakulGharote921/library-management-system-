package com.library.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class LegacySchemaMigration {

    private static final List<String> MIGRATIONS = List.of(
            "ALTER TABLE payment_transactions MODIFY order_id VARCHAR(255) NULL",
            "ALTER TABLE payment_transactions MODIFY payment_id VARCHAR(255) NULL",
            "ALTER TABLE payment_transactions MODIFY payment_session_id VARCHAR(255) NULL",
            "ALTER TABLE payment_transactions MODIFY payment_gateway VARCHAR(255) NULL",
            "ALTER TABLE user_subscriptions MODIFY order_id VARCHAR(255) NULL",
            "ALTER TABLE user_subscriptions MODIFY payment_id VARCHAR(255) NULL"
    );

    private final JdbcTemplate jdbcTemplate;

    public LegacySchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void migrate() {
        log.info("Legacy schema migration: checking for leftover Cashfree columns");
        for (String sql : MIGRATIONS) {
            String[] parts = sql.split(" ");
            String table = parts[2];
            String column = parts[4];
            Integer exists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.columns "
                            + "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
                    Integer.class, table, column);
            if (exists == null || exists == 0) {
                log.info("Schema migration: column {}.{} does not exist, skipping", table, column);
                continue;
            }
            try {
                jdbcTemplate.execute(sql);
                log.info("Schema migration applied: {}", sql);
            } catch (Exception e) {
                log.error("Schema migration FAILED for '{}': {}", sql, e.getMessage());
            }
        }
        cleanupOrphanedTransactions();
    }

    private void cleanupOrphanedTransactions() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM payment_transactions WHERE razorpay_order_id IS NULL AND status = 'PENDING'",
                    Integer.class);
            if (count != null && count > 0) {
                int deleted = jdbcTemplate.update(
                        "DELETE FROM payment_transactions WHERE razorpay_order_id IS NULL AND status = 'PENDING'");
                log.warn("Legacy cleanup: deleted {} orphaned PENDING transaction(s) without razorpayOrderId (leftover from the Cashfree migration)",
                        deleted);
            } else {
                log.info("Legacy cleanup: no orphaned PENDING transactions found");
            }
        } catch (Exception e) {
            log.error("Legacy cleanup FAILED: {}", e.getMessage());
        }
    }
}
