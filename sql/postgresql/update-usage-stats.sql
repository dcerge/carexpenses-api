-- ============================================================================
-- SAFE RECALCULATION OF USAGE STATS (Production-safe, Optimized)
-- 1. Calculate monthly from submissions (one pass through submissions)
-- 2. Calculate all-time by summing monthly records (much faster)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ACCOUNT_USAGE - Monthly records (from submissions)
-- ============================================================================
INSERT INTO formsubmits.account_usage (
  account_id,
  year_month,
  submissions_processed_qty,
  submissions_current_qty,
  files_processed_qty,
  files_current_qty,
  files_processed_size,
  files_current_size,
  created_at,
  updated_at
)
SELECT 
  f.account_id,
  TO_CHAR(s.submission_dttm AT TIME ZONE 'UTC', 'YYYYMM')::INTEGER AS year_month,
  COUNT(*) AS submissions_processed_qty,
  COUNT(*) FILTER (WHERE s.removed_at IS NULL) AS submissions_current_qty,
  COALESCE(SUM(s.files_cnt), 0) AS files_processed_qty,
  COALESCE(SUM(s.files_cnt) FILTER (WHERE s.removed_at IS NULL), 0) AS files_current_qty,
  COALESCE(SUM(s.files_size), 0) AS files_processed_size,
  COALESCE(SUM(s.files_size) FILTER (WHERE s.removed_at IS NULL), 0) AS files_current_size,
  NOW() AS created_at,
  NOW() AS updated_at
FROM formsubmits.submissions s
JOIN formsubmits.forms f ON s.form_id = f.id
GROUP BY f.account_id, TO_CHAR(s.submission_dttm AT TIME ZONE 'UTC', 'YYYYMM')::INTEGER
ON CONFLICT (account_id, year_month) DO UPDATE SET
  submissions_processed_qty = EXCLUDED.submissions_processed_qty,
  submissions_current_qty = EXCLUDED.submissions_current_qty,
  files_processed_qty = EXCLUDED.files_processed_qty,
  files_current_qty = EXCLUDED.files_current_qty,
  files_processed_size = EXCLUDED.files_processed_size,
  files_current_size = EXCLUDED.files_current_size,
  updated_at = NOW();

-- ============================================================================
-- 2. ACCOUNT_USAGE - All-time totals (from monthly records, year_month != 0)
-- ============================================================================
INSERT INTO formsubmits.account_usage (
  account_id,
  year_month,
  submissions_processed_qty,
  submissions_current_qty,
  files_processed_qty,
  files_current_qty,
  files_processed_size,
  files_current_size,
  created_at,
  updated_at
)
SELECT 
  account_id,
  0 AS year_month,
  SUM(submissions_processed_qty) AS submissions_processed_qty,
  SUM(submissions_current_qty) AS submissions_current_qty,
  SUM(files_processed_qty) AS files_processed_qty,
  SUM(files_current_qty) AS files_current_qty,
  SUM(files_processed_size) AS files_processed_size,
  SUM(files_current_size) AS files_current_size,
  NOW() AS created_at,
  NOW() AS updated_at
FROM formsubmits.account_usage
WHERE year_month != 0
GROUP BY account_id
ON CONFLICT (account_id, year_month) DO UPDATE SET
  submissions_processed_qty = EXCLUDED.submissions_processed_qty,
  submissions_current_qty = EXCLUDED.submissions_current_qty,
  files_processed_qty = EXCLUDED.files_processed_qty,
  files_current_qty = EXCLUDED.files_current_qty,
  files_processed_size = EXCLUDED.files_processed_size,
  files_current_size = EXCLUDED.files_current_size,
  updated_at = NOW();

-- ============================================================================
-- 3. FORM_MONTHLY_USAGE - Monthly records (from submissions)
-- ============================================================================
INSERT INTO formsubmits.form_monthly_usage (
  form_id,
  account_id,
  year_month,
  submissions_processed_qty,
  submissions_current_qty,
  files_processed_qty,
  files_current_qty,
  files_processed_size,
  files_current_size,
  created_at,
  updated_at
)
SELECT 
  s.form_id,
  f.account_id,
  TO_CHAR(s.submission_dttm AT TIME ZONE 'UTC', 'YYYYMM')::INTEGER AS year_month,
  COUNT(*) AS submissions_processed_qty,
  COUNT(*) FILTER (WHERE s.removed_at IS NULL) AS submissions_current_qty,
  COALESCE(SUM(s.files_cnt), 0) AS files_processed_qty,
  COALESCE(SUM(s.files_cnt) FILTER (WHERE s.removed_at IS NULL), 0) AS files_current_qty,
  COALESCE(SUM(s.files_size), 0) AS files_processed_size,
  COALESCE(SUM(s.files_size) FILTER (WHERE s.removed_at IS NULL), 0) AS files_current_size,
  NOW() AS created_at,
  NOW() AS updated_at
FROM formsubmits.submissions s
JOIN formsubmits.forms f ON s.form_id = f.id
GROUP BY s.form_id, f.account_id, TO_CHAR(s.submission_dttm AT TIME ZONE 'UTC', 'YYYYMM')::INTEGER
ON CONFLICT (form_id, year_month) DO UPDATE SET
  submissions_processed_qty = EXCLUDED.submissions_processed_qty,
  submissions_current_qty = EXCLUDED.submissions_current_qty,
  files_processed_qty = EXCLUDED.files_processed_qty,
  files_current_qty = EXCLUDED.files_current_qty,
  files_processed_size = EXCLUDED.files_processed_size,
  files_current_size = EXCLUDED.files_current_size,
  updated_at = NOW();

-- ============================================================================
-- 4. FORM_MONTHLY_USAGE - All-time totals (from monthly records)
-- ============================================================================
INSERT INTO formsubmits.form_monthly_usage (
  form_id,
  account_id,
  year_month,
  submissions_processed_qty,
  submissions_current_qty,
  files_processed_qty,
  files_current_qty,
  files_processed_size,
  files_current_size,
  created_at,
  updated_at
)
SELECT 
  form_id,
  account_id,
  0 AS year_month,
  SUM(submissions_processed_qty) AS submissions_processed_qty,
  SUM(submissions_current_qty) AS submissions_current_qty,
  SUM(files_processed_qty) AS files_processed_qty,
  SUM(files_current_qty) AS files_current_qty,
  SUM(files_processed_size) AS files_processed_size,
  SUM(files_current_size) AS files_current_size,
  NOW() AS created_at,
  NOW() AS updated_at
FROM formsubmits.form_monthly_usage
WHERE year_month != 0
GROUP BY form_id, account_id
ON CONFLICT (form_id, year_month) DO UPDATE SET
  submissions_processed_qty = EXCLUDED.submissions_processed_qty,
  submissions_current_qty = EXCLUDED.submissions_current_qty,
  files_processed_qty = EXCLUDED.files_processed_qty,
  files_current_qty = EXCLUDED.files_current_qty,
  files_processed_size = EXCLUDED.files_processed_size,
  files_current_size = EXCLUDED.files_current_size,
  updated_at = NOW();

-- ============================================================================
-- 5. Verify results
-- ============================================================================
SELECT 'account_usage' AS table_name, COUNT(*) AS record_count FROM formsubmits.account_usage
UNION ALL
SELECT 'form_monthly_usage', COUNT(*) FROM formsubmits.form_monthly_usage;

COMMIT;