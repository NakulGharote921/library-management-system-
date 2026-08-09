-- ============================================================
-- Fix Silver plan demo/junk data (features "hj", description "Nakul")
-- Idempotent - safe to run multiple times.
-- Run manually against the database (local + production).
-- ============================================================

-- Match by id first (live production id), fall back to name match.
UPDATE subscription_plans
SET features      = 'Unlimited catalog browsing
5 books at a time
30-day loan period
3 renewals
5 reservations
Priority notifications
Reading history
Wishlist',
    description   = 'Great value for regular readers',
    max_books     = 5,
    max_loan_days = 30,
    max_renewals  = 3,
    max_reservations = 5,
    priority_reservation = TRUE,
    fine_exempt   = TRUE
WHERE id = 2
   OR TRIM(name) = 'Silver';

-- Show the result
SELECT id, name, price, description, features, status
FROM subscription_plans
WHERE id = 2 OR TRIM(name) = 'Silver';
