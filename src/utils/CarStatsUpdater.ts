import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { TABLES, FIELDS } from '../database';
import { EXPENSE_TYPES } from '../boundary';

dayjs.extend(utc);

/**
 * Parameters for a single stats delta operation
 */
interface StatsOperationParams {
  recordId: string;
  carId: string;
  homeCurrency: string;
  expenseType: number;
  kindId?: number | null; // For expenses only
  whenDone: Date | string;
  odometer?: number | null;
  totalPriceInHc?: number | null;
  refuelVolume?: number | null; // For refuels only
  refuelTaxesHc?: number | null; // For refuels only
  expenseFeesHc?: number | null; // For expenses only
  expenseTaxesHc?: number | null; // For expenses only
}

/**
 * CarStatsUpdater handles incremental and full recalculation of car statistics.
 *
 * Design considerations:
 * - All methods are stateless and can be moved to async workers later
 * - Uses upsert pattern for summary records that may not exist
 * - Handles null values for amounts when currency conversion is pending
 * - Supports both incremental deltas and full recalculation
 *
 * Hybrid approach for accuracy:
 * - Counts and amounts: Pure delta math (always accurate)
 * - MIN/MAX fields (mileage, dates): Aggregate queries to ensure accuracy
 *   when values could change the MIN/MAX (updates, deletes)
 */
class CarStatsUpdater {
  private db: any;
  private schema: string;

  constructor(db: any, schema: string) {
    this.db = db;
    this.schema = schema;
  }

  // ===========================================================================
  // Public Methods - Delta Operations
  // ===========================================================================

  /**
   * Apply stats delta when a new record is created.
   * For CREATE: We can safely use GREATEST/LEAST for mileage/dates
   * since we're only adding, not potentially removing MAX/MIN values.
   */
  async onRecordCreated(params: StatsOperationParams): Promise<void> {
    const { carId, homeCurrency, expenseType, kindId, whenDone, odometer } = params;
    const { year, month } = this.parseYearMonth(this.getYearMonth(whenDone));

    // Update total summary with delta + GREATEST/LEAST for mileage/dates
    await this.updateTotalSummaryOnCreate(params);

    // Update total expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null) {
      await this.updateTotalExpenseDelta(carId, homeCurrency, kindId, 1, params.totalPriceInHc ?? null);
    }

    // Update monthly summary
    const monthlySummaryId = await this.updateMonthlySummaryOnCreate(params, year, month);

    // Update monthly expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && monthlySummaryId) {
      await this.updateMonthlyExpenseDelta(monthlySummaryId, kindId, 1, params.totalPriceInHc ?? null);
    }
  }

  /**
   * Apply stats delta when a record is removed.
   * For REMOVE: We must recalculate MIN/MAX fields since we might be
   * removing the value that determined the MIN or MAX.
   */
  async onRecordRemoved(params: StatsOperationParams): Promise<void> {
    const { carId, homeCurrency, expenseType, kindId, whenDone } = params;
    const { year, month } = this.parseYearMonth(this.getYearMonth(whenDone));

    // Update total summary: decrement counts/sums, then recalculate mileage/dates
    await this.updateTotalSummaryOnRemove(params);

    // Update total expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null) {
      await this.updateTotalExpenseDelta(carId, homeCurrency, kindId, -1, this.negate(params.totalPriceInHc));
    }

    // Update monthly summary: decrement counts/sums, then recalculate mileage/dates
    const monthlySummaryId = await this.updateMonthlySummaryOnRemove(params, year, month);

    // Update monthly expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && monthlySummaryId) {
      await this.updateMonthlyExpenseDelta(monthlySummaryId, kindId, -1, this.negate(params.totalPriceInHc));
    }
  }

  /**
   * Apply stats delta when a record is updated.
   * Handles cases where car, month, kind, or amounts change.
   */
  async onRecordUpdated(oldParams: StatsOperationParams, newParams: StatsOperationParams): Promise<void> {
    const carChanged = oldParams.carId !== newParams.carId;
    const currencyChanged = oldParams.homeCurrency !== newParams.homeCurrency;
    const monthChanged = this.getYearMonth(oldParams.whenDone) !== this.getYearMonth(newParams.whenDone);
    const kindChanged = oldParams.kindId !== newParams.kindId;

    // If structural change (car, currency, month, or kind), do remove + add
    if (carChanged || currencyChanged || monthChanged || kindChanged) {
      await this.onRecordRemoved(oldParams);
      await this.onRecordCreated(newParams);
      return;
    }

    // Otherwise, apply incremental delta for value changes only
    // For updates within same car/currency/month, we still need to recalculate
    // mileage/dates since the old value might have been MIN/MAX
    await this.applyValueDelta(oldParams, newParams);
  }

  // ===========================================================================
  // Public Methods - Full Recalculation (SQL-only approach)
  // ===========================================================================

  /**
   * Full recalculation of all stats for a specific car.
   * Uses SQL-only approach for efficiency - the database does all the work.
   *
   * @param carId - The car to recalculate stats for
   * @param homeCurrency - Optional: if provided, only recalculate for this currency
   */
  async recalculateCarStats(carId: string, homeCurrency?: string): Promise<void> {
    // Clear existing data for this car
    await this.clearCarSummaries(carId, homeCurrency);

    // Recalculate monthly summaries
    await this.recalculateMonthlySummaries(carId, homeCurrency);

    // Recalculate monthly expenses by kind
    await this.recalculateMonthlyExpenses(carId, homeCurrency);

    // Recalculate total summaries
    await this.recalculateTotalSummaries(carId, homeCurrency);

    // Recalculate total expenses by kind
    await this.recalculateTotalExpenses(carId, homeCurrency);
  }

  /**
   * Full recalculation of ALL car stats in the system.
   * Use with caution - this can be expensive for large datasets.
   */
  async recalculateAllStats(): Promise<void> {
    // Clear all existing data
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_EXPENSES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_EXPENSES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}`);

    // Recalculate all monthly summaries
    await this.recalculateMonthlySummaries();

    // Recalculate all monthly expenses
    await this.recalculateMonthlyExpenses();

    // Recalculate all total summaries
    await this.recalculateTotalSummaries();

    // Recalculate all total expenses
    await this.recalculateTotalExpenses();
  }

  // ===========================================================================
  // Private Methods - SQL Recalculation
  // ===========================================================================

  /**
   * Clear existing summary data for a car (optionally filtered by currency)
   */
  private async clearCarSummaries(carId: string, homeCurrency?: string): Promise<void> {
    const currencyFilter = homeCurrency ? ` AND ${FIELDS.HOME_CURRENCY} = ?` : '';
    const currencyBinding = homeCurrency ? [homeCurrency] : [];

    // Get monthly summary IDs first
    const monthlySummariesResult = await this.db.runRawQuery(
      `SELECT ${FIELDS.ID} FROM ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} 
       WHERE ${FIELDS.CAR_ID} = ?${currencyFilter}`,
      [carId, ...currencyBinding],
    );

    const monthlySummaryIds = (monthlySummariesResult?.rows || []).map((r: any) => r.id);

    // Delete monthly expenses
    if (monthlySummaryIds.length > 0) {
      const placeholders = monthlySummaryIds.map(() => '?').join(', ');
      await this.db.runRawQuery(
        `DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_EXPENSES} 
         WHERE ${FIELDS.CAR_MONTHLY_SUMMARY_ID} IN (${placeholders})`,
        monthlySummaryIds,
      );
    }

    // Delete monthly summaries
    await this.db.runRawQuery(
      `DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} 
       WHERE ${FIELDS.CAR_ID} = ?${currencyFilter}`,
      [carId, ...currencyBinding],
    );

    // Delete total expenses
    await this.db.runRawQuery(
      `DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_EXPENSES} 
       WHERE ${FIELDS.CAR_ID} = ?${currencyFilter}`,
      [carId, ...currencyBinding],
    );

    // Delete total summary
    await this.db.runRawQuery(
      `DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} 
       WHERE ${FIELDS.CAR_ID} = ?${currencyFilter}`,
      [carId, ...currencyBinding],
    );
  }

  /**
   * Recalculate and insert monthly summaries using SQL
   */
  private async recalculateMonthlySummaries(carId?: string, homeCurrency?: string): Promise<void> {
    const filters: string[] = [
      `eb.${FIELDS.CAR_ID} IS NOT NULL`,
      `eb.${FIELDS.STATUS} = 100`,
      `eb.${FIELDS.REMOVED_AT} IS NULL`,
    ];
    const bindings: any[] = [];

    if (carId) {
      filters.push(`eb.${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (homeCurrency) {
      filters.push(`COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?`);
      bindings.push(homeCurrency);
    }

    const whereClause = filters.join(' AND ');

    const sql = `
      INSERT INTO ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} (
        ${FIELDS.CAR_ID},
        ${FIELDS.HOME_CURRENCY},
        ${FIELDS.YEAR},
        ${FIELDS.MONTH},
        ${FIELDS.START_MILEAGE},
        ${FIELDS.END_MILEAGE},
        ${FIELDS.REFUELS_COUNT},
        ${FIELDS.EXPENSES_COUNT},
        ${FIELDS.REFUELS_TAXES},
        ${FIELDS.REFUELS_COST},
        ${FIELDS.EXPENSES_FEES},
        ${FIELDS.EXPENSES_TAXES},
        ${FIELDS.EXPENSES_COST},
        ${FIELDS.REFUELS_VOLUME},
        ${FIELDS.FIRST_RECORD_AT},
        ${FIELDS.LAST_RECORD_AT},
        ${FIELDS.UPDATED_AT}
      )
      SELECT 
        eb.${FIELDS.CAR_ID},
        COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int AS year,
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int AS month,
        COALESCE(MIN(eb.${FIELDS.ODOMETER}) FILTER (WHERE eb.${FIELDS.ODOMETER} IS NOT NULL), 0) AS start_mileage,
        COALESCE(MAX(eb.${FIELDS.ODOMETER}) FILTER (WHERE eb.${FIELDS.ODOMETER} IS NOT NULL), 0) AS end_mileage,
        COUNT(*) FILTER (WHERE r.${FIELDS.ID} IS NOT NULL) AS refuels_count,
        COUNT(*) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS expenses_count,
        SUM(eb.${FIELDS.TAX}) FILTER (WHERE r.${FIELDS.ID} IS NOT NULL) AS refuel_taxes,
        SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE r.${FIELDS.ID} IS NOT NULL) AS refuels_cost,
        SUM(eb.${FIELDS.FEES}) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS expenses_fees,
        SUM(eb.${FIELDS.TAX}) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS expenses_taxes,
        SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS expenses_cost,
        COALESCE(SUM(r.${FIELDS.REFUEL_VOLUME}), 0) AS refuels_volume,
        MIN(eb.${FIELDS.WHEN_DONE}) AS first_record_at,
        MAX(eb.${FIELDS.WHEN_DONE}) AS last_record_at,
        CURRENT_TIMESTAMP AS updated_at
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      LEFT JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      LEFT JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      WHERE ${whereClause}
      GROUP BY 
        eb.${FIELDS.CAR_ID}, 
        COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}), 
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int, 
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int
    `;

    await this.db.runRawQuery(sql, bindings);
  }

  /**
   * Recalculate and insert monthly expenses by kind using SQL
   */
  private async recalculateMonthlyExpenses(carId?: string, homeCurrency?: string): Promise<void> {
    const filters: string[] = [
      `eb.${FIELDS.CAR_ID} IS NOT NULL`,
      `eb.${FIELDS.STATUS} = 100`,
      `eb.${FIELDS.REMOVED_AT} IS NULL`,
    ];
    const bindings: any[] = [];

    if (carId) {
      filters.push(`eb.${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (homeCurrency) {
      filters.push(`cms.${FIELDS.HOME_CURRENCY} = ?`);
      bindings.push(homeCurrency);
    }

    const whereClause = filters.join(' AND ');

    const sql = `
      INSERT INTO ${this.schema}.${TABLES.CAR_MONTHLY_EXPENSES} (
        ${FIELDS.CAR_MONTHLY_SUMMARY_ID},
        ${FIELDS.EXPENSE_KIND_ID},
        ${FIELDS.RECORDS_COUNT},
        ${FIELDS.AMOUNT}
      )
      SELECT 
        cms.${FIELDS.ID} AS car_monthly_summary_id,
        e.${FIELDS.KIND_ID} AS expense_kind_id,
        COUNT(*) AS records_count,
        SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) AS amount
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      JOIN ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms 
        ON cms.${FIELDS.CAR_ID} = eb.${FIELDS.CAR_ID}
        AND cms.${FIELDS.HOME_CURRENCY} = COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY})
        AND cms.${FIELDS.YEAR} = EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int
        AND cms.${FIELDS.MONTH} = EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int
      WHERE ${whereClause}
      GROUP BY cms.${FIELDS.ID}, e.${FIELDS.KIND_ID}
    `;

    await this.db.runRawQuery(sql, bindings);
  }

  /**
   * Recalculate and insert total summaries using SQL
   */
  private async recalculateTotalSummaries(carId?: string, homeCurrency?: string): Promise<void> {
    const filters: string[] = [
      `eb.${FIELDS.CAR_ID} IS NOT NULL`,
      `eb.${FIELDS.STATUS} = 100`,
      `eb.${FIELDS.REMOVED_AT} IS NULL`,
    ];
    const bindings: any[] = [];

    if (carId) {
      filters.push(`eb.${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (homeCurrency) {
      filters.push(`COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?`);
      bindings.push(homeCurrency);
    }

    const whereClause = filters.join(' AND ');
    const carIdFilter = carId ? ` AND eb.${FIELDS.CAR_ID} = ?` : '';
    const currencyFilter = homeCurrency
      ? ` AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?`
      : '';

    // Build bindings for CTEs - each CTE needs its own copy of filters
    const cteBindings = carId ? [carId] : [];
    if (homeCurrency) cteBindings.push(homeCurrency);

    const sql = `
      WITH latest_refuels AS (
        SELECT DISTINCT ON (eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}))
          eb.${FIELDS.CAR_ID},
          COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
          eb.${FIELDS.ID} AS latest_refuel_id
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
        WHERE eb.${FIELDS.CAR_ID} IS NOT NULL
          AND eb.${FIELDS.STATUS} = 100
          AND eb.${FIELDS.REMOVED_AT} IS NULL
          ${carIdFilter}
          ${currencyFilter}
        ORDER BY eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}), eb.${FIELDS.WHEN_DONE} DESC
      ),
      latest_expenses AS (
        SELECT DISTINCT ON (eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}))
          eb.${FIELDS.CAR_ID},
          COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
          eb.${FIELDS.ID} AS latest_expense_id
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
        WHERE eb.${FIELDS.CAR_ID} IS NOT NULL
          AND eb.${FIELDS.STATUS} = 100
          AND eb.${FIELDS.REMOVED_AT} IS NULL
          ${carIdFilter}
          ${currencyFilter}
        ORDER BY eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}), eb.${FIELDS.WHEN_DONE} DESC
      ),
      latest_travels AS (
        SELECT DISTINCT ON (t.${FIELDS.CAR_ID})
          t.${FIELDS.CAR_ID},
          t.${FIELDS.ID} AS latest_travel_id
        FROM ${this.schema}.${TABLES.TRAVELS} t
        WHERE t.${FIELDS.CAR_ID} IS NOT NULL
          AND t.${FIELDS.STATUS} = 100
          AND t.${FIELDS.REMOVED_AT} IS NULL
          ${carId ? ` AND t.${FIELDS.CAR_ID} = ?` : ''}
        ORDER BY t.${FIELDS.CAR_ID}, COALESCE(t.${FIELDS.LAST_DTTM}, t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}) DESC
      ),
      aggregated AS (
        SELECT 
          eb.${FIELDS.CAR_ID},
          COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
          COALESCE(MAX(eb.${FIELDS.ODOMETER}), 0) AS latest_known_mileage,
          COUNT(*) FILTER (WHERE r.${FIELDS.ID} IS NOT NULL) AS total_refuels_count,
          COUNT(*) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS total_expenses_count,
          SUM(eb.${FIELDS.TAX}) FILTER (WHERE r.${FIELDS.ID} IS NOT NULL) AS refuel_taxes,
          SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE r.${FIELDS.ID} IS NOT NULL) AS total_refuels_cost,
          SUM(eb.${FIELDS.FEES}) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS expenses_fees,
          SUM(eb.${FIELDS.TAX}) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS expenses_taxes,
          SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL) AS total_expenses_cost,
          COALESCE(SUM(r.${FIELDS.REFUEL_VOLUME}), 0) AS total_refuels_volume,
          MIN(eb.${FIELDS.WHEN_DONE}) AS first_record_at,
          MAX(eb.${FIELDS.WHEN_DONE}) AS last_record_at
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        LEFT JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
        LEFT JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
        WHERE ${whereClause}
        GROUP BY 
          eb.${FIELDS.CAR_ID}, 
          COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY})
      )
      INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} (
        ${FIELDS.CAR_ID},
        ${FIELDS.HOME_CURRENCY},
        ${FIELDS.LATEST_KNOWN_MILEAGE},
        ${FIELDS.LATEST_REFUEL_ID},
        ${FIELDS.LATEST_EXPENSE_ID},
        ${FIELDS.LATEST_TRAVEL_ID},
        ${FIELDS.TOTAL_REFUELS_COUNT},
        ${FIELDS.TOTAL_EXPENSES_COUNT},
        ${FIELDS.REFUELS_TAXES},
        ${FIELDS.TOTAL_REFUELS_COST},
        ${FIELDS.EXPENSES_FEES},
        ${FIELDS.EXPENSES_TAXES},
        ${FIELDS.TOTAL_EXPENSES_COST},
        ${FIELDS.TOTAL_REFUELS_VOLUME},
        ${FIELDS.FIRST_RECORD_AT},
        ${FIELDS.LAST_RECORD_AT},
        ${FIELDS.UPDATED_AT}
      )
      SELECT 
        a.${FIELDS.CAR_ID},
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
      LEFT JOIN latest_refuels lr ON lr.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID} AND lr.home_currency = a.home_currency
      LEFT JOIN latest_expenses le ON le.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID} AND le.home_currency = a.home_currency
      LEFT JOIN latest_travels lt ON lt.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID}
    `;

    // Build bindings: CTE1 (refuels), CTE2 (expenses), CTE3 (travels), main aggregated
    const allBindings = [
      ...cteBindings, // latest_refuels
      ...cteBindings, // latest_expenses
      ...(carId ? [carId] : []), // latest_travels
      ...bindings, // aggregated
    ];

    await this.db.runRawQuery(sql, allBindings);
  }

  /**
   * Recalculate and insert total expenses by kind using SQL
   */
  private async recalculateTotalExpenses(carId?: string, homeCurrency?: string): Promise<void> {
    const filters: string[] = [
      `eb.${FIELDS.CAR_ID} IS NOT NULL`,
      `eb.${FIELDS.STATUS} = 100`,
      `eb.${FIELDS.REMOVED_AT} IS NULL`,
    ];
    const bindings: any[] = [];

    if (carId) {
      filters.push(`eb.${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (homeCurrency) {
      filters.push(`COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?`);
      bindings.push(homeCurrency);
    }

    const whereClause = filters.join(' AND ');

    const sql = `
      INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_EXPENSES} (
        ${FIELDS.CAR_ID},
        ${FIELDS.HOME_CURRENCY},
        ${FIELDS.EXPENSE_KIND_ID},
        ${FIELDS.RECORDS_COUNT},
        ${FIELDS.AMOUNT}
      )
      SELECT 
        eb.${FIELDS.CAR_ID},
        COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
        e.${FIELDS.KIND_ID} AS expense_kind_id,
        COUNT(*) AS records_count,
        SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) AS amount
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      WHERE ${whereClause}
      GROUP BY 
        eb.${FIELDS.CAR_ID}, 
        COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}),
        e.${FIELDS.KIND_ID}
    `;

    await this.db.runRawQuery(sql, bindings);
  }

  // ===========================================================================
  // Private Methods - Delta Operations for CREATE
  // ===========================================================================

  /**
   * Update total summary when a record is created.
   * Uses GREATEST/LEAST for mileage/dates since we're only adding values.
   */
  private async updateTotalSummaryOnCreate(params: StatsOperationParams): Promise<void> {
    const {
      recordId,
      carId,
      homeCurrency,
      expenseType,
      whenDone,
      odometer,
      totalPriceInHc,
      refuelVolume,
      refuelTaxesHc,
      expenseFeesHc,
      expenseTaxesHc,
    } = params;

    const whenDoneDate = dayjs.utc(whenDone).format('YYYY-MM-DD HH:mm:ss');
    const nowDate = dayjs.utc().format('YYYY-MM-DD HH:mm:ss');

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_TOTAL_SUMMARIES;

    // Build initial values for INSERT (first record case)
    const initialLatestKnownMileage = odometer ?? 0;
    const initialLatestRefuelId = expenseType === EXPENSE_TYPES.REFUEL ? recordId : null;
    const initialLatestExpenseId = expenseType === EXPENSE_TYPES.EXPENSE ? recordId : null;
    const initialTotalRefuelsCount = expenseType === EXPENSE_TYPES.REFUEL ? 1 : 0;
    const initialTotalExpensesCount = expenseType === EXPENSE_TYPES.EXPENSE ? 1 : 0;
    const initialRefuelsTaxes = expenseType === EXPENSE_TYPES.REFUEL ? refuelTaxesHc : null;
    const initialTotalRefuelsCost = expenseType === EXPENSE_TYPES.REFUEL ? totalPriceInHc : null;
    const initialExpensesFees = expenseType === EXPENSE_TYPES.EXPENSE ? expenseFeesHc : null;
    const initialExpensesTaxes = expenseType === EXPENSE_TYPES.EXPENSE ? expenseTaxesHc : null;
    const initialTotalExpensesCost = expenseType === EXPENSE_TYPES.EXPENSE ? totalPriceInHc : null;
    const initialTotalRefuelsVolume = expenseType === EXPENSE_TYPES.REFUEL ? refuelVolume : 0;

    // Build updates for ON CONFLICT (existing record case)
    const updates: string[] = [];
    const updateBindings: any[] = [];

    if (expenseType === EXPENSE_TYPES.REFUEL) {
      updates.push(`${FIELDS.TOTAL_REFUELS_COUNT} = COALESCE(${t}.${FIELDS.TOTAL_REFUELS_COUNT}, 0) + 1`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.TOTAL_REFUELS_COST} = COALESCE(${t}.${FIELDS.TOTAL_REFUELS_COST}, 0) + ?`);
        updateBindings.push(totalPriceInHc);
      }

      if (refuelVolume != null) {
        updates.push(`${FIELDS.TOTAL_REFUELS_VOLUME} = COALESCE(${t}.${FIELDS.TOTAL_REFUELS_VOLUME}, 0) + ?`);
        updateBindings.push(refuelVolume);
      }

      if (refuelTaxesHc != null) {
        updates.push(`${FIELDS.REFUELS_TAXES} = COALESCE(${t}.${FIELDS.REFUELS_TAXES}, 0) + ?`);
        updateBindings.push(refuelTaxesHc);
      }

      // Update latest refuel if this is newer
      updates.push(`${FIELDS.LATEST_REFUEL_ID} = CASE 
        WHEN ${t}.${FIELDS.LAST_RECORD_AT} IS NULL OR ? > ${t}.${FIELDS.LAST_RECORD_AT} THEN ?
        ELSE ${t}.${FIELDS.LATEST_REFUEL_ID}
      END`);
      updateBindings.push(whenDoneDate, recordId);
    } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
      updates.push(`${FIELDS.TOTAL_EXPENSES_COUNT} = COALESCE(${t}.${FIELDS.TOTAL_EXPENSES_COUNT}, 0) + 1`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.TOTAL_EXPENSES_COST} = COALESCE(${t}.${FIELDS.TOTAL_EXPENSES_COST}, 0) + ?`);
        updateBindings.push(totalPriceInHc);
      }

      if (expenseFeesHc != null) {
        updates.push(`${FIELDS.EXPENSES_FEES} = COALESCE(${t}.${FIELDS.EXPENSES_FEES}, 0) + ?`);
        updateBindings.push(expenseFeesHc);
      }

      if (expenseTaxesHc != null) {
        updates.push(`${FIELDS.EXPENSES_TAXES} = COALESCE(${t}.${FIELDS.EXPENSES_TAXES}, 0) + ?`);
        updateBindings.push(expenseTaxesHc);
      }

      // Update latest expense if this is newer
      updates.push(`${FIELDS.LATEST_EXPENSE_ID} = CASE 
        WHEN ${t}.${FIELDS.LAST_RECORD_AT} IS NULL OR ? > ${t}.${FIELDS.LAST_RECORD_AT} THEN ?
        ELSE ${t}.${FIELDS.LATEST_EXPENSE_ID}
      END`);
      updateBindings.push(whenDoneDate, recordId);
    }

    // Mileage - use GREATEST since we're adding
    if (odometer != null) {
      updates.push(`${FIELDS.LATEST_KNOWN_MILEAGE} = GREATEST(COALESCE(${t}.${FIELDS.LATEST_KNOWN_MILEAGE}, 0), ?)`);
      updateBindings.push(odometer);
    }

    // Date range - use LEAST/GREATEST since we're adding
    updates.push(`${FIELDS.FIRST_RECORD_AT} = LEAST(COALESCE(${t}.${FIELDS.FIRST_RECORD_AT}, ?), ?)`);
    updateBindings.push(whenDoneDate, whenDoneDate);
    updates.push(`${FIELDS.LAST_RECORD_AT} = GREATEST(COALESCE(${t}.${FIELDS.LAST_RECORD_AT}, ?), ?)`);
    updateBindings.push(whenDoneDate, whenDoneDate);

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    updateBindings.push(nowDate);

    const sql = `
      INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} (
        ${FIELDS.CAR_ID},
        ${FIELDS.HOME_CURRENCY},
        ${FIELDS.LATEST_KNOWN_MILEAGE},
        ${FIELDS.LATEST_REFUEL_ID},
        ${FIELDS.LATEST_EXPENSE_ID},
        ${FIELDS.TOTAL_REFUELS_COUNT},
        ${FIELDS.TOTAL_EXPENSES_COUNT},
        ${FIELDS.REFUELS_TAXES},
        ${FIELDS.TOTAL_REFUELS_COST},
        ${FIELDS.EXPENSES_FEES},
        ${FIELDS.EXPENSES_TAXES},
        ${FIELDS.TOTAL_EXPENSES_COST},
        ${FIELDS.TOTAL_REFUELS_VOLUME},
        ${FIELDS.FIRST_RECORD_AT},
        ${FIELDS.LAST_RECORD_AT},
        ${FIELDS.UPDATED_AT}
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY})
      DO UPDATE SET ${updates.join(', ')}
    `;

    const insertBindings = [
      carId,
      homeCurrency,
      initialLatestKnownMileage,
      initialLatestRefuelId,
      initialLatestExpenseId,
      initialTotalRefuelsCount,
      initialTotalExpensesCount,
      initialRefuelsTaxes,
      initialTotalRefuelsCost,
      initialExpensesFees,
      initialExpensesTaxes,
      initialTotalExpensesCost,
      initialTotalRefuelsVolume,
      whenDoneDate,
      whenDoneDate,
      nowDate,
    ];

    await this.db.runRawQuery(sql, [...insertBindings, ...updateBindings]);
  }

  /**
   * Update monthly summary when a record is created.
   * Returns the monthly summary ID for updating monthly expenses.
   */
  private async updateMonthlySummaryOnCreate(
    params: StatsOperationParams,
    year: number,
    month: number,
  ): Promise<string | null> {
    const {
      carId,
      homeCurrency,
      expenseType,
      whenDone,
      odometer,
      totalPriceInHc,
      refuelVolume,
      refuelTaxesHc,
      expenseFeesHc,
      expenseTaxesHc,
    } = params;

    const whenDoneDate = dayjs.utc(whenDone).format('YYYY-MM-DD HH:mm:ss');
    const nowDate = dayjs.utc().format('YYYY-MM-DD HH:mm:ss');

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_MONTHLY_SUMMARIES;

    // Build initial values for INSERT (first record case)
    const initialRefuelsCount = expenseType === EXPENSE_TYPES.REFUEL ? 1 : 0;
    const initialExpensesCount = expenseType === EXPENSE_TYPES.EXPENSE ? 1 : 0;
    const initialRefuelsCost = expenseType === EXPENSE_TYPES.REFUEL ? totalPriceInHc : null;
    const initialExpensesCost = expenseType === EXPENSE_TYPES.EXPENSE ? totalPriceInHc : null;
    const initialRefuelsVolume = expenseType === EXPENSE_TYPES.REFUEL ? refuelVolume : 0;
    const initialRefuelsTaxes = expenseType === EXPENSE_TYPES.REFUEL ? refuelTaxesHc : null;
    const initialExpensesFees = expenseType === EXPENSE_TYPES.EXPENSE ? expenseFeesHc : null;
    const initialExpensesTaxes = expenseType === EXPENSE_TYPES.EXPENSE ? expenseTaxesHc : null;

    // Build updates for ON CONFLICT (existing record case)
    const updates: string[] = [];
    const updateBindings: any[] = [];

    if (expenseType === EXPENSE_TYPES.REFUEL) {
      updates.push(`${FIELDS.REFUELS_COUNT} = COALESCE(${t}.${FIELDS.REFUELS_COUNT}, 0) + 1`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.REFUELS_COST} = COALESCE(${t}.${FIELDS.REFUELS_COST}, 0) + ?`);
        updateBindings.push(totalPriceInHc);
      }

      if (refuelVolume != null) {
        updates.push(`${FIELDS.REFUELS_VOLUME} = COALESCE(${t}.${FIELDS.REFUELS_VOLUME}, 0) + ?`);
        updateBindings.push(refuelVolume);
      }

      if (refuelTaxesHc != null) {
        updates.push(`${FIELDS.REFUELS_TAXES} = COALESCE(${t}.${FIELDS.REFUELS_TAXES}, 0) + ?`);
        updateBindings.push(refuelTaxesHc);
      }
    } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
      updates.push(`${FIELDS.EXPENSES_COUNT} = COALESCE(${t}.${FIELDS.EXPENSES_COUNT}, 0) + 1`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.EXPENSES_COST} = COALESCE(${t}.${FIELDS.EXPENSES_COST}, 0) + ?`);
        updateBindings.push(totalPriceInHc);
      }

      if (expenseFeesHc != null) {
        updates.push(`${FIELDS.EXPENSES_FEES} = COALESCE(${t}.${FIELDS.EXPENSES_FEES}, 0) + ?`);
        updateBindings.push(expenseFeesHc);
      }

      if (expenseTaxesHc != null) {
        updates.push(`${FIELDS.EXPENSES_TAXES} = COALESCE(${t}.${FIELDS.EXPENSES_TAXES}, 0) + ?`);
        updateBindings.push(expenseTaxesHc);
      }
    }

    // Mileage range - use LEAST/GREATEST
    if (odometer != null) {
      updates.push(`${FIELDS.START_MILEAGE} = LEAST(COALESCE(NULLIF(${t}.${FIELDS.START_MILEAGE}, 0), ?), ?)`);
      updateBindings.push(odometer, odometer);
      updates.push(`${FIELDS.END_MILEAGE} = GREATEST(COALESCE(${t}.${FIELDS.END_MILEAGE}, 0), ?)`);
      updateBindings.push(odometer);
    }

    // Date range
    updates.push(`${FIELDS.FIRST_RECORD_AT} = LEAST(COALESCE(${t}.${FIELDS.FIRST_RECORD_AT}, ?), ?)`);
    updateBindings.push(whenDoneDate, whenDoneDate);
    updates.push(`${FIELDS.LAST_RECORD_AT} = GREATEST(COALESCE(${t}.${FIELDS.LAST_RECORD_AT}, ?), ?)`);
    updateBindings.push(whenDoneDate, whenDoneDate);

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    updateBindings.push(nowDate);

    const sql = `
      INSERT INTO ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} (
        ${FIELDS.CAR_ID},
        ${FIELDS.HOME_CURRENCY},
        ${FIELDS.YEAR},
        ${FIELDS.MONTH},
        ${FIELDS.REFUELS_COUNT},
        ${FIELDS.EXPENSES_COUNT},
        ${FIELDS.REFUELS_COST},
        ${FIELDS.EXPENSES_COST},
        ${FIELDS.REFUELS_VOLUME},
        ${FIELDS.REFUELS_TAXES},
        ${FIELDS.EXPENSES_FEES},
        ${FIELDS.EXPENSES_TAXES},
        ${FIELDS.START_MILEAGE},
        ${FIELDS.END_MILEAGE},
        ${FIELDS.FIRST_RECORD_AT},
        ${FIELDS.LAST_RECORD_AT},
        ${FIELDS.UPDATED_AT}
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY}, ${FIELDS.YEAR}, ${FIELDS.MONTH})
      DO UPDATE SET ${updates.join(', ')}
      RETURNING ${FIELDS.ID}
    `;

    const insertBindings = [
      carId,
      homeCurrency,
      year,
      month,
      initialRefuelsCount,
      initialExpensesCount,
      initialRefuelsCost,
      initialExpensesCost,
      initialRefuelsVolume,
      initialRefuelsTaxes,
      initialExpensesFees,
      initialExpensesTaxes,
      odometer ?? 0,
      odometer ?? 0,
      whenDoneDate,
      whenDoneDate,
      nowDate,
    ];

    const result = await this.db.runRawQuery(sql, [...insertBindings, ...updateBindings]);
    return result?.rows?.[0]?.id || null;
  }

  // ===========================================================================
  // Private Methods - Delta Operations for REMOVE
  // ===========================================================================

  /**
   * Update total summary when a record is removed.
   * Decrements counts/sums, then recalculates MIN/MAX via aggregate query.
   */
  private async updateTotalSummaryOnRemove(params: StatsOperationParams): Promise<void> {
    const {
      carId,
      homeCurrency,
      expenseType,
      totalPriceInHc,
      refuelVolume,
      refuelTaxesHc,
      expenseFeesHc,
      expenseTaxesHc,
    } = params;

    const updates: string[] = [];
    const bindings: any[] = [];

    if (expenseType === EXPENSE_TYPES.REFUEL) {
      updates.push(`${FIELDS.TOTAL_REFUELS_COUNT} = GREATEST(COALESCE(${FIELDS.TOTAL_REFUELS_COUNT}, 0) - 1, 0)`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.TOTAL_REFUELS_COST} = COALESCE(${FIELDS.TOTAL_REFUELS_COST}, 0) - ?`);
        bindings.push(totalPriceInHc);
      }

      if (refuelVolume != null) {
        updates.push(`${FIELDS.TOTAL_REFUELS_VOLUME} = GREATEST(COALESCE(${FIELDS.TOTAL_REFUELS_VOLUME}, 0) - ?, 0)`);
        bindings.push(refuelVolume);
      }

      if (refuelTaxesHc != null) {
        updates.push(`${FIELDS.REFUELS_TAXES} = COALESCE(${FIELDS.REFUELS_TAXES}, 0) - ?`);
        bindings.push(refuelTaxesHc);
      }
    } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
      updates.push(`${FIELDS.TOTAL_EXPENSES_COUNT} = GREATEST(COALESCE(${FIELDS.TOTAL_EXPENSES_COUNT}, 0) - 1, 0)`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.TOTAL_EXPENSES_COST} = COALESCE(${FIELDS.TOTAL_EXPENSES_COST}, 0) - ?`);
        bindings.push(totalPriceInHc);
      }

      if (expenseFeesHc != null) {
        updates.push(`${FIELDS.EXPENSES_FEES} = COALESCE(${FIELDS.EXPENSES_FEES}, 0) - ?`);
        bindings.push(expenseFeesHc);
      }

      if (expenseTaxesHc != null) {
        updates.push(`${FIELDS.EXPENSES_TAXES} = COALESCE(${FIELDS.EXPENSES_TAXES}, 0) - ?`);
        bindings.push(expenseTaxesHc);
      }
    }

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    bindings.push(dayjs.utc().format('YYYY-MM-DD HH:mm:ss'));

    // First, decrement counts/sums
    if (updates.length > 0) {
      const updateSql = `
        UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}
        SET ${updates.join(', ')}
        WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.HOME_CURRENCY} = ?
      `;
      await this.db.runRawQuery(updateSql, [...bindings, carId, homeCurrency]);
    }

    // Then recalculate mileage/dates/latest IDs via aggregate query
    await this.recalculateTotalSummaryMinMax(carId, homeCurrency);
  }

  /**
   * Recalculate MIN/MAX fields for total summary by querying expense_bases.
   * Handles the edge case where all records have been removed.
   */
  private async recalculateTotalSummaryMinMax(carId: string, homeCurrency: string): Promise<void> {
    // First, check if any records exist for this car/currency
    const countResult = await this.db.runRawQuery(
      `SELECT COUNT(*) AS cnt 
       FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
       WHERE eb.${FIELDS.CAR_ID} = ? 
         AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
         AND eb.${FIELDS.STATUS} = 100 
         AND eb.${FIELDS.REMOVED_AT} IS NULL`,
      [carId, homeCurrency],
    );

    const recordCount = parseInt(countResult?.rows?.[0]?.cnt || '0', 10);

    if (recordCount === 0) {
      // No records exist - reset MIN/MAX fields to NULL/0
      const resetSql = `
        UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}
        SET 
          ${FIELDS.LATEST_KNOWN_MILEAGE} = 0,
          ${FIELDS.FIRST_RECORD_AT} = NULL,
          ${FIELDS.LAST_RECORD_AT} = NULL,
          ${FIELDS.LATEST_REFUEL_ID} = NULL,
          ${FIELDS.LATEST_EXPENSE_ID} = NULL,
          ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
        WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.HOME_CURRENCY} = ?
      `;
      await this.db.runRawQuery(resetSql, [carId, homeCurrency]);
      return;
    }

    // Records exist - recalculate MIN/MAX via aggregate query
    const sql = `
      UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} cts
      SET 
        ${FIELDS.LATEST_KNOWN_MILEAGE} = COALESCE(agg.max_odometer, 0),
        ${FIELDS.FIRST_RECORD_AT} = agg.first_record_at,
        ${FIELDS.LAST_RECORD_AT} = agg.last_record_at,
        ${FIELDS.LATEST_REFUEL_ID} = agg.latest_refuel_id,
        ${FIELDS.LATEST_EXPENSE_ID} = agg.latest_expense_id,
        ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      FROM (
        SELECT 
          MAX(eb.${FIELDS.ODOMETER}) AS max_odometer,
          MIN(eb.${FIELDS.WHEN_DONE}) AS first_record_at,
          MAX(eb.${FIELDS.WHEN_DONE}) AS last_record_at,
          (SELECT eb2.${FIELDS.ID} 
           FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb2 
           JOIN ${this.schema}.${TABLES.REFUELS} r2 ON r2.${FIELDS.ID} = eb2.${FIELDS.ID}
           WHERE eb2.${FIELDS.CAR_ID} = ? 
             AND COALESCE(eb2.${FIELDS.HOME_CURRENCY}, eb2.${FIELDS.PAID_IN_CURRENCY}) = ?
             AND eb2.${FIELDS.STATUS} = 100 
             AND eb2.${FIELDS.REMOVED_AT} IS NULL
           ORDER BY eb2.${FIELDS.WHEN_DONE} DESC 
           LIMIT 1) AS latest_refuel_id,
          (SELECT eb3.${FIELDS.ID} 
           FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb3 
           JOIN ${this.schema}.${TABLES.EXPENSES} e3 ON e3.${FIELDS.ID} = eb3.${FIELDS.ID}
           WHERE eb3.${FIELDS.CAR_ID} = ? 
             AND COALESCE(eb3.${FIELDS.HOME_CURRENCY}, eb3.${FIELDS.PAID_IN_CURRENCY}) = ?
             AND eb3.${FIELDS.STATUS} = 100 
             AND eb3.${FIELDS.REMOVED_AT} IS NULL
           ORDER BY eb3.${FIELDS.WHEN_DONE} DESC 
           LIMIT 1) AS latest_expense_id
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        WHERE eb.${FIELDS.CAR_ID} = ? 
          AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
          AND eb.${FIELDS.STATUS} = 100 
          AND eb.${FIELDS.REMOVED_AT} IS NULL
      ) agg
      WHERE cts.${FIELDS.CAR_ID} = ? AND cts.${FIELDS.HOME_CURRENCY} = ?
    `;

    await this.db.runRawQuery(sql, [
      carId,
      homeCurrency, // for latest_refuel_id subquery
      carId,
      homeCurrency, // for latest_expense_id subquery
      carId,
      homeCurrency, // for main aggregate
      carId,
      homeCurrency, // for WHERE clause
    ]);
  }

  /**
   * Update monthly summary when a record is removed.
   * Decrements counts/sums, then recalculates MIN/MAX via aggregate query.
   */
  private async updateMonthlySummaryOnRemove(
    params: StatsOperationParams,
    year: number,
    month: number,
  ): Promise<string | null> {
    const {
      carId,
      homeCurrency,
      expenseType,
      totalPriceInHc,
      refuelVolume,
      refuelTaxesHc,
      expenseFeesHc,
      expenseTaxesHc,
    } = params;

    // First, get the monthly summary ID
    const idResult = await this.db.runRawQuery(
      `SELECT ${FIELDS.ID} FROM ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}
       WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.HOME_CURRENCY} = ? 
         AND ${FIELDS.YEAR} = ? AND ${FIELDS.MONTH} = ?`,
      [carId, homeCurrency, year, month],
    );

    const monthlySummaryId = idResult?.rows?.[0]?.id;
    if (!monthlySummaryId) return null;

    const updates: string[] = [];
    const bindings: any[] = [];

    if (expenseType === EXPENSE_TYPES.REFUEL) {
      updates.push(`${FIELDS.REFUELS_COUNT} = GREATEST(COALESCE(${FIELDS.REFUELS_COUNT}, 0) - 1, 0)`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.REFUELS_COST} = COALESCE(${FIELDS.REFUELS_COST}, 0) - ?`);
        bindings.push(totalPriceInHc);
      }

      if (refuelVolume != null) {
        updates.push(`${FIELDS.REFUELS_VOLUME} = GREATEST(COALESCE(${FIELDS.REFUELS_VOLUME}, 0) - ?, 0)`);
        bindings.push(refuelVolume);
      }

      if (refuelTaxesHc != null) {
        updates.push(`${FIELDS.REFUELS_TAXES} = COALESCE(${FIELDS.REFUELS_TAXES}, 0) - ?`);
        bindings.push(refuelTaxesHc);
      }
    } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
      updates.push(`${FIELDS.EXPENSES_COUNT} = GREATEST(COALESCE(${FIELDS.EXPENSES_COUNT}, 0) - 1, 0)`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.EXPENSES_COST} = COALESCE(${FIELDS.EXPENSES_COST}, 0) - ?`);
        bindings.push(totalPriceInHc);
      }

      if (expenseFeesHc != null) {
        updates.push(`${FIELDS.EXPENSES_FEES} = COALESCE(${FIELDS.EXPENSES_FEES}, 0) - ?`);
        bindings.push(expenseFeesHc);
      }

      if (expenseTaxesHc != null) {
        updates.push(`${FIELDS.EXPENSES_TAXES} = COALESCE(${FIELDS.EXPENSES_TAXES}, 0) - ?`);
        bindings.push(expenseTaxesHc);
      }
    }

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    bindings.push(dayjs.utc().format('YYYY-MM-DD HH:mm:ss'));

    // Decrement counts/sums
    if (updates.length > 0) {
      const updateSql = `
        UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}
        SET ${updates.join(', ')}
        WHERE ${FIELDS.ID} = ?
      `;
      await this.db.runRawQuery(updateSql, [...bindings, monthlySummaryId]);
    }

    // Recalculate mileage/dates via aggregate query
    await this.recalculateMonthlySummaryMinMax(carId, homeCurrency, year, month);

    return monthlySummaryId;
  }

  /**
   * Recalculate MIN/MAX fields for monthly summary by querying expense_bases.
   * Handles the edge case where all records have been removed for the month.
   */
  private async recalculateMonthlySummaryMinMax(
    carId: string,
    homeCurrency: string,
    year: number,
    month: number,
  ): Promise<void> {
    // First, check if any records exist for this car/currency/year/month
    const countResult = await this.db.runRawQuery(
      `SELECT COUNT(*) AS cnt 
       FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
       WHERE eb.${FIELDS.CAR_ID} = ? 
         AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
         AND EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int = ?
         AND EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int = ?
         AND eb.${FIELDS.STATUS} = 100 
         AND eb.${FIELDS.REMOVED_AT} IS NULL`,
      [carId, homeCurrency, year, month],
    );

    const recordCount = parseInt(countResult?.rows?.[0]?.cnt || '0', 10);

    if (recordCount === 0) {
      // No records exist for this month - reset MIN/MAX fields to NULL/0
      const resetSql = `
        UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}
        SET 
          ${FIELDS.START_MILEAGE} = 0,
          ${FIELDS.END_MILEAGE} = 0,
          ${FIELDS.FIRST_RECORD_AT} = NULL,
          ${FIELDS.LAST_RECORD_AT} = NULL,
          ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
        WHERE ${FIELDS.CAR_ID} = ? 
          AND ${FIELDS.HOME_CURRENCY} = ? 
          AND ${FIELDS.YEAR} = ? 
          AND ${FIELDS.MONTH} = ?
      `;
      await this.db.runRawQuery(resetSql, [carId, homeCurrency, year, month]);
      return;
    }

    // Records exist - recalculate MIN/MAX via aggregate query
    const sql = `
      UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
      SET 
        ${FIELDS.START_MILEAGE} = COALESCE(agg.min_odometer, 0),
        ${FIELDS.END_MILEAGE} = COALESCE(agg.max_odometer, 0),
        ${FIELDS.FIRST_RECORD_AT} = agg.first_record_at,
        ${FIELDS.LAST_RECORD_AT} = agg.last_record_at,
        ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      FROM (
        SELECT 
          MIN(eb.${FIELDS.ODOMETER}) FILTER (WHERE eb.${FIELDS.ODOMETER} IS NOT NULL) AS min_odometer,
          MAX(eb.${FIELDS.ODOMETER}) FILTER (WHERE eb.${FIELDS.ODOMETER} IS NOT NULL) AS max_odometer,
          MIN(eb.${FIELDS.WHEN_DONE}) AS first_record_at,
          MAX(eb.${FIELDS.WHEN_DONE}) AS last_record_at
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        WHERE eb.${FIELDS.CAR_ID} = ? 
          AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
          AND EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int = ?
          AND EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int = ?
          AND eb.${FIELDS.STATUS} = 100 
          AND eb.${FIELDS.REMOVED_AT} IS NULL
      ) agg
      WHERE cms.${FIELDS.CAR_ID} = ? 
        AND cms.${FIELDS.HOME_CURRENCY} = ? 
        AND cms.${FIELDS.YEAR} = ? 
        AND cms.${FIELDS.MONTH} = ?
    `;

    await this.db.runRawQuery(sql, [
      carId,
      homeCurrency,
      year,
      month, // for aggregate
      carId,
      homeCurrency,
      year,
      month, // for WHERE
    ]);
  }

  // ===========================================================================
  // Private Methods - Delta Operations for UPDATE (value changes only)
  // ===========================================================================

  /**
   * Apply value-only delta when structure (car, month, kind) hasn't changed.
   * Since values changed, we need to recalculate MIN/MAX in case the old
   * value was the MIN/MAX and is now different.
   */
  private async applyValueDelta(oldParams: StatsOperationParams, newParams: StatsOperationParams): Promise<void> {
    const { carId, homeCurrency, expenseType, kindId, whenDone } = newParams;
    const { year, month } = this.parseYearMonth(this.getYearMonth(whenDone));

    // Calculate amount deltas
    const amountDelta = this.calculateDelta(oldParams.totalPriceInHc, newParams.totalPriceInHc);
    const volumeDelta = this.calculateDelta(oldParams.refuelVolume, newParams.refuelVolume);
    const refuelTaxesDelta = this.calculateDelta(oldParams.refuelTaxesHc, newParams.refuelTaxesHc);
    const expenseFeesDelta = this.calculateDelta(oldParams.expenseFeesHc, newParams.expenseFeesHc);
    const expenseTaxesDelta = this.calculateDelta(oldParams.expenseTaxesHc, newParams.expenseTaxesHc);

    // Update total summary sums, then recalculate MIN/MAX
    await this.updateTotalSummaryValueDelta(
      carId,
      homeCurrency,
      expenseType,
      amountDelta,
      volumeDelta,
      refuelTaxesDelta,
      expenseFeesDelta,
      expenseTaxesDelta,
    );

    const odometerChanged = oldParams.odometer !== newParams.odometer;
    const dateChanged = oldParams.whenDone !== newParams.whenDone;

    // Only recalculate MIN/MAX if these fields changed
    if (odometerChanged || dateChanged) {
      await this.recalculateTotalSummaryMinMax(carId, homeCurrency);
    }

    // Update total expense by kind
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && amountDelta != null) {
      await this.updateTotalExpenseDelta(carId, homeCurrency, kindId, 0, amountDelta);
    }

    // Update monthly summary sums, then recalculate MIN/MAX
    const monthlySummaryId = await this.updateMonthlySummaryValueDelta(
      carId,
      homeCurrency,
      year,
      month,
      expenseType,
      amountDelta,
      volumeDelta,
      refuelTaxesDelta,
      expenseFeesDelta,
      expenseTaxesDelta,
    );
    await this.recalculateMonthlySummaryMinMax(carId, homeCurrency, year, month);

    // Update monthly expense by kind
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && monthlySummaryId && amountDelta != null) {
      await this.updateMonthlyExpenseDelta(monthlySummaryId, kindId, 0, amountDelta);
    }
  }

  /**
   * Update total summary with value deltas only (no count changes)
   */
  private async updateTotalSummaryValueDelta(
    carId: string,
    homeCurrency: string,
    expenseType: number,
    amountDelta: number | null,
    volumeDelta: number | null,
    refuelTaxesDelta: number | null,
    expenseFeesDelta: number | null,
    expenseTaxesDelta: number | null,
  ): Promise<void> {
    const updates: string[] = [];
    const bindings: any[] = [];

    if (expenseType === EXPENSE_TYPES.REFUEL) {
      if (amountDelta != null) {
        updates.push(`${FIELDS.TOTAL_REFUELS_COST} = COALESCE(${FIELDS.TOTAL_REFUELS_COST}, 0) + ?`);
        bindings.push(amountDelta);
      }
      if (volumeDelta != null) {
        updates.push(`${FIELDS.TOTAL_REFUELS_VOLUME} = COALESCE(${FIELDS.TOTAL_REFUELS_VOLUME}, 0) + ?`);
        bindings.push(volumeDelta);
      }
      if (refuelTaxesDelta != null) {
        updates.push(`${FIELDS.REFUELS_TAXES} = COALESCE(${FIELDS.REFUELS_TAXES}, 0) + ?`);
        bindings.push(refuelTaxesDelta);
      }
    } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
      if (amountDelta != null) {
        updates.push(`${FIELDS.TOTAL_EXPENSES_COST} = COALESCE(${FIELDS.TOTAL_EXPENSES_COST}, 0) + ?`);
        bindings.push(amountDelta);
      }
      if (expenseFeesDelta != null) {
        updates.push(`${FIELDS.EXPENSES_FEES} = COALESCE(${FIELDS.EXPENSES_FEES}, 0) + ?`);
        bindings.push(expenseFeesDelta);
      }
      if (expenseTaxesDelta != null) {
        updates.push(`${FIELDS.EXPENSES_TAXES} = COALESCE(${FIELDS.EXPENSES_TAXES}, 0) + ?`);
        bindings.push(expenseTaxesDelta);
      }
    }

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    bindings.push(dayjs.utc().format('YYYY-MM-DD HH:mm:ss'));

    if (updates.length > 1) {
      // More than just updated_at
      const sql = `
        UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}
        SET ${updates.join(', ')}
        WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.HOME_CURRENCY} = ?
      `;
      await this.db.runRawQuery(sql, [...bindings, carId, homeCurrency]);
    }
  }

  /**
   * Update monthly summary with value deltas only (no count changes)
   */
  private async updateMonthlySummaryValueDelta(
    carId: string,
    homeCurrency: string,
    year: number,
    month: number,
    expenseType: number,
    amountDelta: number | null,
    volumeDelta: number | null,
    refuelTaxesDelta: number | null,
    expenseFeesDelta: number | null,
    expenseTaxesDelta: number | null,
  ): Promise<string | null> {
    // Get the monthly summary ID
    const idResult = await this.db.runRawQuery(
      `SELECT ${FIELDS.ID} FROM ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}
       WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.HOME_CURRENCY} = ? 
         AND ${FIELDS.YEAR} = ? AND ${FIELDS.MONTH} = ?`,
      [carId, homeCurrency, year, month],
    );

    const monthlySummaryId = idResult?.rows?.[0]?.id;
    if (!monthlySummaryId) return null;

    const updates: string[] = [];
    const bindings: any[] = [];

    if (expenseType === EXPENSE_TYPES.REFUEL) {
      if (amountDelta != null) {
        updates.push(`${FIELDS.REFUELS_COST} = COALESCE(${FIELDS.REFUELS_COST}, 0) + ?`);
        bindings.push(amountDelta);
      }
      if (volumeDelta != null) {
        updates.push(`${FIELDS.REFUELS_VOLUME} = COALESCE(${FIELDS.REFUELS_VOLUME}, 0) + ?`);
        bindings.push(volumeDelta);
      }
      if (refuelTaxesDelta != null) {
        updates.push(`${FIELDS.REFUELS_TAXES} = COALESCE(${FIELDS.REFUELS_TAXES}, 0) + ?`);
        bindings.push(refuelTaxesDelta);
      }
    } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
      if (amountDelta != null) {
        updates.push(`${FIELDS.EXPENSES_COST} = COALESCE(${FIELDS.EXPENSES_COST}, 0) + ?`);
        bindings.push(amountDelta);
      }
      if (expenseFeesDelta != null) {
        updates.push(`${FIELDS.EXPENSES_FEES} = COALESCE(${FIELDS.EXPENSES_FEES}, 0) + ?`);
        bindings.push(expenseFeesDelta);
      }
      if (expenseTaxesDelta != null) {
        updates.push(`${FIELDS.EXPENSES_TAXES} = COALESCE(${FIELDS.EXPENSES_TAXES}, 0) + ?`);
        bindings.push(expenseTaxesDelta);
      }
    }

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    bindings.push(dayjs.utc().format('YYYY-MM-DD HH:mm:ss'));

    if (updates.length > 1) {
      const sql = `
        UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}
        SET ${updates.join(', ')}
        WHERE ${FIELDS.ID} = ?
      `;
      await this.db.runRawQuery(sql, [...bindings, monthlySummaryId]);
    }

    return monthlySummaryId;
  }

  // ===========================================================================
  // Private Methods - Common Delta Helpers
  // ===========================================================================

  /**
   * Update total expense (by kind) with delta.
   * Uses UPSERT for create scenarios, UPDATE-only for modify/remove scenarios.
   */
  private async updateTotalExpenseDelta(
    carId: string,
    homeCurrency: string,
    kindId: number,
    countDelta: number,
    amountDelta: number | null,
  ): Promise<void> {
    // Early return if no changes
    if (countDelta === 0 && amountDelta == null) return;

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_TOTAL_EXPENSES;

    if (countDelta > 0) {
      // CREATE scenario: Use UPSERT with proper initial values
      const updates: string[] = [];
      const updateBindings: any[] = [];

      updates.push(`${FIELDS.RECORDS_COUNT} = COALESCE(${t}.${FIELDS.RECORDS_COUNT}, 0) + ?`);
      updateBindings.push(countDelta);

      if (amountDelta != null) {
        updates.push(`${FIELDS.AMOUNT} = COALESCE(${t}.${FIELDS.AMOUNT}, 0) + ?`);
        updateBindings.push(amountDelta);
      }

      const sql = `
        INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_EXPENSES} 
          (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY}, ${FIELDS.EXPENSE_KIND_ID}, ${FIELDS.RECORDS_COUNT}, ${FIELDS.AMOUNT})
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY}, ${FIELDS.EXPENSE_KIND_ID})
        DO UPDATE SET ${updates.join(', ')}
      `;

      await this.db.runRawQuery(sql, [carId, homeCurrency, kindId, countDelta, amountDelta, ...updateBindings]);
    } else {
      // REMOVE or VALUE UPDATE scenario: Use UPDATE only (row must already exist)
      const updates: string[] = [];
      const bindings: any[] = [];

      if (countDelta !== 0) {
        updates.push(`${FIELDS.RECORDS_COUNT} = GREATEST(COALESCE(${FIELDS.RECORDS_COUNT}, 0) + ?, 0)`);
        bindings.push(countDelta);
      }

      if (amountDelta != null) {
        updates.push(`${FIELDS.AMOUNT} = COALESCE(${FIELDS.AMOUNT}, 0) + ?`);
        bindings.push(amountDelta);
      }

      if (updates.length === 0) return;

      const sql = `
        UPDATE ${this.schema}.${TABLES.CAR_TOTAL_EXPENSES}
        SET ${updates.join(', ')}
        WHERE ${FIELDS.CAR_ID} = ? 
          AND ${FIELDS.HOME_CURRENCY} = ? 
          AND ${FIELDS.EXPENSE_KIND_ID} = ?
      `;

      await this.db.runRawQuery(sql, [...bindings, carId, homeCurrency, kindId]);
    }
  }

  /**
   * Update monthly expense (by kind) with delta.
   * Uses UPSERT for create scenarios, UPDATE-only for modify/remove scenarios.
   */
  private async updateMonthlyExpenseDelta(
    monthlySummaryId: string,
    kindId: number,
    countDelta: number,
    amountDelta: number | null,
  ): Promise<void> {
    // Early return if no changes
    if (countDelta === 0 && amountDelta == null) return;

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_MONTHLY_EXPENSES;

    if (countDelta > 0) {
      // CREATE scenario: Use UPSERT with proper initial values
      const updates: string[] = [];
      const updateBindings: any[] = [];

      updates.push(`${FIELDS.RECORDS_COUNT} = COALESCE(${t}.${FIELDS.RECORDS_COUNT}, 0) + ?`);
      updateBindings.push(countDelta);

      if (amountDelta != null) {
        updates.push(`${FIELDS.AMOUNT} = COALESCE(${t}.${FIELDS.AMOUNT}, 0) + ?`);
        updateBindings.push(amountDelta);
      }

      const sql = `
        INSERT INTO ${this.schema}.${TABLES.CAR_MONTHLY_EXPENSES} 
          (${FIELDS.CAR_MONTHLY_SUMMARY_ID}, ${FIELDS.EXPENSE_KIND_ID}, ${FIELDS.RECORDS_COUNT}, ${FIELDS.AMOUNT})
        VALUES (?, ?, ?, ?)
        ON CONFLICT (${FIELDS.CAR_MONTHLY_SUMMARY_ID}, ${FIELDS.EXPENSE_KIND_ID})
        DO UPDATE SET ${updates.join(', ')}
      `;

      await this.db.runRawQuery(sql, [monthlySummaryId, kindId, countDelta, amountDelta, ...updateBindings]);
    } else {
      // REMOVE or VALUE UPDATE scenario: Use UPDATE only (row must already exist)
      const updates: string[] = [];
      const bindings: any[] = [];

      if (countDelta !== 0) {
        updates.push(`${FIELDS.RECORDS_COUNT} = GREATEST(COALESCE(${FIELDS.RECORDS_COUNT}, 0) + ?, 0)`);
        bindings.push(countDelta);
      }

      if (amountDelta != null) {
        updates.push(`${FIELDS.AMOUNT} = COALESCE(${FIELDS.AMOUNT}, 0) + ?`);
        bindings.push(amountDelta);
      }

      if (updates.length === 0) return;

      const sql = `
        UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_EXPENSES}
        SET ${updates.join(', ')}
        WHERE ${FIELDS.CAR_MONTHLY_SUMMARY_ID} = ? 
          AND ${FIELDS.EXPENSE_KIND_ID} = ?
      `;

      await this.db.runRawQuery(sql, [...bindings, monthlySummaryId, kindId]);
    }
  }

  // ===========================================================================
  // Private Methods - Utility Functions
  // ===========================================================================

  /**
   * Extract year-month string from a date
   */
  private getYearMonth(date: Date | string): string {
    return dayjs.utc(date).format('YYYY-MM');
  }

  /**
   * Parse year-month string into components
   */
  private parseYearMonth(yearMonth: string): { year: number; month: number } {
    const [year, month] = yearMonth.split('-').map(Number);
    return { year, month };
  }

  /**
   * Calculate delta between old and new values, handling nulls
   */
  private calculateDelta(oldValue: number | null | undefined, newValue: number | null | undefined): number | null {
    // If both are null/undefined, no delta
    if (oldValue == null && newValue == null) {
      return null;
    }

    const oldNum = oldValue ?? 0;
    const newNum = newValue ?? 0;

    return newNum - oldNum;
  }

  /**
   * Negate a value (for subtraction deltas), handling null
   */
  private negate(value: number | null | undefined): number | null {
    if (value == null) return null;
    return -value;
  }
}

export { CarStatsUpdater, StatsOperationParams };
