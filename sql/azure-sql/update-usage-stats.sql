-- ============================================================================
-- SAFE RECALCULATION OF USAGE STATS (Production-safe, Optimized)
-- Azure SQL Version
-- ============================================================================

BEGIN TRANSACTION;

-- ============================================================================
-- 1. ACCOUNT_USAGE - Monthly records (from submissions)
-- ============================================================================
MERGE formsubmits.account_usage AS target
USING (
  SELECT 
    f.account_id,
    YEAR(s.submission_dttm) * 100 + MONTH(s.submission_dttm) AS year_month,
    COUNT(*) AS submissions_processed_qty,
    SUM(CASE WHEN s.removed_at IS NULL THEN 1 ELSE 0 END) AS submissions_current_qty,
    ISNULL(SUM(s.files_cnt), 0) AS files_processed_qty,
    ISNULL(SUM(CASE WHEN s.removed_at IS NULL THEN s.files_cnt ELSE 0 END), 0) AS files_current_qty,
    ISNULL(SUM(s.files_size), 0) AS files_processed_size,
    ISNULL(SUM(CASE WHEN s.removed_at IS NULL THEN s.files_size ELSE 0 END), 0) AS files_current_size
  FROM formsubmits.submissions s
  JOIN formsubmits.forms f ON s.form_id = f.id
  GROUP BY f.account_id, YEAR(s.submission_dttm) * 100 + MONTH(s.submission_dttm)
) AS source
ON target.account_id = source.account_id AND target.year_month = source.year_month
WHEN MATCHED THEN
  UPDATE SET
    submissions_processed_qty = source.submissions_processed_qty,
    submissions_current_qty = source.submissions_current_qty,
    files_processed_qty = source.files_processed_qty,
    files_current_qty = source.files_current_qty,
    files_processed_size = source.files_processed_size,
    files_current_size = source.files_current_size,
    updated_at = GETUTCDATE()
WHEN NOT MATCHED THEN
  INSERT (
    account_id, year_month,
    submissions_processed_qty, submissions_current_qty,
    files_processed_qty, files_current_qty,
    files_processed_size, files_current_size,
    created_at, updated_at
  )
  VALUES (
    source.account_id, source.year_month,
    source.submissions_processed_qty, source.submissions_current_qty,
    source.files_processed_qty, source.files_current_qty,
    source.files_processed_size, source.files_current_size,
    GETUTCDATE(), GETUTCDATE()
  );

-- ============================================================================
-- 2. ACCOUNT_USAGE - All-time totals (from monthly records, year_month != 0)
-- ============================================================================
MERGE formsubmits.account_usage AS target
USING (
  SELECT 
    account_id,
    0 AS year_month,
    SUM(submissions_processed_qty) AS submissions_processed_qty,
    SUM(submissions_current_qty) AS submissions_current_qty,
    SUM(files_processed_qty) AS files_processed_qty,
    SUM(files_current_qty) AS files_current_qty,
    SUM(files_processed_size) AS files_processed_size,
    SUM(files_current_size) AS files_current_size
  FROM formsubmits.account_usage
  WHERE year_month != 0
  GROUP BY account_id
) AS source
ON target.account_id = source.account_id AND target.year_month = 0
WHEN MATCHED THEN
  UPDATE SET
    submissions_processed_qty = source.submissions_processed_qty,
    submissions_current_qty = source.submissions_current_qty,
    files_processed_qty = source.files_processed_qty,
    files_current_qty = source.files_current_qty,
    files_processed_size = source.files_processed_size,
    files_current_size = source.files_current_size,
    updated_at = GETUTCDATE()
WHEN NOT MATCHED THEN
  INSERT (
    account_id, year_month,
    submissions_processed_qty, submissions_current_qty,
    files_processed_qty, files_current_qty,
    files_processed_size, files_current_size,
    created_at, updated_at
  )
  VALUES (
    source.account_id, 0,
    source.submissions_processed_qty, source.submissions_current_qty,
    source.files_processed_qty, source.files_current_qty,
    source.files_processed_size, source.files_current_size,
    GETUTCDATE(), GETUTCDATE()
  );

-- ============================================================================
-- 3. FORM_MONTHLY_USAGE - Monthly records (from submissions)
-- ============================================================================
MERGE formsubmits.form_monthly_usage AS target
USING (
  SELECT 
    s.form_id,
    f.account_id,
    YEAR(s.submission_dttm) * 100 + MONTH(s.submission_dttm) AS year_month,
    COUNT(*) AS submissions_processed_qty,
    SUM(CASE WHEN s.removed_at IS NULL THEN 1 ELSE 0 END) AS submissions_current_qty,
    ISNULL(SUM(s.files_cnt), 0) AS files_processed_qty,
    ISNULL(SUM(CASE WHEN s.removed_at IS NULL THEN s.files_cnt ELSE 0 END), 0) AS files_current_qty,
    ISNULL(SUM(s.files_size), 0) AS files_processed_size,
    ISNULL(SUM(CASE WHEN s.removed_at IS NULL THEN s.files_size ELSE 0 END), 0) AS files_current_size
  FROM formsubmits.submissions s
  JOIN formsubmits.forms f ON s.form_id = f.id
  GROUP BY s.form_id, f.account_id, YEAR(s.submission_dttm) * 100 + MONTH(s.submission_dttm)
) AS source
ON target.form_id = source.form_id AND target.year_month = source.year_month
WHEN MATCHED THEN
  UPDATE SET
    submissions_processed_qty = source.submissions_processed_qty,
    submissions_current_qty = source.submissions_current_qty,
    files_processed_qty = source.files_processed_qty,
    files_current_qty = source.files_current_qty,
    files_processed_size = source.files_processed_size,
    files_current_size = source.files_current_size,
    updated_at = GETUTCDATE()
WHEN NOT MATCHED THEN
  INSERT (
    form_id, account_id, year_month,
    submissions_processed_qty, submissions_current_qty,
    files_processed_qty, files_current_qty,
    files_processed_size, files_current_size,
    created_at, updated_at
  )
  VALUES (
    source.form_id, source.account_id, source.year_month,
    source.submissions_processed_qty, source.submissions_current_qty,
    source.files_processed_qty, source.files_current_qty,
    source.files_processed_size, source.files_current_size,
    GETUTCDATE(), GETUTCDATE()
  );

-- ============================================================================
-- 4. FORM_MONTHLY_USAGE - All-time totals (from monthly records)
-- ============================================================================
MERGE formsubmits.form_monthly_usage AS target
USING (
  SELECT 
    form_id,
    account_id,
    0 AS year_month,
    SUM(submissions_processed_qty) AS submissions_processed_qty,
    SUM(submissions_current_qty) AS submissions_current_qty,
    SUM(files_processed_qty) AS files_processed_qty,
    SUM(files_current_qty) AS files_current_qty,
    SUM(files_processed_size) AS files_processed_size,
    SUM(files_current_size) AS files_current_size
  FROM formsubmits.form_monthly_usage
  WHERE year_month != 0
  GROUP BY form_id, account_id
) AS source
ON target.form_id = source.form_id AND target.year_month = 0
WHEN MATCHED THEN
  UPDATE SET
    submissions_processed_qty = source.submissions_processed_qty,
    submissions_current_qty = source.submissions_current_qty,
    files_processed_qty = source.files_processed_qty,
    files_current_qty = source.files_current_qty,
    files_processed_size = source.files_processed_size,
    files_current_size = source.files_current_size,
    updated_at = GETUTCDATE()
WHEN NOT MATCHED THEN
  INSERT (
    form_id, account_id, year_month,
    submissions_processed_qty, submissions_current_qty,
    files_processed_qty, files_current_qty,
    files_processed_size, files_current_size,
    created_at, updated_at
  )
  VALUES (
    source.form_id, source.account_id, 0,
    source.submissions_processed_qty, source.submissions_current_qty,
    source.files_processed_qty, source.files_current_qty,
    source.files_processed_size, source.files_current_size,
    GETUTCDATE(), GETUTCDATE()
  );

-- ============================================================================
-- 5. Verify results
-- ============================================================================
SELECT 'account_usage' AS table_name, COUNT(*) AS record_count FROM formsubmits.account_usage
UNION ALL
SELECT 'form_monthly_usage', COUNT(*) FROM formsubmits.form_monthly_usage;

COMMIT;