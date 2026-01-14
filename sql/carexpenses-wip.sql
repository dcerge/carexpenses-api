update ms_auth.account set status = 100 
update ms_auth.user set status = 100, space_id = 'carexpenses'
update carexpenses.cars set status = 100 where status = 10
update carexpenses.expense_bases set status = 100 where status = 10
update carexpenses.entity_attachments set status = 100 where status = 10
update carexpenses.expense_labels set status = 100, normalized_name = trim(lower(label_name))
update carexpenses.expense_tags set status = 100, normalized_name = trim(lower(tag_name))
update carexpenses.travels set status = 100 where status = 10

-- Populate user account table
DELETE FROM ms_auth.user_account 
WHERE space_id = 'carexpenses';

-- Insert user_account records from user table
INSERT INTO ms_auth.user_account (
    space_id,
    user_id,
    account_id,
    user_role_id,
    status,
    created_at,
    updated_at
)
SELECT 
    'carexpenses' AS space_id,
    u.id AS user_id,
    u."Account_id"::uuid AS account_id,
    '54dfb3ec-7942-4b65-ba51-5ae62e79c860'::uuid AS user_role_id,
    100 AS status,
    u.created_at,
    u.updated_at
FROM ms_auth."user" u
WHERE u.space_id = 'carexpenses'
  AND u."Account_id" IS NOT NULL
  AND u."Account_id" != ''
  AND u.removed_at IS NULL;


-- Delete existing initial login records (attempt_no = 0) to allow re-running
DELETE FROM ms_auth.user_login_history 
WHERE space_id = 'carexpenses';

-- Insert initial login history from user table
INSERT INTO ms_auth.user_login_history (
    space_id,
    user_id,
    attempt_no,
    ip_address,
    country,
    status,
    created_at,
    updated_at
)
SELECT 
    'carexpenses' AS space_id,
    u.id AS user_id,
    0 AS attempt_no,
    COALESCE(u."IP_Address", 'unknown') AS ip_address,
    u.country,
    100 AS status,
    COALESCE(u.last_login_on, u.created_at) AS created_at,
    COALESCE(u.last_login_on, u.created_at) AS updated_at
FROM ms_auth."user" u
WHERE u.space_id = 'carexpenses'
  AND u.removed_at IS NULL;


UPDATE carexpenses.cars c
SET 
    entity_attachment_id = ea.id
FROM carexpenses.entity_attachments ea
WHERE c.entity_attachment_orig_id = ea.orig_id;


UPDATE carexpenses.expense_bases eb
SET 
    car_id = c.id
FROM carexpenses.cars c
WHERE eb.car_orig_id = c.orig_id
  AND c.orig_id IS NOT NULL;

UPDATE carexpenses.expense_bases eb
SET 
    travel_id = t.id
FROM carexpenses.travels t
WHERE eb.travel_orig_id = t.orig_id
  AND t.orig_id IS NOT NULL;

UPDATE carexpenses.expense_bases eb
SET 
    label_id = t.id
FROM carexpenses.expense_labels t
WHERE eb.label_orig_id = t.orig_id
  AND t.orig_id IS NOT NULL;


UPDATE carexpenses.service_interval_accounts sia
SET 
    car_id = c.id
FROM carexpenses.cars c
WHERE sia.car_orig_id = c.orig_id
  AND c.orig_id IS NOT NULL;

UPDATE carexpenses.service_interval_nexts sin
SET 
    car_id = c.id
FROM carexpenses.cars c
WHERE sin.car_orig_id = c.orig_id
  AND c.orig_id IS NOT NULL;

UPDATE carexpenses.travels t
SET 
    car_id = c.id
FROM carexpenses.cars c
WHERE t.car_orig_id = c.orig_id
  AND c.orig_id IS NOT NULL;

UPDATE carexpenses.travels t
SET 
    label_id = el.id
FROM carexpenses.expense_labels el
WHERE t.label_orig_id = el.orig_id
  AND el.orig_id IS NOT NULL;

UPDATE carexpenses.user_notifications un
SET 
    car_id = c.id
FROM carexpenses.cars c
WHERE un.car_orig_id = c.orig_id
  AND c.orig_id IS NOT NULL;

UPDATE carexpenses.entity_attachments ea
SET 
    car_id = c.id
FROM carexpenses.cars c
WHERE ea.car_orig_id = c.orig_id
  AND c.orig_id IS NOT NULL;

UPDATE carexpenses.entity_attachments ea
SET 
    account_id = ua.account_id
FROM ms_auth.user_account ua
WHERE ea.user_id = ua.user_id;

UPDATE carexpenses.entity_entity_attachments eea
SET 
    entity_attachment_id = ea.id
FROM carexpenses.entity_attachments ea
WHERE eea.entity_attachment_orig_id = ea.orig_id;

UPDATE carexpenses.entity_entity_attachments eea
   set entity_id = NULL


-- Entity type: 0 - Expenses, 2 - Car, 1 - ?
UPDATE carexpenses.entity_entity_attachments eea
SET 
    entity_id = c.id
FROM carexpenses.cars c
WHERE eea.entity_orig_id = c.orig_id
  and eea.entity_type_id = 2;


UPDATE carexpenses.entity_entity_attachments eea
SET 
    entity_id = eb.id
FROM carexpenses.expense_bases eb
WHERE eea.entity_orig_id = eb.orig_id
  and eea.entity_type_id in (0);

UPDATE carexpenses.entity_entity_attachments eea
SET 
    entity_id = t.id
FROM carexpenses.travels t
WHERE eea.entity_orig_id = t.orig_id
  and eea.entity_type_id in (4);


-- Normalizing IDs of expenses and refuelds with expense_bases

-- ============================================================
-- Update expenses.id to match expense_bases.id based on orig_id
-- ============================================================
UPDATE carexpenses.expenses exp
SET id = eb.id
FROM carexpenses.expense_bases eb
WHERE exp.orig_id = eb.orig_id
  AND exp.orig_id IS NOT NULL
  AND eb.orig_id IS NOT NULL
  AND exp.id != eb.id;

-- ============================================================
-- Update refuels.id to match expense_bases.id based on orig_id
-- ============================================================
UPDATE carexpenses.refuels ref
SET id = eb.id
FROM carexpenses.expense_bases eb
WHERE ref.orig_id = eb.orig_id
  AND ref.orig_id IS NOT NULL
  AND eb.orig_id IS NOT NULL
  AND ref.id != eb.id;


-- Verify the fix worked
SELECT 
    'expenses' AS table_name,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE e.id = eb.id) AS ids_matched,
    COUNT(*) FILTER (WHERE e.id != eb.id) AS ids_mismatched
FROM carexpenses.expenses e
JOIN carexpenses.expense_bases eb ON e.orig_id = eb.orig_id
WHERE e.orig_id IS NOT NULL

UNION ALL

SELECT 
    'refuels' AS table_name,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE r.id = eb.id) AS ids_matched,
    COUNT(*) FILTER (WHERE r.id != eb.id) AS ids_mismatched
FROM carexpenses.refuels r
JOIN carexpenses.expense_bases eb ON r.orig_id = eb.orig_id
WHERE r.orig_id IS NOT NULL;

--- STATS UPDATES

-- ============================================================
-- Step 1: Clear existing data (allows re-running)
-- ============================================================
DELETE FROM carexpenses.car_monthly_expenses;
DELETE FROM carexpenses.car_monthly_summaries;

-- ============================================================
-- Step 2: Populate car_monthly_summaries
-- ============================================================
INSERT INTO carexpenses.car_monthly_summaries (
    car_id,
    home_currency,
    year,
    month,
    start_mileage,
    end_mileage,
    refuels_count,
    expenses_count,
    refuel_taxes,
    refuels_cost,
    expenses_fees,
    expenses_taxes,
    expenses_cost,
    refuels_volume,
    first_record_at,
    last_record_at,
    updated_at
)
SELECT 
    eb.car_id,
    COALESCE(eb.home_currency, eb.paid_in_currency) AS home_currency,
    EXTRACT(YEAR FROM eb.when_done)::int AS year,
    EXTRACT(MONTH FROM eb.when_done)::int AS month,
    -- Mileage: get from first and last record of the month (default to 0)
    COALESCE(MIN(eb.odometer) FILTER (WHERE eb.odometer IS NOT NULL), 0) AS start_mileage,
    COALESCE(MAX(eb.odometer) FILTER (WHERE eb.odometer IS NOT NULL), 0) AS end_mileage,
    -- Counts
    COUNT(*) FILTER (WHERE r.id IS NOT NULL) AS refuels_count,
    COUNT(*) FILTER (WHERE e.id IS NOT NULL) AS expenses_count,
    -- Refuel costs
    SUM(eb.tax) FILTER (WHERE r.id IS NOT NULL) AS refuel_taxes,
    SUM(COALESCE(eb.total_price_in_hc, eb.total_price)) FILTER (WHERE r.id IS NOT NULL) AS refuels_cost,
    -- Expense costs
    SUM(eb.fees) FILTER (WHERE e.id IS NOT NULL) AS expenses_fees,
    SUM(eb.tax) FILTER (WHERE e.id IS NOT NULL) AS expenses_taxes,
    SUM(COALESCE(eb.total_price_in_hc, eb.total_price)) FILTER (WHERE e.id IS NOT NULL) AS expenses_cost,
    -- Refuel volume
    COALESCE(SUM(r.refuel_volume), 0) AS refuels_volume,
    -- Date range
    MIN(eb.when_done) AS first_record_at,
    MAX(eb.when_done) AS last_record_at,
    CURRENT_TIMESTAMP AS updated_at
FROM carexpenses.expense_bases eb
LEFT JOIN carexpenses.refuels r ON r.id = eb.id
LEFT JOIN carexpenses.expenses e ON e.id = eb.id
WHERE eb.car_id IS NOT NULL
  AND eb.status = 100
  AND eb.removed_at IS NULL
GROUP BY 
    eb.car_id, 
    COALESCE(eb.home_currency, eb.paid_in_currency), 
    EXTRACT(YEAR FROM eb.when_done)::int, 
    EXTRACT(MONTH FROM eb.when_done)::int;

-- ============================================================
-- Step 3: Populate car_monthly_expenses (detail by expense kind)
-- ============================================================
INSERT INTO carexpenses.car_monthly_expenses (
    car_monthly_summary_id,
    expense_kind_id,
    records_count,
    amount
)
SELECT 
    cms.id AS car_monthly_summary_id,
    e.kind_id AS expense_kind_id,
    COUNT(*) AS records_count,
    SUM(COALESCE(eb.total_price_in_hc, eb.total_price)) AS amount
FROM carexpenses.expense_bases eb
JOIN carexpenses.expenses e ON e.id = eb.id
JOIN carexpenses.car_monthly_summaries cms 
    ON cms.car_id = eb.car_id
    AND cms.home_currency = COALESCE(eb.home_currency, eb.paid_in_currency)
    AND cms.year = EXTRACT(YEAR FROM eb.when_done)::int
    AND cms.month = EXTRACT(MONTH FROM eb.when_done)::int
WHERE eb.car_id IS NOT NULL
  AND eb.status = 100
  AND eb.removed_at IS NULL
GROUP BY cms.id, e.kind_id;


--- 
-- ============================================================
-- Step 1: Clear existing data (allows re-running)
-- ============================================================
DELETE FROM carexpenses.car_total_expenses;
DELETE FROM carexpenses.car_total_summaries;

-- ============================================================
-- Step 2: Populate car_total_summaries
-- ============================================================
WITH latest_refuels AS (
    SELECT DISTINCT ON (eb.car_id, COALESCE(eb.home_currency, eb.paid_in_currency))
        eb.car_id,
        COALESCE(eb.home_currency, eb.paid_in_currency) AS home_currency,
        eb.id AS latest_refuel_id
    FROM carexpenses.expense_bases eb
    JOIN carexpenses.refuels r ON r.id = eb.id
    WHERE eb.car_id IS NOT NULL
      AND eb.status = 100
      AND eb.removed_at IS NULL
    ORDER BY eb.car_id, COALESCE(eb.home_currency, eb.paid_in_currency), eb.when_done DESC
),
latest_expenses AS (
    SELECT DISTINCT ON (eb.car_id, COALESCE(eb.home_currency, eb.paid_in_currency))
        eb.car_id,
        COALESCE(eb.home_currency, eb.paid_in_currency) AS home_currency,
        eb.id AS latest_expense_id
    FROM carexpenses.expense_bases eb
    JOIN carexpenses.expenses e ON e.id = eb.id
    WHERE eb.car_id IS NOT NULL
      AND eb.status = 100
      AND eb.removed_at IS NULL
    ORDER BY eb.car_id, COALESCE(eb.home_currency, eb.paid_in_currency), eb.when_done DESC
),
latest_travels AS (
    SELECT DISTINCT ON (t.car_id)
        t.car_id,
        t.id AS latest_travel_id
    FROM carexpenses.travels t
    WHERE t.car_id IS NOT NULL
      AND t.status = 100
      AND t.removed_at IS NULL
    ORDER BY t.car_id, COALESCE(t.last_dttm, t.first_dttm, t.created_at) DESC
),
aggregated AS (
    SELECT 
        eb.car_id,
        COALESCE(eb.home_currency, eb.paid_in_currency) AS home_currency,
        COALESCE(MAX(eb.odometer), 0) AS latest_known_mileage,
        COUNT(*) FILTER (WHERE r.id IS NOT NULL) AS total_refuels_count,
        COUNT(*) FILTER (WHERE e.id IS NOT NULL) AS total_expenses_count,
        SUM(eb.tax) FILTER (WHERE r.id IS NOT NULL) AS refuel_taxes,
        SUM(COALESCE(eb.total_price_in_hc, eb.total_price)) FILTER (WHERE r.id IS NOT NULL) AS total_refuels_cost,
        SUM(eb.fees) FILTER (WHERE e.id IS NOT NULL) AS expenses_fees,
        SUM(eb.tax) FILTER (WHERE e.id IS NOT NULL) AS expenses_taxes,
        SUM(COALESCE(eb.total_price_in_hc, eb.total_price)) FILTER (WHERE e.id IS NOT NULL) AS total_expenses_cost,
        COALESCE(SUM(r.refuel_volume), 0) AS total_refuels_volume,
        MIN(eb.when_done) AS first_record_at,
        MAX(eb.when_done) AS last_record_at
    FROM carexpenses.expense_bases eb
    LEFT JOIN carexpenses.refuels r ON r.id = eb.id
    LEFT JOIN carexpenses.expenses e ON e.id = eb.id
    WHERE eb.car_id IS NOT NULL
      AND eb.status = 100
      AND eb.removed_at IS NULL
    GROUP BY 
        eb.car_id, 
        COALESCE(eb.home_currency, eb.paid_in_currency)
)
INSERT INTO carexpenses.car_total_summaries (
    car_id,
    home_currency,
    latest_known_mileage,
    latest_refuel_id,
    latest_expense_id,
    latest_travel_id,
    total_refuels_count,
    total_expenses_count,
    refuel_taxes,
    total_refuels_cost,
    expenses_fees,
    expenses_taxes,
    total_expenses_cost,
    total_refuels_volume,
    first_record_at,
    last_record_at,
    updated_at
)
SELECT 
    a.car_id,
    a.home_currency,
    a.latest_known_mileage,
    lr.latest_refuel_id,
    le.latest_expense_id,
    lt.latest_travel_id,
    a.total_refuels_count,
    a.total_expenses_count,
    a.refuel_taxes,
    a.total_refuels_cost,
    a.expenses_fees,
    a.expenses_taxes,
    a.total_expenses_cost,
    a.total_refuels_volume,
    a.first_record_at,
    a.last_record_at,
    CURRENT_TIMESTAMP AS updated_at
FROM aggregated a
LEFT JOIN latest_refuels lr ON lr.car_id = a.car_id AND lr.home_currency = a.home_currency
LEFT JOIN latest_expenses le ON le.car_id = a.car_id AND le.home_currency = a.home_currency
LEFT JOIN latest_travels lt ON lt.car_id = a.car_id;

-- ============================================================
-- Step 3: Populate car_total_expenses (detail by expense kind)
-- ============================================================
INSERT INTO carexpenses.car_total_expenses (
    car_id,
    home_currency,
    expense_kind_id,
    records_count,
    amount
)
SELECT 
    eb.car_id,
    COALESCE(eb.home_currency, eb.paid_in_currency) AS home_currency,
    e.kind_id AS expense_kind_id,
    COUNT(*) AS records_count,
    SUM(COALESCE(eb.total_price_in_hc, eb.total_price)) AS amount
FROM carexpenses.expense_bases eb
JOIN carexpenses.expenses e ON e.id = eb.id
WHERE eb.car_id IS NOT NULL
  AND eb.status = 100
  AND eb.removed_at IS NULL
GROUP BY 
    eb.car_id, 
    COALESCE(eb.home_currency, eb.paid_in_currency),
    e.kind_id;


select "car_total_summaries"."car_id" 
from "carexpenses"."car_total_summaries" 
inner join "carexpenses"."cars" on "cars"."id" = "car_total_summaries"."car_id" and "cars"."account_id" = 'b6663f20-d05f-4461-9b09-e39141fb4488' 
order by "car_id" ASC limit 50