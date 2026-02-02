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
  whenDone: Date | string;
  odometer?: number | null;
  totalPriceInHc?: number | null;
  kindId?: number | null; // For expenses only
  refuelVolume?: number | null; // For refuels only
  refuelTaxesHc?: number | null; // For refuels only
  expenseFeesHc?: number | null; // For expenses only
  expenseTaxesHc?: number | null; // For expenses only
  isMaintenance?: boolean; // For expenses: true if expense kind is maintenance
  travelDistance?: number | null; // For completed travels
}

/**
 * Parameters for travel stats delta operations.
 * Travels are currency-independent, so they update all currency rows for a car.
 */
interface TravelStatsParams {
  travelId: string;
  carId: string;
  firstDttm: Date | string | null;     // For month bucket determination (falls back to createdAt)
  createdAt: Date | string;            // Fallback if firstDttm is null
  distanceKm: number | null;           // Pre-normalized distance (preferred)
  firstOdometer?: number | null;       // Fallback for distance calc
  lastOdometer?: number | null;        // Fallback for distance calc
  status: number;                      // Only count if status >= TRAVEL_STATUS.COMPLETED (200)
  lastRecordOdometer?: number | null;  // The highest odometer from travel points (for latest_known_mileage)
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
    const { carId, homeCurrency, expenseType, kindId, whenDone } = params;
    const { year, month } = this.parseYearMonth(this.getYearMonth(whenDone));

    // Update total summary with delta + GREATEST/LEAST for mileage/dates
    await this.updateTotalSummaryOnCreate(params);

    // Update total expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null) {
      await this.updateTotalExpenseDelta(carId, homeCurrency, kindId, 1, params.totalPriceInHc ?? null);
    }

    // Update total revenue by kind (for revenues only)
    if (expenseType === EXPENSE_TYPES.REVENUE && kindId != null) {
      await this.updateTotalRevenueDelta(carId, homeCurrency, kindId, 1, params.totalPriceInHc ?? null);
    }

    // Update monthly summary
    const monthlySummaryId = await this.updateMonthlySummaryOnCreate(params, year, month);

    // Update monthly expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && monthlySummaryId) {
      await this.updateMonthlyExpenseDelta(monthlySummaryId, kindId, 1, params.totalPriceInHc ?? null);
    }

    // Update monthly revenue by kind (for revenues only)
    if (expenseType === EXPENSE_TYPES.REVENUE && kindId != null && monthlySummaryId) {
      await this.updateMonthlyRevenueDelta(monthlySummaryId, kindId, 1, params.totalPriceInHc ?? null);
    }

    // Recalculate consumption if this is a refuel (first refuel tracking)
    if (expenseType === EXPENSE_TYPES.REFUEL) {
      await this.recalculateConsumptionStats(carId, homeCurrency);
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

    // Update total revenue by kind (for revenues only)
    if (expenseType === EXPENSE_TYPES.REVENUE && kindId != null) {
      await this.updateTotalRevenueDelta(carId, homeCurrency, kindId, -1, this.negate(params.totalPriceInHc));
    }

    // Update monthly summary: decrement counts/sums, then recalculate mileage/dates
    const monthlySummaryId = await this.updateMonthlySummaryOnRemove(params, year, month);

    // Update monthly expense by kind (for expenses only)
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && monthlySummaryId) {
      await this.updateMonthlyExpenseDelta(monthlySummaryId, kindId, -1, this.negate(params.totalPriceInHc));
    }

    // Update monthly revenue by kind (for revenues only)
    if (expenseType === EXPENSE_TYPES.REVENUE && kindId != null && monthlySummaryId) {
      await this.updateMonthlyRevenueDelta(monthlySummaryId, kindId, -1, this.negate(params.totalPriceInHc));
    }

    // Recalculate consumption if this is a refuel (first refuel may have changed)
    if (expenseType === EXPENSE_TYPES.REFUEL) {
      await this.recalculateConsumptionStats(carId, homeCurrency);
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
    const maintenanceChanged = oldParams.isMaintenance !== newParams.isMaintenance;

    // If structural change (car, currency, month, kind, or maintenance flag), do remove + add
    if (carChanged || currencyChanged || monthChanged || kindChanged || maintenanceChanged) {
      await this.onRecordRemoved(oldParams);
      await this.onRecordCreated(newParams);
      return;
    }

    // Otherwise, apply incremental delta for value changes only
    // For updates within same car/currency/month, we still need to recalculate
    // mileage/dates since the old value might have been MIN/MAX
    await this.applyValueDelta(oldParams, newParams);

    // Recalculate consumption if this is a refuel and odometer/volume changed
    if (newParams.expenseType === EXPENSE_TYPES.REFUEL) {
      const odometerChanged = oldParams.odometer !== newParams.odometer;
      const volumeChanged = oldParams.refuelVolume !== newParams.refuelVolume;
      if (odometerChanged || volumeChanged) {
        await this.recalculateConsumptionStats(newParams.carId, newParams.homeCurrency);
      }
    }
  }

  // ===========================================================================
  // Public Methods - Travel Delta Operations
  // ===========================================================================

  /**
   * Apply stats delta when a travel is created.
   * Only counts completed travels (status >= 200).
   * Travels are currency-independent, so updates ALL currency rows for the car.
   */
  async onTravelCreated(params: TravelStatsParams): Promise<void> {
    const { carId, lastRecordOdometer } = params;
    const isCountable = this.isTravelCountable(params.status);

    // Always update mileage if we have an odometer reading (even for in-progress travels)
    if (lastRecordOdometer != null) {
      await this.updateTotalSummaryMileageOnly(carId, lastRecordOdometer);
    }

    // Only count completed travels for travel stats
    if (!isCountable) {
      return;
    }

    const effectiveDistance = this.getEffectiveDistance(params);
    const { year, month } = this.parseYearMonth(this.getTravelYearMonth(params));

    // Update total summary for all currency rows (travel count + distance, no mileage since already updated)
    await this.updateTotalSummaryTravelDelta(carId, 1, effectiveDistance, null);

    // Recalculate latest_travel_id
    await this.recalculateTotalSummaryLatestTravel(carId);

    // Update monthly summary for all currency rows (if rows exist)
    await this.updateMonthlySummaryTravelDelta(carId, year, month, 1, effectiveDistance);
  }

  /**
   * Apply stats delta when a travel is removed.
   * Only affects stats if the travel was previously counted (status >= 200).
   * Travels are currency-independent, so updates ALL currency rows for the car.
   */
  async onTravelRemoved(params: TravelStatsParams): Promise<void> {
    const { carId } = params;

    // Always recalculate mileage when a travel is removed (it might have had the max odometer)
    if (params.lastRecordOdometer != null) {
      await this.recalculateTotalSummaryLatestMileage(carId);
    }

    // Only update travel stats if it was previously counted
    if (!this.isTravelCountable(params.status)) {
      return;
    }

    const effectiveDistance = this.getEffectiveDistance(params);
    const { year, month } = this.parseYearMonth(this.getTravelYearMonth(params));

    // Update total summary for all currency rows (no mileage - already handled above)
    await this.updateTotalSummaryTravelDelta(carId, -1, -effectiveDistance, null);

    // Recalculate latest_travel_id
    await this.recalculateTotalSummaryLatestTravel(carId);

    // Update monthly summary for all currency rows
    await this.updateMonthlySummaryTravelDelta(carId, year, month, -1, -effectiveDistance);
  }

  /**
   * Apply stats delta when a travel is updated.
   * Handles car changes, month changes, status changes, and distance changes.
   */
  /**
 * Apply stats delta when a travel is updated.
 * Handles car changes, month changes, status changes, and distance changes.
 */
  async onTravelUpdated(oldParams: TravelStatsParams, newParams: TravelStatsParams): Promise<void> {
    const carChanged = oldParams.carId !== newParams.carId;
    const monthChanged = this.getTravelYearMonth(oldParams) !== this.getTravelYearMonth(newParams);
    const statusChanged = oldParams.status !== newParams.status;

    const wasCountable = this.isTravelCountable(oldParams.status);
    const isCountable = this.isTravelCountable(newParams.status);

    // Handle mileage updates first (independent of travel status)
    const odometerChanged = oldParams.lastRecordOdometer !== newParams.lastRecordOdometer;

    if (carChanged) {
      // Car changed - update new car's mileage, recalculate old car's
      if (newParams.lastRecordOdometer != null) {
        await this.updateTotalSummaryMileageOnly(newParams.carId, newParams.lastRecordOdometer);
      }
      if (oldParams.lastRecordOdometer != null) {
        await this.recalculateTotalSummaryLatestMileage(oldParams.carId);
      }
    } else if (odometerChanged) {
      // Same car, odometer changed
      if (newParams.lastRecordOdometer != null &&
        (oldParams.lastRecordOdometer == null ||
          newParams.lastRecordOdometer > oldParams.lastRecordOdometer)) {
        // New is higher - use GREATEST
        await this.updateTotalSummaryMileageOnly(newParams.carId, newParams.lastRecordOdometer);
      } else {
        // Old might have been the max, or new is null - recalculate
        await this.recalculateTotalSummaryLatestMileage(newParams.carId);
      }
    }

    // Handle travel stats (count, distance) - only for countable travels
    if (carChanged || monthChanged || (statusChanged && (wasCountable || isCountable))) {
      // Structural change - remove old stats, add new stats
      if (wasCountable) {
        await this.onTravelRemovedStatsOnly(oldParams);
      }
      if (isCountable) {
        await this.onTravelCreatedStatsOnly(newParams);
      }
      return;
    }

    // No structural change - apply distance delta only if countable
    if (isCountable) {
      const oldDistance = this.getEffectiveDistance(oldParams);
      const newDistance = this.getEffectiveDistance(newParams);
      const distanceDelta = newDistance - oldDistance;

      if (distanceDelta !== 0) {
        const { carId } = newParams;
        const { year, month } = this.parseYearMonth(this.getTravelYearMonth(newParams));

        await this.updateTotalSummaryTravelDelta(carId, 0, distanceDelta, null);
        await this.updateMonthlySummaryTravelDelta(carId, year, month, 0, distanceDelta);
      }

      // Recalculate latest_travel_id in case dates changed
      const datesChanged =
        oldParams.firstDttm !== newParams.firstDttm ||
        (oldParams as any).lastDttm !== (newParams as any).lastDttm;

      if (datesChanged) {
        await this.recalculateTotalSummaryLatestTravel(newParams.carId);
      }
    }
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

    // Recalculate monthly revenues by kind
    await this.recalculateMonthlyRevenues(carId, homeCurrency);

    // Recalculate total summaries
    await this.recalculateTotalSummaries(carId, homeCurrency);

    // Recalculate total expenses by kind
    await this.recalculateTotalExpenses(carId, homeCurrency);

    // Recalculate total revenues by kind
    await this.recalculateTotalRevenues(carId, homeCurrency);
  }

  /**
   * Full recalculation of ALL car stats in the system.
   * Use with caution - this can be expensive for large datasets.
   */
  async recalculateAllStats(): Promise<void> {
    // Clear all existing data
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_EXPENSES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_REVENUES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_EXPENSES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_REVENUES}`);
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}`);

    // Recalculate all monthly summaries
    await this.recalculateMonthlySummaries();

    // Recalculate all monthly expenses
    await this.recalculateMonthlyExpenses();

    // Recalculate all monthly revenues
    await this.recalculateMonthlyRevenues();

    // Recalculate all total summaries
    await this.recalculateTotalSummaries();

    // Recalculate all total expenses
    await this.recalculateTotalExpenses();

    // Recalculate all total revenues
    await this.recalculateTotalRevenues();
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

      // Delete monthly revenues
      await this.db.runRawQuery(
        `DELETE FROM ${this.schema}.${TABLES.CAR_MONTHLY_REVENUES} 
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

    // Delete total revenues
    await this.db.runRawQuery(
      `DELETE FROM ${this.schema}.${TABLES.CAR_TOTAL_REVENUES} 
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
        ${FIELDS.REVENUES_COUNT},
        ${FIELDS.REVENUES_AMOUNT},
        ${FIELDS.MAINTENANCE_COUNT},
        ${FIELDS.MAINTENANCE_COST},
        ${FIELDS.CONSUMPTION_VOLUME},
        ${FIELDS.IS_FIRST_REFUEL_MONTH},
        ${FIELDS.CHECKPOINTS_COUNT},
        ${FIELDS.TRAVELS_COUNT},
        ${FIELDS.TRAVELS_DISTANCE},
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
        COUNT(*) FILTER (WHERE rev.${FIELDS.ID} IS NOT NULL) AS revenues_count,
        SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE rev.${FIELDS.ID} IS NOT NULL) AS revenues_amount,
        COUNT(*) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL AND ek.${FIELDS.IS_IT_MAINTENANCE} = true) AS maintenance_count,
        SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL AND ek.${FIELDS.IS_IT_MAINTENANCE} = true) AS maintenance_cost,
        COALESCE(SUM(r.${FIELDS.REFUEL_VOLUME}), 0) AS consumption_volume,
        false AS is_first_refuel_month,
        COUNT(*) FILTER (WHERE eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.CHECKPOINT}) AS checkpoints_count,
        0 AS travels_count,
        0 AS travels_distance,
        MIN(eb.${FIELDS.WHEN_DONE}) AS first_record_at,
        MAX(eb.${FIELDS.WHEN_DONE}) AS last_record_at,
        CURRENT_TIMESTAMP AS updated_at
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      LEFT JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      LEFT JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      LEFT JOIN ${this.schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      LEFT JOIN ${this.schema}.${TABLES.REVENUES} rev ON rev.${FIELDS.ID} = eb.${FIELDS.ID}
      WHERE ${whereClause}
      GROUP BY 
        eb.${FIELDS.CAR_ID}, 
        COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}), 
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int, 
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int
    `;

    await this.db.runRawQuery(sql, bindings);

    // Update consumption_volume and is_first_refuel_month after initial insert
    await this.updateMonthlyConsumptionStats(carId, homeCurrency);

    // Update travel stats from travels table
    await this.updateMonthlyTravelStats(carId, homeCurrency);
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
 * Recalculate and insert monthly revenues by kind using SQL
 */
  private async recalculateMonthlyRevenues(carId?: string, homeCurrency?: string): Promise<void> {
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
    INSERT INTO ${this.schema}.${TABLES.CAR_MONTHLY_REVENUES} (
      ${FIELDS.CAR_MONTHLY_SUMMARY_ID},
      ${FIELDS.REVENUE_KIND_ID},
      ${FIELDS.RECORDS_COUNT},
      ${FIELDS.AMOUNT}
    )
    SELECT 
      cms.${FIELDS.ID} AS car_monthly_summary_id,
      rev.${FIELDS.KIND_ID} AS revenue_kind_id,
      COUNT(*) AS records_count,
      SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) AS amount
    FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
    JOIN ${this.schema}.${TABLES.REVENUES} rev ON rev.${FIELDS.ID} = eb.${FIELDS.ID}
    JOIN ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms 
      ON cms.${FIELDS.CAR_ID} = eb.${FIELDS.CAR_ID}
      AND cms.${FIELDS.HOME_CURRENCY} = COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY})
      AND cms.${FIELDS.YEAR} = EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int
      AND cms.${FIELDS.MONTH} = EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int
    WHERE ${whereClause}
    GROUP BY cms.${FIELDS.ID}, rev.${FIELDS.KIND_ID}
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
      first_refuels AS (
        SELECT DISTINCT ON (eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}))
          eb.${FIELDS.CAR_ID},
          COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
          eb.${FIELDS.ID} AS first_refuel_id,
          eb.${FIELDS.ODOMETER} AS first_refuel_odometer,
          r.${FIELDS.REFUEL_VOLUME} AS first_refuel_volume
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
        WHERE eb.${FIELDS.CAR_ID} IS NOT NULL
          AND eb.${FIELDS.STATUS} = 100
          AND eb.${FIELDS.REMOVED_AT} IS NULL
          ${carIdFilter}
          ${currencyFilter}
        ORDER BY eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}), eb.${FIELDS.WHEN_DONE} ASC
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
      latest_revenues AS (
        SELECT DISTINCT ON (eb.${FIELDS.CAR_ID}, COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}))
          eb.${FIELDS.CAR_ID},
          COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
          eb.${FIELDS.ID} AS latest_revenue_id
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        JOIN ${this.schema}.${TABLES.REVENUES} rev ON rev.${FIELDS.ID} = eb.${FIELDS.ID}
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
          AND t.${FIELDS.STATUS} >= 200
          AND t.${FIELDS.REMOVED_AT} IS NULL
          ${carId ? ` AND t.${FIELDS.CAR_ID} = ?` : ''}
        ORDER BY t.${FIELDS.CAR_ID}, COALESCE(t.${FIELDS.LAST_DTTM}, t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}) DESC
      ),
      travel_stats AS (
        SELECT 
          t.${FIELDS.CAR_ID},
          COUNT(*) AS total_travels_count,
          COALESCE(SUM(
            COALESCE(
              NULLIF(t.${FIELDS.DISTANCE_KM}, 0),
              CASE WHEN t.${FIELDS.LAST_ODOMETER} IS NOT NULL AND t.${FIELDS.FIRST_ODOMETER} IS NOT NULL 
                THEN GREATEST(t.${FIELDS.LAST_ODOMETER} - t.${FIELDS.FIRST_ODOMETER}, 0)
                ELSE 0 
              END
            )
          ), 0) AS total_travels_distance
        FROM ${this.schema}.${TABLES.TRAVELS} t
        WHERE t.${FIELDS.CAR_ID} IS NOT NULL
          AND t.${FIELDS.STATUS} >= 200
          AND t.${FIELDS.REMOVED_AT} IS NULL
          ${carId ? ` AND t.${FIELDS.CAR_ID} = ?` : ''}
        GROUP BY t.${FIELDS.CAR_ID}
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
          COUNT(*) FILTER (WHERE rev.${FIELDS.ID} IS NOT NULL) AS total_revenues_count,
          SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE rev.${FIELDS.ID} IS NOT NULL) AS total_revenues_amount,
          COUNT(*) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL AND ek.${FIELDS.IS_IT_MAINTENANCE} = true) AS total_maintenance_count,
          SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) FILTER (WHERE e.${FIELDS.ID} IS NOT NULL AND ek.${FIELDS.IS_IT_MAINTENANCE} = true) AS total_maintenance_cost,
          COUNT(*) FILTER (WHERE eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.CHECKPOINT}) AS total_checkpoints_count,
          MIN(eb.${FIELDS.WHEN_DONE}) AS first_record_at,
          MAX(eb.${FIELDS.WHEN_DONE}) AS last_record_at
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        LEFT JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
        LEFT JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
        LEFT JOIN ${this.schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
        LEFT JOIN ${this.schema}.${TABLES.REVENUES} rev ON rev.${FIELDS.ID} = eb.${FIELDS.ID}
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
        ${FIELDS.LATEST_REVENUE_ID},
        ${FIELDS.TOTAL_REFUELS_COUNT},
        ${FIELDS.TOTAL_EXPENSES_COUNT},
        ${FIELDS.REFUELS_TAXES},
        ${FIELDS.TOTAL_REFUELS_COST},
        ${FIELDS.EXPENSES_FEES},
        ${FIELDS.EXPENSES_TAXES},
        ${FIELDS.TOTAL_EXPENSES_COST},
        ${FIELDS.TOTAL_REFUELS_VOLUME},
        ${FIELDS.TOTAL_REVENUES_COUNT},
        ${FIELDS.TOTAL_REVENUES_AMOUNT},
        ${FIELDS.TOTAL_MAINTENANCE_COUNT},
        ${FIELDS.TOTAL_MAINTENANCE_COST},
        ${FIELDS.FIRST_REFUEL_ID},
        ${FIELDS.FIRST_REFUEL_ODOMETER},
        ${FIELDS.FIRST_REFUEL_VOLUME},
        ${FIELDS.CONSUMPTION_VOLUME},
        ${FIELDS.CONSUMPTION_DISTANCE},
        ${FIELDS.TOTAL_CHECKPOINTS_COUNT},
        ${FIELDS.TOTAL_TRAVELS_COUNT},
        ${FIELDS.TOTAL_TRAVELS_DISTANCE},
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
        lrev.latest_revenue_id,
        a.total_refuels_count,
        a.total_expenses_count,
        a.refuel_taxes,
        a.total_refuels_cost,
        a.expenses_fees,
        a.expenses_taxes,
        a.total_expenses_cost,
        a.total_refuels_volume,
        a.total_revenues_count,
        a.total_revenues_amount,
        a.total_maintenance_count,
        a.total_maintenance_cost,
        fr.first_refuel_id,
        fr.first_refuel_odometer,
        fr.first_refuel_volume,
        GREATEST(a.total_refuels_volume - COALESCE(fr.first_refuel_volume, 0), 0) AS consumption_volume,
        GREATEST(a.latest_known_mileage - COALESCE(fr.first_refuel_odometer, 0), 0) AS consumption_distance,
        a.total_checkpoints_count,
        COALESCE(ts.total_travels_count, 0) AS total_travels_count,
        COALESCE(ts.total_travels_distance, 0) AS total_travels_distance,
        a.first_record_at,
        a.last_record_at,
        CURRENT_TIMESTAMP AS updated_at
      FROM aggregated a
      LEFT JOIN latest_refuels lr ON lr.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID} AND lr.home_currency = a.home_currency
      LEFT JOIN first_refuels fr ON fr.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID} AND fr.home_currency = a.home_currency
      LEFT JOIN latest_expenses le ON le.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID} AND le.home_currency = a.home_currency
      LEFT JOIN latest_revenues lrev ON lrev.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID} AND lrev.home_currency = a.home_currency
      LEFT JOIN latest_travels lt ON lt.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID}
      LEFT JOIN travel_stats ts ON ts.${FIELDS.CAR_ID} = a.${FIELDS.CAR_ID}
    `;

    // Build bindings: CTE1 (latest_refuels), CTE2 (first_refuels), CTE3 (latest_expenses), 
    // CTE4 (latest_revenues), CTE5 (latest_travels), CTE6 (travel_stats), main aggregated
    const allBindings = [
      ...cteBindings, // latest_refuels
      ...cteBindings, // first_refuels
      ...cteBindings, // latest_expenses
      ...cteBindings, // latest_revenues
      ...(carId ? [carId] : []), // latest_travels
      ...(carId ? [carId] : []), // travel_stats
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

  /**
 * Recalculate and insert total revenues by kind using SQL
 */
  private async recalculateTotalRevenues(carId?: string, homeCurrency?: string): Promise<void> {
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
    INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_REVENUES} (
      ${FIELDS.CAR_ID},
      ${FIELDS.HOME_CURRENCY},
      ${FIELDS.REVENUE_KIND_ID},
      ${FIELDS.RECORDS_COUNT},
      ${FIELDS.AMOUNT}
    )
    SELECT 
      eb.${FIELDS.CAR_ID},
      COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) AS home_currency,
      rev.${FIELDS.KIND_ID} AS revenue_kind_id,
      COUNT(*) AS records_count,
      SUM(COALESCE(eb.${FIELDS.TOTAL_PRICE_IN_HC}, eb.${FIELDS.TOTAL_PRICE})) AS amount
    FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
    JOIN ${this.schema}.${TABLES.REVENUES} rev ON rev.${FIELDS.ID} = eb.${FIELDS.ID}
    WHERE ${whereClause}
    GROUP BY 
      eb.${FIELDS.CAR_ID}, 
      COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}),
      rev.${FIELDS.KIND_ID}
  `;

    await this.db.runRawQuery(sql, bindings);
  }

  /**
   * Recalculate consumption stats for a car.
   * This updates first_refuel_* fields and consumption_volume/consumption_distance.
   * Called when refuels are added, updated, or removed.
   */
  private async recalculateConsumptionStats(carId: string, homeCurrency: string): Promise<void> {
    const sql = `
    WITH first_refuel AS (
      SELECT 
        eb.${FIELDS.ID} AS first_refuel_id,
        eb.${FIELDS.ODOMETER} AS first_refuel_odometer,
        r.${FIELDS.REFUEL_VOLUME} AS first_refuel_volume
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      WHERE eb.${FIELDS.CAR_ID} = ?
        AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
        AND eb.${FIELDS.STATUS} = 100
        AND eb.${FIELDS.REMOVED_AT} IS NULL
      ORDER BY eb.${FIELDS.WHEN_DONE} ASC
      LIMIT 1
    ),
    totals AS (
      SELECT 
        COALESCE(MAX(eb.${FIELDS.ODOMETER}), 0) AS latest_known_mileage,
        COALESCE(SUM(r.${FIELDS.REFUEL_VOLUME}), 0) AS total_refuels_volume
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      JOIN ${this.schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      WHERE eb.${FIELDS.CAR_ID} = ?
        AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
        AND eb.${FIELDS.STATUS} = 100
        AND eb.${FIELDS.REMOVED_AT} IS NULL
    )
    UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}
    SET 
      ${FIELDS.FIRST_REFUEL_ID} = fr.first_refuel_id,
      ${FIELDS.FIRST_REFUEL_ODOMETER} = fr.first_refuel_odometer,
      ${FIELDS.FIRST_REFUEL_VOLUME} = fr.first_refuel_volume,
      ${FIELDS.CONSUMPTION_VOLUME} = GREATEST(t.total_refuels_volume - COALESCE(fr.first_refuel_volume, 0), 0),
      ${FIELDS.CONSUMPTION_DISTANCE} = GREATEST(t.latest_known_mileage - COALESCE(fr.first_refuel_odometer, 0), 0),
      ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
    FROM first_refuel fr, totals t
    WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.HOME_CURRENCY} = ?
  `;

    await this.db.runRawQuery(sql, [
      carId, homeCurrency, // first_refuel CTE
      carId, homeCurrency, // totals CTE
      carId, homeCurrency, // WHERE clause
    ]);

    // Also update monthly consumption stats
    await this.updateMonthlyConsumptionStats(carId, homeCurrency);
  }

  /**
   * Update monthly consumption stats.
   * Sets consumption_volume (excluding first refuel if in that month) and is_first_refuel_month flag.
   */
  private async updateMonthlyConsumptionStats(carId?: string, homeCurrency?: string): Promise<void> {
    const carFilter = carId ? ` AND cts.${FIELDS.CAR_ID} = ?` : '';
    const currencyFilter = homeCurrency ? ` AND cts.${FIELDS.HOME_CURRENCY} = ?` : '';

    const bindings: any[] = [];
    if (carId) bindings.push(carId);
    if (homeCurrency) bindings.push(homeCurrency);

    // First, reset all months to not be first refuel month and set consumption_volume = refuels_volume
    const resetSql = `
    UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
    SET 
      ${FIELDS.IS_FIRST_REFUEL_MONTH} = false,
      ${FIELDS.CONSUMPTION_VOLUME} = COALESCE(cms.${FIELDS.REFUELS_VOLUME}, 0),
      ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
    FROM ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} cts
    WHERE cms.${FIELDS.CAR_ID} = cts.${FIELDS.CAR_ID}
      AND cms.${FIELDS.HOME_CURRENCY} = cts.${FIELDS.HOME_CURRENCY}
      ${carFilter}
      ${currencyFilter}
  `;

    await this.db.runRawQuery(resetSql, bindings);

    // Now update the month containing the first refuel
    const updateSql = `
    UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
    SET 
      ${FIELDS.IS_FIRST_REFUEL_MONTH} = true,
      ${FIELDS.CONSUMPTION_VOLUME} = GREATEST(COALESCE(cms.${FIELDS.REFUELS_VOLUME}, 0) - COALESCE(cts.${FIELDS.FIRST_REFUEL_VOLUME}, 0), 0),
      ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
    FROM ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} cts
    JOIN ${this.schema}.${TABLES.EXPENSE_BASES} eb ON eb.${FIELDS.ID} = cts.${FIELDS.FIRST_REFUEL_ID}
    WHERE cms.${FIELDS.CAR_ID} = cts.${FIELDS.CAR_ID}
      AND cms.${FIELDS.HOME_CURRENCY} = cts.${FIELDS.HOME_CURRENCY}
      AND cms.${FIELDS.YEAR} = EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE})::int
      AND cms.${FIELDS.MONTH} = EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::int
      AND cts.${FIELDS.FIRST_REFUEL_ID} IS NOT NULL
      ${carFilter}
      ${currencyFilter}
  `;

    await this.db.runRawQuery(updateSql, bindings);
  }

  /**
   * Update monthly travel stats from the travels table.
   * Sets travels_count and travels_distance for each month.
   */
  private async updateMonthlyTravelStats(carId?: string, homeCurrency?: string): Promise<void> {
    const carFilter = carId ? ` AND cms.${FIELDS.CAR_ID} = ?` : '';
    const currencyFilter = homeCurrency ? ` AND cms.${FIELDS.HOME_CURRENCY} = ?` : '';

    const bindings: any[] = [];
    if (carId) bindings.push(carId);
    if (homeCurrency) bindings.push(homeCurrency);

    const sql = `
    UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
    SET 
      ${FIELDS.TRAVELS_COUNT} = COALESCE(ts.travels_count, 0),
      ${FIELDS.TRAVELS_DISTANCE} = COALESCE(ts.travels_distance, 0),
      ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
    FROM (
      SELECT 
        t.${FIELDS.CAR_ID},
        EXTRACT(YEAR FROM COALESCE(t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}))::int AS year,
        EXTRACT(MONTH FROM COALESCE(t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}))::int AS month,
        COUNT(*) AS travels_count,
        COALESCE(SUM(
          COALESCE(
            NULLIF(t.${FIELDS.DISTANCE_KM}, 0),
            CASE WHEN t.${FIELDS.LAST_ODOMETER} IS NOT NULL AND t.${FIELDS.FIRST_ODOMETER} IS NOT NULL 
              THEN GREATEST(t.${FIELDS.LAST_ODOMETER} - t.${FIELDS.FIRST_ODOMETER}, 0)
              ELSE 0 
            END
          )
        ), 0) AS travels_distance
      FROM ${this.schema}.${TABLES.TRAVELS} t
      WHERE t.${FIELDS.CAR_ID} IS NOT NULL
        AND t.${FIELDS.STATUS} >= 200
        AND t.${FIELDS.REMOVED_AT} IS NULL
        ${carId ? ` AND t.${FIELDS.CAR_ID} = ?` : ''}
      GROUP BY t.${FIELDS.CAR_ID}, 
        EXTRACT(YEAR FROM COALESCE(t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}))::int,
        EXTRACT(MONTH FROM COALESCE(t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}))::int
    ) ts
    WHERE cms.${FIELDS.CAR_ID} = ts.${FIELDS.CAR_ID}
      AND cms.${FIELDS.YEAR} = ts.year
      AND cms.${FIELDS.MONTH} = ts.month
      ${carFilter}
      ${currencyFilter}
  `;

    // Build bindings: subquery carId filter, then outer WHERE filters
    const allBindings = [
      ...(carId ? [carId] : []), // subquery filter
      ...bindings, // outer WHERE filters
    ];

    await this.db.runRawQuery(sql, allBindings);
  }

  // ===========================================================================
  // Private Methods - Delta Operations for CREATE
  // ===========================================================================

  /**
   * Update total summary when a record is created.
   * Uses GREATEST/LEAST for mileage/dates since we're only adding values.
   */
  /**
 * Update total summary when a record is created.
 * Uses GREATEST/LEAST for mileage/dates since we're only adding values.
 */
  /**
 * Update total summary when a record is created.
 * Uses UPSERT for the record, then recalculates MIN/MAX fields via aggregate query.
 */
  private async updateTotalSummaryOnCreate(params: StatsOperationParams): Promise<void> {
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
      isMaintenance,
    } = params;

    const whenDoneDate = dayjs.utc(whenDone).format('YYYY-MM-DD HH:mm:ss');
    const nowDate = dayjs.utc().format('YYYY-MM-DD HH:mm:ss');

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_TOTAL_SUMMARIES;

    // Build initial values for INSERT (first record case)
    const initialLatestKnownMileage = odometer ?? 0;
    const initialTotalRefuelsCount = expenseType === EXPENSE_TYPES.REFUEL ? 1 : 0;
    const initialTotalExpensesCount = expenseType === EXPENSE_TYPES.EXPENSE ? 1 : 0;
    const initialTotalRevenuesCount = expenseType === EXPENSE_TYPES.REVENUE ? 1 : 0;
    const initialTotalCheckpointsCount = expenseType === EXPENSE_TYPES.CHECKPOINT ? 1 : 0;
    const initialTotalMaintenanceCount = expenseType === EXPENSE_TYPES.EXPENSE && isMaintenance ? 1 : 0;
    const initialRefuelsTaxes = expenseType === EXPENSE_TYPES.REFUEL ? refuelTaxesHc : null;
    const initialTotalRefuelsCost = expenseType === EXPENSE_TYPES.REFUEL ? totalPriceInHc : null;
    const initialExpensesFees = expenseType === EXPENSE_TYPES.EXPENSE ? expenseFeesHc : null;
    const initialExpensesTaxes = expenseType === EXPENSE_TYPES.EXPENSE ? expenseTaxesHc : null;
    const initialTotalExpensesCost = expenseType === EXPENSE_TYPES.EXPENSE ? totalPriceInHc : null;
    const initialTotalRefuelsVolume = expenseType === EXPENSE_TYPES.REFUEL ? refuelVolume : 0;
    const initialTotalRevenuesAmount = expenseType === EXPENSE_TYPES.REVENUE ? totalPriceInHc : null;
    const initialTotalMaintenanceCost = expenseType === EXPENSE_TYPES.EXPENSE && isMaintenance ? totalPriceInHc : null;

    // Build updates for ON CONFLICT (existing record case)
    // Note: MIN/MAX fields (mileage, dates, latest IDs) are handled by recalculateTotalSummaryMinMax
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

      // Maintenance tracking
      if (isMaintenance) {
        updates.push(`${FIELDS.TOTAL_MAINTENANCE_COUNT} = COALESCE(${t}.${FIELDS.TOTAL_MAINTENANCE_COUNT}, 0) + 1`);
        if (totalPriceInHc != null) {
          updates.push(`${FIELDS.TOTAL_MAINTENANCE_COST} = COALESCE(${t}.${FIELDS.TOTAL_MAINTENANCE_COST}, 0) + ?`);
          updateBindings.push(totalPriceInHc);
        }
      }
    } else if (expenseType === EXPENSE_TYPES.REVENUE) {
      updates.push(`${FIELDS.TOTAL_REVENUES_COUNT} = COALESCE(${t}.${FIELDS.TOTAL_REVENUES_COUNT}, 0) + 1`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.TOTAL_REVENUES_AMOUNT} = COALESCE(${t}.${FIELDS.TOTAL_REVENUES_AMOUNT}, 0) + ?`);
        updateBindings.push(totalPriceInHc);
      }
    } else if (expenseType === EXPENSE_TYPES.CHECKPOINT) {
      updates.push(`${FIELDS.TOTAL_CHECKPOINTS_COUNT} = COALESCE(${t}.${FIELDS.TOTAL_CHECKPOINTS_COUNT}, 0) + 1`);
    }

    updates.push(`${FIELDS.UPDATED_AT} = ?`);
    updateBindings.push(nowDate);

    const sql = `
    INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} (
      ${FIELDS.CAR_ID},
      ${FIELDS.HOME_CURRENCY},
      ${FIELDS.LATEST_KNOWN_MILEAGE},
      ${FIELDS.TOTAL_REFUELS_COUNT},
      ${FIELDS.TOTAL_EXPENSES_COUNT},
      ${FIELDS.TOTAL_REVENUES_COUNT},
      ${FIELDS.TOTAL_CHECKPOINTS_COUNT},
      ${FIELDS.TOTAL_MAINTENANCE_COUNT},
      ${FIELDS.REFUELS_TAXES},
      ${FIELDS.TOTAL_REFUELS_COST},
      ${FIELDS.EXPENSES_FEES},
      ${FIELDS.EXPENSES_TAXES},
      ${FIELDS.TOTAL_EXPENSES_COST},
      ${FIELDS.TOTAL_REFUELS_VOLUME},
      ${FIELDS.TOTAL_REVENUES_AMOUNT},
      ${FIELDS.TOTAL_MAINTENANCE_COST},
      ${FIELDS.FIRST_RECORD_AT},
      ${FIELDS.LAST_RECORD_AT},
      ${FIELDS.UPDATED_AT}
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY})
    DO UPDATE SET ${updates.join(', ')}
  `;

    const insertBindings = [
      carId,
      homeCurrency,
      initialLatestKnownMileage,
      initialTotalRefuelsCount,
      initialTotalExpensesCount,
      initialTotalRevenuesCount,
      initialTotalCheckpointsCount,
      initialTotalMaintenanceCount,
      initialRefuelsTaxes,
      initialTotalRefuelsCost,
      initialExpensesFees,
      initialExpensesTaxes,
      initialTotalExpensesCost,
      initialTotalRefuelsVolume,
      initialTotalRevenuesAmount,
      initialTotalMaintenanceCost,
      whenDoneDate,
      whenDoneDate,
      nowDate,
    ];

    await this.db.runRawQuery(sql, [...insertBindings, ...updateBindings]);

    // Recalculate MIN/MAX fields and latest IDs
    await this.recalculateTotalSummaryMinMax(carId, homeCurrency);
  }

  /**
   * Update monthly summary when a record is created.
   * Returns the monthly summary ID for updating monthly expenses.
   */
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
      isMaintenance,
    } = params;

    const whenDoneDate = dayjs.utc(whenDone).format('YYYY-MM-DD HH:mm:ss');
    const nowDate = dayjs.utc().format('YYYY-MM-DD HH:mm:ss');

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_MONTHLY_SUMMARIES;

    // Build initial values for INSERT (first record case)
    const initialRefuelsCount = expenseType === EXPENSE_TYPES.REFUEL ? 1 : 0;
    const initialExpensesCount = expenseType === EXPENSE_TYPES.EXPENSE ? 1 : 0;
    const initialRevenuesCount = expenseType === EXPENSE_TYPES.REVENUE ? 1 : 0;
    const initialCheckpointsCount = expenseType === EXPENSE_TYPES.CHECKPOINT ? 1 : 0;
    const initialMaintenanceCount = expenseType === EXPENSE_TYPES.EXPENSE && isMaintenance ? 1 : 0;
    const initialRefuelsCost = expenseType === EXPENSE_TYPES.REFUEL ? totalPriceInHc : null;
    const initialExpensesCost = expenseType === EXPENSE_TYPES.EXPENSE ? totalPriceInHc : null;
    const initialRevenuesAmount = expenseType === EXPENSE_TYPES.REVENUE ? totalPriceInHc : null;
    const initialMaintenanceCost = expenseType === EXPENSE_TYPES.EXPENSE && isMaintenance ? totalPriceInHc : null;
    const initialRefuelsVolume = expenseType === EXPENSE_TYPES.REFUEL ? refuelVolume : 0;
    const initialConsumptionVolume = expenseType === EXPENSE_TYPES.REFUEL ? refuelVolume : 0;
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
        // Note: consumption_volume will be recalculated by recalculateConsumptionStats
        updates.push(`${FIELDS.CONSUMPTION_VOLUME} = COALESCE(${t}.${FIELDS.CONSUMPTION_VOLUME}, 0) + ?`);
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

      // Maintenance tracking
      if (isMaintenance) {
        updates.push(`${FIELDS.MAINTENANCE_COUNT} = COALESCE(${t}.${FIELDS.MAINTENANCE_COUNT}, 0) + 1`);
        if (totalPriceInHc != null) {
          updates.push(`${FIELDS.MAINTENANCE_COST} = COALESCE(${t}.${FIELDS.MAINTENANCE_COST}, 0) + ?`);
          updateBindings.push(totalPriceInHc);
        }
      }
    } else if (expenseType === EXPENSE_TYPES.REVENUE) {
      updates.push(`${FIELDS.REVENUES_COUNT} = COALESCE(${t}.${FIELDS.REVENUES_COUNT}, 0) + 1`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.REVENUES_AMOUNT} = COALESCE(${t}.${FIELDS.REVENUES_AMOUNT}, 0) + ?`);
        updateBindings.push(totalPriceInHc);
      }
    } else if (expenseType === EXPENSE_TYPES.CHECKPOINT) {
      updates.push(`${FIELDS.CHECKPOINTS_COUNT} = COALESCE(${t}.${FIELDS.CHECKPOINTS_COUNT}, 0) + 1`);
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
      ${FIELDS.REVENUES_COUNT},
      ${FIELDS.CHECKPOINTS_COUNT},
      ${FIELDS.MAINTENANCE_COUNT},
      ${FIELDS.REFUELS_COST},
      ${FIELDS.EXPENSES_COST},
      ${FIELDS.REVENUES_AMOUNT},
      ${FIELDS.MAINTENANCE_COST},
      ${FIELDS.REFUELS_VOLUME},
      ${FIELDS.CONSUMPTION_VOLUME},
      ${FIELDS.REFUELS_TAXES},
      ${FIELDS.EXPENSES_FEES},
      ${FIELDS.EXPENSES_TAXES},
      ${FIELDS.START_MILEAGE},
      ${FIELDS.END_MILEAGE},
      ${FIELDS.FIRST_RECORD_AT},
      ${FIELDS.LAST_RECORD_AT},
      ${FIELDS.UPDATED_AT}
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      initialRevenuesCount,
      initialCheckpointsCount,
      initialMaintenanceCount,
      initialRefuelsCost,
      initialExpensesCost,
      initialRevenuesAmount,
      initialMaintenanceCost,
      initialRefuelsVolume,
      initialConsumptionVolume,
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
      isMaintenance,
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

      // Maintenance tracking
      if (isMaintenance) {
        updates.push(`${FIELDS.TOTAL_MAINTENANCE_COUNT} = GREATEST(COALESCE(${FIELDS.TOTAL_MAINTENANCE_COUNT}, 0) - 1, 0)`);
        if (totalPriceInHc != null) {
          updates.push(`${FIELDS.TOTAL_MAINTENANCE_COST} = COALESCE(${FIELDS.TOTAL_MAINTENANCE_COST}, 0) - ?`);
          bindings.push(totalPriceInHc);
        }
      }
    } else if (expenseType === EXPENSE_TYPES.REVENUE) {
      updates.push(`${FIELDS.TOTAL_REVENUES_COUNT} = GREATEST(COALESCE(${FIELDS.TOTAL_REVENUES_COUNT}, 0) - 1, 0)`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.TOTAL_REVENUES_AMOUNT} = COALESCE(${FIELDS.TOTAL_REVENUES_AMOUNT}, 0) - ?`);
        bindings.push(totalPriceInHc);
      }
    } else if (expenseType === EXPENSE_TYPES.CHECKPOINT) {
      updates.push(`${FIELDS.TOTAL_CHECKPOINTS_COUNT} = GREATEST(COALESCE(${FIELDS.TOTAL_CHECKPOINTS_COUNT}, 0) - 1, 0)`);
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
        ${FIELDS.LATEST_REVENUE_ID} = NULL,
        ${FIELDS.FIRST_REFUEL_ID} = NULL,
        ${FIELDS.FIRST_REFUEL_ODOMETER} = NULL,
        ${FIELDS.FIRST_REFUEL_VOLUME} = NULL,
        ${FIELDS.CONSUMPTION_VOLUME} = 0,
        ${FIELDS.CONSUMPTION_DISTANCE} = 0,
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
      ${FIELDS.LATEST_REVENUE_ID} = agg.latest_revenue_id,
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
         LIMIT 1) AS latest_expense_id,
        (SELECT eb4.${FIELDS.ID} 
         FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb4 
         JOIN ${this.schema}.${TABLES.REVENUES} rev4 ON rev4.${FIELDS.ID} = eb4.${FIELDS.ID}
         WHERE eb4.${FIELDS.CAR_ID} = ? 
           AND COALESCE(eb4.${FIELDS.HOME_CURRENCY}, eb4.${FIELDS.PAID_IN_CURRENCY}) = ?
           AND eb4.${FIELDS.STATUS} = 100 
           AND eb4.${FIELDS.REMOVED_AT} IS NULL
         ORDER BY eb4.${FIELDS.WHEN_DONE} DESC 
         LIMIT 1) AS latest_revenue_id
      FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
      WHERE eb.${FIELDS.CAR_ID} = ? 
        AND COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY}) = ?
        AND eb.${FIELDS.STATUS} = 100 
        AND eb.${FIELDS.REMOVED_AT} IS NULL
    ) agg
    WHERE cts.${FIELDS.CAR_ID} = ? AND cts.${FIELDS.HOME_CURRENCY} = ?
  `;

    await this.db.runRawQuery(sql, [
      carId, homeCurrency, // for latest_refuel_id subquery
      carId, homeCurrency, // for latest_expense_id subquery
      carId, homeCurrency, // for latest_revenue_id subquery
      carId, homeCurrency, // for main aggregate
      carId, homeCurrency, // for WHERE clause
    ]);
  }

  /**
   * Update monthly summary when a record is removed.
   * Decrements counts/sums, then recalculates MIN/MAX via aggregate query.
   */
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
      isMaintenance,
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
        // Note: consumption_volume will be recalculated by recalculateConsumptionStats
        updates.push(`${FIELDS.CONSUMPTION_VOLUME} = GREATEST(COALESCE(${FIELDS.CONSUMPTION_VOLUME}, 0) - ?, 0)`);
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

      // Maintenance tracking
      if (isMaintenance) {
        updates.push(`${FIELDS.MAINTENANCE_COUNT} = GREATEST(COALESCE(${FIELDS.MAINTENANCE_COUNT}, 0) - 1, 0)`);
        if (totalPriceInHc != null) {
          updates.push(`${FIELDS.MAINTENANCE_COST} = COALESCE(${FIELDS.MAINTENANCE_COST}, 0) - ?`);
          bindings.push(totalPriceInHc);
        }
      }
    } else if (expenseType === EXPENSE_TYPES.REVENUE) {
      updates.push(`${FIELDS.REVENUES_COUNT} = GREATEST(COALESCE(${FIELDS.REVENUES_COUNT}, 0) - 1, 0)`);

      if (totalPriceInHc != null) {
        updates.push(`${FIELDS.REVENUES_AMOUNT} = COALESCE(${FIELDS.REVENUES_AMOUNT}, 0) - ?`);
        bindings.push(totalPriceInHc);
      }
    } else if (expenseType === EXPENSE_TYPES.CHECKPOINT) {
      updates.push(`${FIELDS.CHECKPOINTS_COUNT} = GREATEST(COALESCE(${FIELDS.CHECKPOINTS_COUNT}, 0) - 1, 0)`);
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
  /**
 * Apply value-only delta when structure (car, month, kind) hasn't changed.
 * Since values changed, we need to recalculate MIN/MAX in case the old
 * value was the MIN/MAX and is now different.
 */
  private async applyValueDelta(oldParams: StatsOperationParams, newParams: StatsOperationParams): Promise<void> {
    const { carId, homeCurrency, expenseType, kindId, whenDone, isMaintenance } = newParams;
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
      isMaintenance,
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

    // Update total revenue by kind
    if (expenseType === EXPENSE_TYPES.REVENUE && kindId != null && amountDelta != null) {
      await this.updateTotalRevenueDelta(carId, homeCurrency, kindId, 0, amountDelta);
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
      isMaintenance,
    );
    await this.recalculateMonthlySummaryMinMax(carId, homeCurrency, year, month);

    // Update monthly expense by kind
    if (expenseType === EXPENSE_TYPES.EXPENSE && kindId != null && monthlySummaryId && amountDelta != null) {
      await this.updateMonthlyExpenseDelta(monthlySummaryId, kindId, 0, amountDelta);
    }

    // Update monthly revenue by kind
    if (expenseType === EXPENSE_TYPES.REVENUE && kindId != null && monthlySummaryId && amountDelta != null) {
      await this.updateMonthlyRevenueDelta(monthlySummaryId, kindId, 0, amountDelta);
    }
  }

  /**
   * Update total summary with value deltas only (no count changes)
   */
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
    isMaintenance?: boolean,
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
      // Maintenance tracking
      if (isMaintenance && amountDelta != null) {
        updates.push(`${FIELDS.TOTAL_MAINTENANCE_COST} = COALESCE(${FIELDS.TOTAL_MAINTENANCE_COST}, 0) + ?`);
        bindings.push(amountDelta);
      }
    } else if (expenseType === EXPENSE_TYPES.REVENUE) {
      if (amountDelta != null) {
        updates.push(`${FIELDS.TOTAL_REVENUES_AMOUNT} = COALESCE(${FIELDS.TOTAL_REVENUES_AMOUNT}, 0) + ?`);
        bindings.push(amountDelta);
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
    isMaintenance?: boolean,
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
        // Note: consumption_volume will be recalculated by recalculateConsumptionStats
        updates.push(`${FIELDS.CONSUMPTION_VOLUME} = COALESCE(${FIELDS.CONSUMPTION_VOLUME}, 0) + ?`);
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
      // Maintenance tracking
      if (isMaintenance && amountDelta != null) {
        updates.push(`${FIELDS.MAINTENANCE_COST} = COALESCE(${FIELDS.MAINTENANCE_COST}, 0) + ?`);
        bindings.push(amountDelta);
      }
    } else if (expenseType === EXPENSE_TYPES.REVENUE) {
      if (amountDelta != null) {
        updates.push(`${FIELDS.REVENUES_AMOUNT} = COALESCE(${FIELDS.REVENUES_AMOUNT}, 0) + ?`);
        bindings.push(amountDelta);
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

  private async recalculateTotalSummaryLatestMileage(carId: string): Promise<void> {
    const sql = `
    UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} cts
    SET 
      ${FIELDS.LATEST_KNOWN_MILEAGE} = COALESCE((
        SELECT MAX(odometer_value) FROM (
          -- From expense_bases (refuels, expenses, checkpoints, travel points)
          SELECT MAX(eb.${FIELDS.ODOMETER}) as odometer_value
          FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
          WHERE eb.${FIELDS.CAR_ID} = ?
            AND eb.${FIELDS.STATUS} = 100
            AND eb.${FIELDS.REMOVED_AT} IS NULL
            AND eb.${FIELDS.ODOMETER} IS NOT NULL
          UNION ALL
          -- From travels (first and last odometer)
          SELECT GREATEST(
            COALESCE(MAX(t.${FIELDS.FIRST_ODOMETER}), 0),
            COALESCE(MAX(t.${FIELDS.LAST_ODOMETER}), 0)
          ) as odometer_value
          FROM ${this.schema}.${TABLES.TRAVELS} t
          WHERE t.${FIELDS.CAR_ID} = ?
            AND t.${FIELDS.STATUS} >= 200
            AND t.${FIELDS.REMOVED_AT} IS NULL
        ) combined
      ), 0),
      ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
    WHERE cts.${FIELDS.CAR_ID} = ?
  `;

    await this.db.runRawQuery(sql, [carId, carId, carId]);
  }

  /**
 * Update only the latest_known_mileage field for a car.
 * Used when we have an odometer reading but don't want to update travel counts.
 */
  private async updateTotalSummaryMileageOnly(
    carId: string,
    odometer: number,
  ): Promise<void> {
    const sql = `
    UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}
    SET 
      ${FIELDS.LATEST_KNOWN_MILEAGE} = GREATEST(COALESCE(${FIELDS.LATEST_KNOWN_MILEAGE}, 0), ?),
      ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
    WHERE ${FIELDS.CAR_ID} = ?
  `;

    await this.db.runRawQuery(sql, [odometer, carId]);
  }

  /**
 * Update travel stats only (count, distance) without touching mileage.
 * Used internally by onTravelUpdated() to avoid duplicate mileage updates.
 */
  private async onTravelCreatedStatsOnly(params: TravelStatsParams): Promise<void> {
    const { carId } = params;
    const effectiveDistance = this.getEffectiveDistance(params);
    const { year, month } = this.parseYearMonth(this.getTravelYearMonth(params));

    // Update total summary (no mileage - pass null)
    await this.updateTotalSummaryTravelDelta(carId, 1, effectiveDistance, null);

    // Recalculate latest_travel_id
    await this.recalculateTotalSummaryLatestTravel(carId);

    // Update monthly summary
    await this.updateMonthlySummaryTravelDelta(carId, year, month, 1, effectiveDistance);
  }

  /**
   * Remove travel stats only (count, distance) without touching mileage.
   * Used internally by onTravelUpdated() to avoid duplicate mileage updates.
   */
  private async onTravelRemovedStatsOnly(params: TravelStatsParams): Promise<void> {
    const { carId } = params;
    const effectiveDistance = this.getEffectiveDistance(params);
    const { year, month } = this.parseYearMonth(this.getTravelYearMonth(params));

    // Update total summary (no mileage - pass null)
    await this.updateTotalSummaryTravelDelta(carId, -1, -effectiveDistance, null);

    // Recalculate latest_travel_id
    await this.recalculateTotalSummaryLatestTravel(carId);

    // Update monthly summary
    await this.updateMonthlySummaryTravelDelta(carId, year, month, -1, -effectiveDistance);
  }

  /**
   * Update total revenue (by kind) with delta.
   * Uses UPSERT for create scenarios, UPDATE-only for modify/remove scenarios.
   */
  private async updateTotalRevenueDelta(
    carId: string,
    homeCurrency: string,
    kindId: number,
    countDelta: number,
    amountDelta: number | null,
  ): Promise<void> {
    // Early return if no changes
    if (countDelta === 0 && amountDelta == null) return;

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_TOTAL_REVENUES;

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
      INSERT INTO ${this.schema}.${TABLES.CAR_TOTAL_REVENUES} 
        (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY}, ${FIELDS.REVENUE_KIND_ID}, ${FIELDS.RECORDS_COUNT}, ${FIELDS.AMOUNT})
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.HOME_CURRENCY}, ${FIELDS.REVENUE_KIND_ID})
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
      UPDATE ${this.schema}.${TABLES.CAR_TOTAL_REVENUES}
      SET ${updates.join(', ')}
      WHERE ${FIELDS.CAR_ID} = ? 
        AND ${FIELDS.HOME_CURRENCY} = ? 
        AND ${FIELDS.REVENUE_KIND_ID} = ?
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

  /**
 * Update monthly revenue (by kind) with delta.
 * Uses UPSERT for create scenarios, UPDATE-only for modify/remove scenarios.
 */
  private async updateMonthlyRevenueDelta(
    monthlySummaryId: string,
    kindId: number,
    countDelta: number,
    amountDelta: number | null,
  ): Promise<void> {
    // Early return if no changes
    if (countDelta === 0 && amountDelta == null) return;

    // Table alias for clarity in ON CONFLICT DO UPDATE
    const t = TABLES.CAR_MONTHLY_REVENUES;

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
      INSERT INTO ${this.schema}.${TABLES.CAR_MONTHLY_REVENUES} 
        (${FIELDS.CAR_MONTHLY_SUMMARY_ID}, ${FIELDS.REVENUE_KIND_ID}, ${FIELDS.RECORDS_COUNT}, ${FIELDS.AMOUNT})
      VALUES (?, ?, ?, ?)
      ON CONFLICT (${FIELDS.CAR_MONTHLY_SUMMARY_ID}, ${FIELDS.REVENUE_KIND_ID})
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
      UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_REVENUES}
      SET ${updates.join(', ')}
      WHERE ${FIELDS.CAR_MONTHLY_SUMMARY_ID} = ? 
        AND ${FIELDS.REVENUE_KIND_ID} = ?
    `;

      await this.db.runRawQuery(sql, [...bindings, monthlySummaryId, kindId]);
    }
  }

  // ===========================================================================
  // Private Methods - Travel Delta Operations
  // ===========================================================================

  /**
   * Update total summary travel stats with delta.
   * Travels are currency-independent, so this updates ALL currency rows for the car.
   */
  private async updateTotalSummaryTravelDelta(
    carId: string,
    countDelta: number,
    distanceDelta: number,
    lastRecordOdometer?: number | null,  // NEW parameter
  ): Promise<void> {
    // Skip if no changes
    if (countDelta === 0 && distanceDelta === 0 && lastRecordOdometer == null) return;

    const updates: string[] = [];
    const bindings: any[] = [];

    if (countDelta !== 0) {
      updates.push(`${FIELDS.TOTAL_TRAVELS_COUNT} = GREATEST(COALESCE(${FIELDS.TOTAL_TRAVELS_COUNT}, 0) + ?, 0)`);
      bindings.push(countDelta);
    }

    if (distanceDelta !== 0) {
      updates.push(`${FIELDS.TOTAL_TRAVELS_DISTANCE} = GREATEST(COALESCE(${FIELDS.TOTAL_TRAVELS_DISTANCE}, 0) + ?, 0)`);
      bindings.push(distanceDelta);
    }

    // NEW: Update latest_known_mileage if odometer provided
    if (lastRecordOdometer != null) {
      updates.push(`${FIELDS.LATEST_KNOWN_MILEAGE} = GREATEST(COALESCE(${FIELDS.LATEST_KNOWN_MILEAGE}, 0), ?)`);
      bindings.push(lastRecordOdometer);
    }

    updates.push(`${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP`);

    const sql = `
    UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES}
    SET ${updates.join(', ')}
    WHERE ${FIELDS.CAR_ID} = ?
  `;

    await this.db.runRawQuery(sql, [...bindings, carId]);
  }

  /**
   * Update monthly summary travel stats with delta.
   * Travels are currency-independent, so this updates ALL currency rows for the car/year/month.
   */
  private async updateMonthlySummaryTravelDelta(
    carId: string,
    year: number,
    month: number,
    countDelta: number,
    distanceDelta: number,
  ): Promise<void> {
    // Skip if no changes
    if (countDelta === 0 && distanceDelta === 0) return;

    const updates: string[] = [];
    const bindings: any[] = [];

    if (countDelta !== 0) {
      updates.push(`${FIELDS.TRAVELS_COUNT} = GREATEST(COALESCE(${FIELDS.TRAVELS_COUNT}, 0) + ?, 0)`);
      bindings.push(countDelta);
    }

    if (distanceDelta !== 0) {
      updates.push(`${FIELDS.TRAVELS_DISTANCE} = GREATEST(COALESCE(${FIELDS.TRAVELS_DISTANCE}, 0) + ?, 0)`);
      bindings.push(distanceDelta);
    }

    updates.push(`${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE ${this.schema}.${TABLES.CAR_MONTHLY_SUMMARIES}
      SET ${updates.join(', ')}
      WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.YEAR} = ? AND ${FIELDS.MONTH} = ?
    `;

    await this.db.runRawQuery(sql, [...bindings, carId, year, month]);
  }

  /**
   * Recalculate latest_travel_id for a car's total summaries.
   * Called after travel create/update/remove to ensure accuracy.
   */
  private async recalculateTotalSummaryLatestTravel(carId: string): Promise<void> {
    const sql = `
      UPDATE ${this.schema}.${TABLES.CAR_TOTAL_SUMMARIES} cts
      SET 
        ${FIELDS.LATEST_TRAVEL_ID} = (
          SELECT t.${FIELDS.ID}
          FROM ${this.schema}.${TABLES.TRAVELS} t
          WHERE t.${FIELDS.CAR_ID} = ?
            AND t.${FIELDS.STATUS} >= 200
            AND t.${FIELDS.REMOVED_AT} IS NULL
          ORDER BY COALESCE(t.${FIELDS.LAST_DTTM}, t.${FIELDS.FIRST_DTTM}, t.${FIELDS.CREATED_AT}) DESC
          LIMIT 1
        ),
        ${FIELDS.UPDATED_AT} = CURRENT_TIMESTAMP
      WHERE cts.${FIELDS.CAR_ID} = ?
    `;

    await this.db.runRawQuery(sql, [carId, carId]);
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

  /**
   * Get effective distance from travel params.
   * Prefers distanceKm, falls back to odometer calculation.
   */
  private getEffectiveDistance(params: TravelStatsParams): number {
    // Prefer pre-calculated distance_km
    if (params.distanceKm != null && params.distanceKm > 0) {
      return params.distanceKm;
    }

    // Fall back to odometer calculation
    if (params.lastOdometer != null && params.firstOdometer != null) {
      return Math.max(params.lastOdometer - params.firstOdometer, 0);
    }

    return 0;
  }

  /**
   * Get year-month string for a travel, using firstDttm with createdAt fallback.
   */
  private getTravelYearMonth(params: TravelStatsParams): string {
    const dateToUse = params.firstDttm || params.createdAt;
    return dayjs.utc(dateToUse).format('YYYY-MM');
  }

  /**
   * Check if a travel should be counted in stats.
   * Only completed travels (status >= 200) are counted.
   */
  private isTravelCountable(status: number): boolean {
    return status >= 200; // TRAVEL_STATUS.COMPLETED and beyond
  }
}

export { CarStatsUpdater, StatsOperationParams, TravelStatsParams };