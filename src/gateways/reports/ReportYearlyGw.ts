// ./src/gateways/reports/ReportYearlyGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, EXPENSE_TYPES } from '../../database';
import { GetYearlyDataParams, MonthlyBreakdownRaw, YearlyReportRawData, CurrencyAmountRaw } from '../../boundary';

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
   */
  private async getMonthlyHcAggregates(params: GetYearlyDataParams): Promise<
    Array<{
      month: number;
      refuelsCostHc: number;
      expensesCostHc: number;
      refuelsCountHc: number;
      expensesCountHc: number;
      refuelsVolumeLiters: number;
      startMileageKm: number | null;
      endMileageKm: number | null;
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

    const sql = `
      SELECT
        cms.${FIELDS.MONTH} AS month,
        COALESCE(SUM(cms.${FIELDS.REFUELS_COST}), 0) AS refuels_cost_hc,
        COALESCE(SUM(cms.${FIELDS.EXPENSES_COST}), 0) AS expenses_cost_hc,
        COALESCE(SUM(cms.${FIELDS.REFUELS_COUNT}), 0) AS refuels_count_hc,
        COALESCE(SUM(cms.${FIELDS.EXPENSES_COUNT}), 0) AS expenses_count_hc,
        COALESCE(SUM(cms.${FIELDS.REFUELS_VOLUME}), 0) AS refuels_volume_liters,
        MIN(cms.${FIELDS.START_MILEAGE}) AS start_mileage_km,
        MAX(cms.${FIELDS.END_MILEAGE}) AS end_mileage_km
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
      startMileageKm: row.start_mileage_km != null ? this.parseFloat(row.start_mileage_km) : null,
      endMileageKm: row.end_mileage_km != null ? this.parseFloat(row.end_mileage_km) : null,
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
      startMileageKm: number | null;
      endMileageKm: number | null;
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
        startMileageKm: hc?.startMileageKm ?? null,
        endMileageKm: hc?.endMileageKm ?? null,
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
