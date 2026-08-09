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
            "ALTER TABLE payment_transactions MODIFY razorpay_order_id VARCHAR(255) NULL",
            "ALTER TABLE payment_transactions MODIFY razorpay_payment_id VARCHAR(255) NULL",
            "ALTER TABLE user_subscriptions MODIFY razorpay_order_id VARCHAR(255) NULL",
            "ALTER TABLE user_subscriptions MODIFY razorpay_payment_id VARCHAR(255) NULL"
    );

    private final JdbcTemplate jdbcTemplate;

    public LegacySchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void migrate() {
        log.info("Legacy schema migration: checking for leftover Razorpay columns");
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
    }
}
