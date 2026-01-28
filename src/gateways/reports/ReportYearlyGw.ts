// ./src/gateways/reports/ReportYearlyGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, EXPENSE_TYPES } from '../../database';
import { GetYearlyDataParams, MonthlyBreakdownRaw, YearlyReportRawData, CurrencyAmountRaw } from '../../boundary';
import { ConsumptionDataPoint, CarTankConfig } from '../../utils/consumptionCalculator';

// =============================================================================
// Gateway Class
// =============================================================================

class ReportYearlyGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_MONTHLY_SUMMARIES,
      keyPrefix: 'reports-yearly',
      hasStatus: false,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: false,
      hasUpdatedAt: false,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
    });
  }

  /**
   * Get yearly report data aggregated by month
   */
  async getData(params: GetYearlyDataParams): Promise<YearlyReportRawData> {
    const [monthlyHcData, monthlyForeignData, vehiclesCount] = await Promise.all([
      this.getMonthlyHcAggregates(params),
      this.getMonthlyForeignAggregates(params),
      this.getVehiclesCount(params),
    ]);

    // Merge HC and foreign data by month
    const months = this.mergeMonthlyData(monthlyHcData, monthlyForeignData);

    return {
      year: params.year,
      months,
      vehiclesCount,
    };
  }

  /**
   * Get monthly HC aggregates from car_monthly_summaries
   * FIXED: Calculates mileage per vehicle first, then sums for accurate multi-vehicle totals
   */
  private async getMonthlyHcAggregates(params: GetYearlyDataParams): Promise<
    Array<{
      month: number;
      refuelsCostHc: number;
      expensesCostHc: number;
      refuelsCountHc: number;
      expensesCountHc: number;
      refuelsVolumeLiters: number;
      totalMileageKm: number | null;
    }>
  > {
    const { accountId, carIds, year } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Year filter
    conditions.push(`cms.${FIELDS.YEAR} = ?`);
    bindings.push(year);

    // Car IDs filter (if provided)
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`cms.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Account ID security filter via cars join
    conditions.push(`c.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car not deleted
    conditions.push(`c.${FIELDS.REMOVED_AT} IS NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // FIXED: Calculate mileage per vehicle, then sum
    // Previously used MIN(start_mileage) and MAX(end_mileage) which is wrong for multiple vehicles
    const sql = `
      SELECT
        cms.${FIELDS.MONTH} AS month,
        COALESCE(SUM(cms.${FIELDS.REFUELS_COST}), 0) AS refuels_cost_hc,
        COALESCE(SUM(cms.${FIELDS.EXPENSES_COST}), 0) AS expenses_cost_hc,
        COALESCE(SUM(cms.${FIELDS.REFUELS_COUNT}), 0) AS refuels_count_hc,
        COALESCE(SUM(cms.${FIELDS.EXPENSES_COUNT}), 0) AS expenses_count_hc,
        COALESCE(SUM(cms.${FIELDS.REFUELS_VOLUME}), 0) AS refuels_volume_liters,
        SUM(
          CASE 
            WHEN cms.${FIELDS.START_MILEAGE} IS NOT NULL AND cms.${FIELDS.END_MILEAGE} IS NOT NULL 
            THEN cms.${FIELDS.END_MILEAGE} - cms.${FIELDS.START_MILEAGE}
            ELSE 0 
          END
        ) AS total_mileage_km
      FROM ${schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
      INNER JOIN ${schema}.${TABLES.CARS} c ON c.${FIELDS.ID} = cms.${FIELDS.CAR_ID}
      ${whereClause}
      GROUP BY cms.${FIELDS.MONTH}
      ORDER BY cms.${FIELDS.MONTH}
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      month: this.parseInt(row.month),
      refuelsCostHc: this.parseFloat(row.refuels_cost_hc),
      expensesCostHc: this.parseFloat(row.expenses_cost_hc),
      refuelsCountHc: this.parseInt(row.refuels_count_hc),
      expensesCountHc: this.parseInt(row.expenses_count_hc),
      refuelsVolumeLiters: this.parseFloat(row.refuels_volume_liters),
      totalMileageKm: row.total_mileage_km != null ? this.parseFloat(row.total_mileage_km) : null,
    }));
  }

  /**
   * Get monthly foreign currency aggregates from expense_bases
   * (records where total_price_in_hc IS NULL)
   */
  private async getMonthlyForeignAggregates(params: GetYearlyDataParams): Promise<
    Array<{
      month: number;
      currency: string;
      expenseType: number;
      amount: number;
      recordsCount: number;
    }>
  > {
    const { accountId, carIds, year } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Year filter using EXTRACT
    conditions.push(`EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) = ?`);
    bindings.push(year);

    // Car IDs filter (if provided)
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`eb.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Account ID security filter
    conditions.push(`eb.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Not deleted
    conditions.push(`eb.${FIELDS.REMOVED_AT} IS NULL`);

    // Foreign currency only (no HC conversion)
    conditions.push(`eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})::INTEGER AS month,
        eb.${FIELDS.PAID_IN_CURRENCY} AS currency,
        eb.${FIELDS.EXPENSE_TYPE} AS expense_type,
        SUM(eb.${FIELDS.TOTAL_PRICE}) AS amount,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
      GROUP BY 
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}),
        eb.${FIELDS.PAID_IN_CURRENCY},
        eb.${FIELDS.EXPENSE_TYPE}
      ORDER BY month
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      month: this.parseInt(row.month),
      currency: row.currency,
      expenseType: this.parseInt(row.expense_type),
      amount: this.parseFloat(row.amount),
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  /**
   * Get count of distinct vehicles that have data for the year
   */
  private async getVehiclesCount(params: GetYearlyDataParams): Promise<number> {
    const { accountId, carIds, year } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Year filter
    conditions.push(`cms.${FIELDS.YEAR} = ?`);
    bindings.push(year);

    // Car IDs filter (if provided)
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`cms.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Account ID security filter via cars join
    conditions.push(`c.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car not deleted
    conditions.push(`c.${FIELDS.REMOVED_AT} IS NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT COUNT(DISTINCT cms.${FIELDS.CAR_ID}) AS vehicles_count
      FROM ${schema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
      INNER JOIN ${schema}.${TABLES.CARS} c ON c.${FIELDS.ID} = cms.${FIELDS.CAR_ID}
      ${whereClause}
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const row = result?.rows?.[0] || {};

    return this.parseInt(row.vehicles_count);
  }

  /**
   * Merge HC and foreign currency data by month
   */
  private mergeMonthlyData(
    hcData: Array<{
      month: number;
      refuelsCostHc: number;
      expensesCostHc: number;
      refuelsCountHc: number;
      expensesCountHc: number;
      refuelsVolumeLiters: number;
      totalMileageKm: number | null;
    }>,
    foreignData: Array<{
      month: number;
      currency: string;
      expenseType: number;
      amount: number;
      recordsCount: number;
    }>,
  ): MonthlyBreakdownRaw[] {
    // Create a map for HC data
    const hcMap = new Map<number, (typeof hcData)[0]>();
    for (const row of hcData) {
      hcMap.set(row.month, row);
    }

    // Group foreign data by month
    const foreignMap = new Map<
      number,
      {
        refuels: CurrencyAmountRaw[];
        expenses: CurrencyAmountRaw[];
      }
    >();

    for (const row of foreignData) {
      if (!foreignMap.has(row.month)) {
        foreignMap.set(row.month, { refuels: [], expenses: [] });
      }

      const monthForeign = foreignMap.get(row.month)!;
      const currencyAmount: CurrencyAmountRaw = {
        currency: row.currency,
        amount: row.amount,
        recordsCount: row.recordsCount,
      };

      if (row.expenseType === EXPENSE_TYPES.REFUEL) {
        monthForeign.refuels.push(currencyAmount);
      } else if (row.expenseType === EXPENSE_TYPES.EXPENSE) {
        monthForeign.expenses.push(currencyAmount);
      }
    }

    // Build result for all months that have data
    const result: MonthlyBreakdownRaw[] = [];
    const allMonths = new Set([...hcMap.keys(), ...foreignMap.keys()]);

    for (const month of Array.from(allMonths).sort((a, b) => a - b)) {
      const hc = hcMap.get(month);
      const foreign = foreignMap.get(month) || { refuels: [], expenses: [] };

      // Calculate total foreign records count
      const foreignRefuelsCount = foreign.refuels.reduce((sum, item) => sum + item.recordsCount, 0);
      const foreignExpensesCount = foreign.expenses.reduce((sum, item) => sum + item.recordsCount, 0);

      // Merge foreign currencies for totals
      const foreignCurrencyTotals = this.mergeCurrencyAmounts([...foreign.refuels, ...foreign.expenses]);

      result.push({
        month,
        refuelsCostHc: hc?.refuelsCostHc ?? 0,
        expensesCostHc: hc?.expensesCostHc ?? 0,
        refuelsCountHc: hc?.refuelsCountHc ?? 0,
        expensesCountHc: hc?.expensesCountHc ?? 0,
        refuelsVolumeLiters: hc?.refuelsVolumeLiters ?? 0,
        // FIXED: Now using totalMileageKm directly instead of start/end
        startMileageKm: null, // Deprecated - kept for interface compatibility
        endMileageKm: null,   // Deprecated - kept for interface compatibility
        totalMileageKm: hc?.totalMileageKm ?? null,
        foreignRefuels: foreign.refuels,
        foreignExpenses: foreign.expenses,
        foreignCurrencyTotals,
        totalForeignRecordsCount: foreignRefuelsCount + foreignExpensesCount,
        refuelsCount: (hc?.refuelsCountHc ?? 0) + foreignRefuelsCount,
        expensesCount: (hc?.expensesCountHc ?? 0) + foreignExpensesCount,
      });
    }

    return result;
  }

  // ===========================================================================
  // Consumption Data Methods
  // ===========================================================================

  /**
   * Get consumption data points for a specific month
   * Used for accurate monthly consumption calculation
   */
  async getMonthlyConsumptionDataPoints(params: {
    accountId: string;
    carIds: string[];
    year: number;
    month: number;
  }): Promise<ConsumptionDataPoint[]> {
    const { accountId, carIds, year, month } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter
    conditions.push(`eb.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car IDs filter
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`eb.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Year and month filter
    conditions.push(`EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) = ?`);
    bindings.push(year);
    conditions.push(`EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}) = ?`);
    bindings.push(month);

    // Not deleted
    conditions.push(`eb.${FIELDS.REMOVED_AT} IS NULL`);

    // Must have odometer
    conditions.push(`eb.${FIELDS.ODOMETER} IS NOT NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        eb.${FIELDS.ID} AS record_id,
        eb.${FIELDS.CAR_ID} AS car_id,
        eb.${FIELDS.ODOMETER} AS odometer_km,
        eb.${FIELDS.WHEN_DONE} AS when_done,
        eb.${FIELDS.EXPENSE_TYPE} AS expense_type,
        eb.${FIELDS.FUEL_IN_TANK} AS fuel_in_tank,
        r.${FIELDS.REFUEL_VOLUME} AS refuel_volume_liters,
        r.${FIELDS.IS_FULL_TANK} AS is_full_tank,
        r.${FIELDS.TANK_TYPE} AS tank_type
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      LEFT JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
      ORDER BY eb.${FIELDS.CAR_ID}, eb.${FIELDS.ODOMETER} ASC, eb.${FIELDS.WHEN_DONE} ASC
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      recordId: row.record_id,
      carId: row.car_id,
      odometerKm: this.parseFloat(row.odometer_km),
      whenDone: new Date(row.when_done),
      expenseType: this.parseInt(row.expense_type),
      fuelInTank: row.fuel_in_tank != null ? this.parseFloat(row.fuel_in_tank) : null,
      refuelVolumeLiters: row.refuel_volume_liters != null ? this.parseFloat(row.refuel_volume_liters) : null,
      isFullTank: row.is_full_tank,
      tankType: row.tank_type || null,
    }));
  }

  /**
   * Get consumption data points for entire year
   * Used for accurate annual consumption calculation
   */
  async getYearlyConsumptionDataPoints(params: GetYearlyDataParams): Promise<ConsumptionDataPoint[]> {
    const { accountId, carIds, year } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter
    conditions.push(`eb.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car IDs filter
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`eb.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Year filter
    conditions.push(`EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) = ?`);
    bindings.push(year);

    // Not deleted
    conditions.push(`eb.${FIELDS.REMOVED_AT} IS NULL`);

    // Must have odometer
    conditions.push(`eb.${FIELDS.ODOMETER} IS NOT NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        eb.${FIELDS.ID} AS record_id,
        eb.${FIELDS.CAR_ID} AS car_id,
        eb.${FIELDS.ODOMETER} AS odometer_km,
        eb.${FIELDS.WHEN_DONE} AS when_done,
        eb.${FIELDS.EXPENSE_TYPE} AS expense_type,
        eb.${FIELDS.FUEL_IN_TANK} AS fuel_in_tank,
        r.${FIELDS.REFUEL_VOLUME} AS refuel_volume_liters,
        r.${FIELDS.IS_FULL_TANK} AS is_full_tank,
        r.${FIELDS.TANK_TYPE} AS tank_type
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      LEFT JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
      ORDER BY eb.${FIELDS.CAR_ID}, eb.${FIELDS.ODOMETER} ASC, eb.${FIELDS.WHEN_DONE} ASC
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      recordId: row.record_id,
      carId: row.car_id,
      odometerKm: this.parseFloat(row.odometer_km),
      whenDone: new Date(row.when_done),
      expenseType: this.parseInt(row.expense_type),
      fuelInTank: row.fuel_in_tank != null ? this.parseFloat(row.fuel_in_tank) : null,
      refuelVolumeLiters: row.refuel_volume_liters != null ? this.parseFloat(row.refuel_volume_liters) : null,
      isFullTank: row.is_full_tank,
      tankType: row.tank_type || null,
    }));
  }

  /**
   * Get car tank configurations for consumption calculation
   */
  async getCarTankConfigs(params: { accountId: string; carIds: string[] }): Promise<CarTankConfig[]> {
    const { accountId, carIds } = params;
    const schema = config.dbSchema;

    if (carIds.length === 0) {
      return [];
    }

    const placeholders = carIds.map(() => '?').join(', ');

    const sql = `
      SELECT
        c.${FIELDS.ID} AS car_id,
        c.${FIELDS.MAIN_TANK_VOLUME} AS main_tank_volume_liters,
        c.${FIELDS.MAIN_TANK_FUEL_TYPE} AS main_tank_fuel_type,
        c.${FIELDS.ADDL_TANK_VOLUME} AS addl_tank_volume_liters,
        c.${FIELDS.ADDL_TANK_FUEL_TYPE} AS addl_tank_fuel_type
      FROM ${schema}.${TABLES.CARS} c
      WHERE c.${FIELDS.ACCOUNT_ID} = ?
        AND c.${FIELDS.ID} IN (${placeholders})
        AND c.${FIELDS.REMOVED_AT} IS NULL
    `;

    const result = await this.getDb().runRawQuery(sql, [accountId, ...carIds]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      carId: row.car_id,
      mainTankVolumeLiters: row.main_tank_volume_liters != null ? this.parseFloat(row.main_tank_volume_liters) : null,
      mainTankFuelType: row.main_tank_fuel_type,
      addlTankVolumeLiters: row.addl_tank_volume_liters != null ? this.parseFloat(row.addl_tank_volume_liters) : null,
      addlTankFuelType: row.addl_tank_fuel_type,
    }));
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Merge currency amounts by currency code
   */
  private mergeCurrencyAmounts(amounts: CurrencyAmountRaw[]): CurrencyAmountRaw[] {
    const currencyMap = new Map<string, CurrencyAmountRaw>();

    for (const item of amounts) {
      if (currencyMap.has(item.currency)) {
        const existing = currencyMap.get(item.currency)!;
        existing.amount += item.amount;
        existing.recordsCount += item.recordsCount;
      } else {
        currencyMap.set(item.currency, {
          currency: item.currency,
          amount: item.amount,
          recordsCount: item.recordsCount,
        });
      }
    }

    return Array.from(currencyMap.values());
  }

  /**
   * Safely parse float value
   */
  private parseFloat(value: any): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Safely parse integer value
   */
  private parseInt(value: any): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}

export { ReportYearlyGw };