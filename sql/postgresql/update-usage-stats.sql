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