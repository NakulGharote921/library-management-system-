-- Legacy Razorpay columns left over in existing databases.
-- The entities no longer map them and Hibernate (ddl-auto=update) never drops columns,
-- so they are relaxed to NULL here. Idempotent; continue-on-error is enabled in
-- spring.sql.init so fresh databases without these columns start normally too.
ALTER TABLE payment_transactions MODIFY razorpay_order_id VARCHAR(255) NULL;
ALTER TABLE payment_transactions MODIFY razorpay_payment_id VARCHAR(255) NULL;
ALTER TABLE user_subscriptions MODIFY razorpay_order_id VARCHAR(255) NULL;
ALTER TABLE user_subscriptions MODIFY razorpay_payment_id VARCHAR(255) NULL;
