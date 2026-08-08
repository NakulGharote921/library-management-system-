-- ============================================================
-- NULL Data Fix Migration — Library Management System
-- Run once against the existing database (local + production).
-- Backfills legacy NULLs, then enforces NOT NULL constraints.
-- ============================================================

-- 1) users.enrollment_date : every member is enrolled on the day their
--    account was created. Legacy rows have NULL because registration
--    never set the value.
UPDATE users
SET enrollment_date = DATE(created_at)
WHERE enrollment_date IS NULL;

-- 2) wishlist_items.notify_when_available : entity default is false;
--    legacy rows predate the default.
UPDATE wishlist_items
SET notify_when_available = b'0'
WHERE notify_when_available IS NULL;

-- 3) issued_books.due_date : legacy loans without a due date get the
--    default loan window (14 days) so overdue detection works.
UPDATE issued_books
SET due_date = DATE_ADD(issue_date, INTERVAL 14 DAY)
WHERE due_date IS NULL;

-- 4) reading_history.due_date : mirror of the loan due date.
UPDATE reading_history rh
JOIN issued_books ib ON rh.issued_book_id = ib.id
SET rh.due_date = ib.due_date
WHERE rh.due_date IS NULL;

-- 5) borrow_requests : one-time safety net for any legacy request rows
--    (current code always sets these, DB already enforces NOT NULL).
UPDATE borrow_requests
SET borrow_start_date = DATE(request_date)
WHERE borrow_start_date IS NULL;

UPDATE borrow_requests br
JOIN user_subscriptions us ON br.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
SET br.due_date = DATE_ADD(br.borrow_start_date, INTERVAL sp.max_loan_days DAY)
WHERE br.due_date IS NULL;

-- ============================================================
-- Enforce constraints (run only after the backfills above succeed)
-- ============================================================
ALTER TABLE users MODIFY enrollment_date DATE NOT NULL;
ALTER TABLE issued_books MODIFY due_date DATE NOT NULL;
ALTER TABLE reading_history MODIFY due_date DATE NOT NULL;
ALTER TABLE wishlist_items MODIFY notify_when_available BIT(1) NOT NULL DEFAULT b'0';
