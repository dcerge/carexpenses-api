// ./src/gateways/reports/ReportProfitabilityGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, EXPENSE_TYPES } from '../../database';

import {
  ProfitabilityReportRawData,
  ProfitabilityVehicleRaw,
  ProfitabilityMonthlyRaw,
  RevenueCategoryBreakdownRaw,
  RevenueKindBreakdownRaw,
  CategoryBreakdownRaw,
  KindBreakdownRaw,
  CurrencyAmountRaw,
  TripProfitabilityRaw,
  CarOdometerRangeRaw,
  OdometerWarningRaw,
} from '../../boundary';

// =============================================================================
// Types
// =============================================================================

interface GetDataParams {
  accountId: string;
  carIds: string[];
  tagIds: string[];
  dateFrom: string;
  dateTo: string;
  land?: string;
}

// =============================================================================
// Gateway Class
// =============================================================================

class ReportProfitabilityGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_BASES,
      keyPrefix: 'reports-profitability',
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

  // ===========================================================================
  // Main Data Method
  // ===========================================================================

  /**
   * Get all data needed for the profitability report
   */
  async getData(params: GetDataParams): Promise<ProfitabilityReportRawData> {
    const { accountId, carIds } = params;

    const [
      vehicleProfitability,
      monthlyTrend,
      revenueByCategory,
      revenueByKind,
      expensesByCategory,
      expensesByKind,
      foreignRevenueTotals,
      foreignExpenseTotals,
      carOdometerRanges,
      tripsWithRevenue,
      odometerWarningData,
    ] = await Promise.all([
      this.getVehicleProfitability(params),
      this.getMonthlyTrend(params),
      this.getRevenueByCategory(params),
      this.getRevenueByKind(params),
      this.getExpensesByCategory(params),
      this.getExpensesByKind(params),
      this.getForeignRevenueTotals(params),
      this.getForeignExpenseTotals(params),
      this.getCarOdometerRanges(params),
      this.getTripsWithRevenue(params),
      this.getOdometerWarningData(params),
    ]);

    return {
      vehicleProfitability,
      monthlyTrend,
      revenueByCategory,
      revenueByKind,
      expensesByCategory,
      expensesByKind,
      foreignRevenueTotals,
      foreignExpenseTotals,
      carOdometerRanges,
      tripsWithRevenue,
      odometerWarningData,
      carIds,
    };
  }

  // ===========================================================================
  // Per-Vehicle Profitability
  // ===========================================================================

  /**
   * Get revenue and expense totals per vehicle
   */
  private async getVehicleProfitability(params: GetDataParams): Promise<ProfitabilityVehicleRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');

    // Revenue per car
    const revenueSql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS revenue_hc,
        COUNT(*) AS revenue_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REVENUES} rv ON rv.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    // Refuels per car
    const refuelsSql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS refuels_hc,
        COUNT(*) AS refuels_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL}
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    // Maintenance per car
    const maintenanceSql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS maintenance_hc,
        COUNT(*) AS maintenance_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND ek.${FIELDS.IS_IT_MAINTENANCE} = true
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    // Other expenses per car (non-maintenance)
    const otherExpensesSql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS other_expenses_hc,
        COUNT(*) AS other_expenses_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND ek.${FIELDS.IS_IT_MAINTENANCE} = false
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    const [revenueResult, refuelsResult, maintenanceResult, otherResult] = await Promise.all([
      this.getDb().runRawQuery(revenueSql, [...bindings]),
      this.getDb().runRawQuery(refuelsSql, [...bindings]),
      this.getDb().runRawQuery(maintenanceSql, [...bindings]),
      this.getDb().runRawQuery(otherExpensesSql, [...bindings]),
    ]);

    // Build lookup maps by car_id
    const revenueMap = this.buildCarLookup(revenueResult?.rows || [], 'car_id');
    const refuelsMap = this.buildCarLookup(refuelsResult?.rows || [], 'car_id');
    const maintenanceMap = this.buildCarLookup(maintenanceResult?.rows || [], 'car_id');
    const otherMap = this.buildCarLookup(otherResult?.rows || [], 'car_id');

    // Merge all car IDs from all result sets
    const allCarIds = new Set<string>();
    for (const map of [revenueMap, refuelsMap, maintenanceMap, otherMap]) {
      for (const key of map.keys()) {
        allCarIds.add(key);
      }
    }

    return Array.from(allCarIds).map((carId) => {
      const rev = revenueMap.get(carId);
      const ref = refuelsMap.get(carId);
      const maint = maintenanceMap.get(carId);
      const other = otherMap.get(carId);

      return {
        carId,
        revenueHc: this.parseFloat(rev?.revenue_hc),
        revenueCount: this.parseInt(rev?.revenue_count),
        refuelsCostHc: this.parseFloat(ref?.refuels_hc),
        refuelsCount: this.parseInt(ref?.refuels_count),
        maintenanceCostHc: this.parseFloat(maint?.maintenance_hc),
        maintenanceCount: this.parseInt(maint?.maintenance_count),
        otherExpensesCostHc: this.parseFloat(other?.other_expenses_hc),
        otherExpensesCount: this.parseInt(other?.other_expenses_count),
      };
    });
  }

  // ===========================================================================
  // Monthly Trend
  // ===========================================================================

  /**
   * Get monthly revenue and expense breakdown for trend charts
   */
  private async getMonthlyTrend(params: GetDataParams): Promise<ProfitabilityMonthlyRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');

    // Revenue by month
    const revenueSql = `
      SELECT
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) AS year,
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}) AS month,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS revenue_hc,
        COUNT(*) AS revenue_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REVENUES} rv ON rv.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
      GROUP BY EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}), EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})
    `;

    // Refuels by month
    const refuelsSql = `
      SELECT
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) AS year,
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}) AS month,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS refuels_hc
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL}
      GROUP BY EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}), EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})
    `;

    // Maintenance by month
    const maintenanceSql = `
      SELECT
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) AS year,
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}) AS month,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS maintenance_hc
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND ek.${FIELDS.IS_IT_MAINTENANCE} = true
      GROUP BY EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}), EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})
    `;

    // Other expenses by month
    const otherExpensesSql = `
      SELECT
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) AS year,
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}) AS month,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS other_expenses_hc
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND ek.${FIELDS.IS_IT_MAINTENANCE} = false
      GROUP BY EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}), EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE})
    `;

    // Odometer per car per month (for distance calculation)
    const odometerSql = `
      SELECT
        EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}) AS year,
        EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}) AS month,
        eb.${FIELDS.CAR_ID} AS car_id,
        MIN(eb.${FIELDS.ODOMETER}) AS min_odometer,
        MAX(eb.${FIELDS.ODOMETER}) AS max_odometer
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.ODOMETER} IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM eb.${FIELDS.WHEN_DONE}), EXTRACT(MONTH FROM eb.${FIELDS.WHEN_DONE}), eb.${FIELDS.CAR_ID}
    `;

    const [revenueResult, refuelsResult, maintenanceResult, otherResult, odometerResult] = await Promise.all([
      this.getDb().runRawQuery(revenueSql, [...bindings]),
      this.getDb().runRawQuery(refuelsSql, [...bindings]),
      this.getDb().runRawQuery(maintenanceSql, [...bindings]),
      this.getDb().runRawQuery(otherExpensesSql, [...bindings]),
      this.getDb().runRawQuery(odometerSql, [...bindings]),
    ]);

    // Build month-key lookup maps
    const revenueMap = this.buildMonthLookup(revenueResult?.rows || []);
    const refuelsMap = this.buildMonthLookup(refuelsResult?.rows || []);
    const maintenanceMap = this.buildMonthLookup(maintenanceResult?.rows || []);
    const otherMap = this.buildMonthLookup(otherResult?.rows || []);

    // Calculate monthly distance from odometer data
    const monthlyDistanceMap = this.calculateMonthlyDistance(odometerResult?.rows || []);

    // Collect all unique year-month keys
    const allKeys = new Set<string>();
    for (const map of [revenueMap, refuelsMap, maintenanceMap, otherMap, monthlyDistanceMap]) {
      for (const key of map.keys()) {
        allKeys.add(key);
      }
    }

    // Build results sorted by year-month
    const results: ProfitabilityMonthlyRaw[] = Array.from(allKeys)
      .sort()
      .map((key) => {
        const [yearStr, monthStr] = key.split('-');
        const rev = revenueMap.get(key);
        const ref = refuelsMap.get(key);
        const maint = maintenanceMap.get(key);
        const other = otherMap.get(key);
        const distanceKm = monthlyDistanceMap.get(key) || 0;

        return {
          year: parseInt(yearStr, 10),
          month: parseInt(monthStr, 10),
          revenueHc: this.parseFloat(rev?.revenue_hc),
          revenueCount: this.parseInt(rev?.revenue_count),
          refuelsCostHc: this.parseFloat(ref?.refuels_hc),
          maintenanceCostHc: this.parseFloat(maint?.maintenance_hc),
          otherExpensesCostHc: this.parseFloat(other?.other_expenses_hc),
          distanceKm,
        };
      });

    return results;
  }

  // ===========================================================================
  // Revenue Breakdowns
  // ===========================================================================

  /**
   * Get revenue totals by category
   */
  private async getRevenueByCategory(params: GetDataParams): Promise<RevenueCategoryBreakdownRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');
    const lang = 'en'; // TODO: get from user profile

    const sql = `
      SELECT
        rc.${FIELDS.ID} AS category_id,
        rc.${FIELDS.CODE} AS category_code,
        COALESCE(rcl.${FIELDS.NAME}, rc.${FIELDS.CODE}) AS category_name,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count_hc,
        eb.${FIELDS.HOME_CURRENCY} AS currency
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REVENUES} rv ON rv.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.REVENUE_KINDS} rk ON rk.${FIELDS.ID} = rv.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.REVENUE_CATEGORIES} rc ON rc.${FIELDS.ID} = rk.${FIELDS.REVENUE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.REVENUE_CATEGORY_L10N} rcl
        ON rcl.${FIELDS.REVENUE_CATEGORY_ID} = rc.${FIELDS.ID} AND rcl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
      GROUP BY rc.${FIELDS.ID}, rc.${FIELDS.CODE}, rcl.${FIELDS.NAME}, eb.${FIELDS.HOME_CURRENCY}
      ORDER BY total_hc DESC
    `;

    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    // Aggregate HC and foreign currencies per category
    return this.aggregateCategoryRows(rows, 'category_id', 'category_code', 'category_name');
  }

  /**
   * Get revenue totals by kind
   */
  private async getRevenueByKind(params: GetDataParams): Promise<RevenueKindBreakdownRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');
    const lang = 'en'; // TODO: get from user profile

    const sql = `
      SELECT
        rk.${FIELDS.ID} AS kind_id,
        rk.${FIELDS.CODE} AS kind_code,
        COALESCE(rkl.${FIELDS.NAME}, rk.${FIELDS.CODE}) AS kind_name,
        rc.${FIELDS.ID} AS category_id,
        rc.${FIELDS.CODE} AS category_code,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count_hc,
        eb.${FIELDS.HOME_CURRENCY} AS currency
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REVENUES} rv ON rv.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.REVENUE_KINDS} rk ON rk.${FIELDS.ID} = rv.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.REVENUE_CATEGORIES} rc ON rc.${FIELDS.ID} = rk.${FIELDS.REVENUE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.REVENUE_KIND_L10N} rkl
        ON rkl.${FIELDS.REVENUE_KIND_ID} = rk.${FIELDS.ID} AND rkl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
      GROUP BY rk.${FIELDS.ID}, rk.${FIELDS.CODE}, rkl.${FIELDS.NAME}, rc.${FIELDS.ID}, rc.${FIELDS.CODE}, eb.${FIELDS.HOME_CURRENCY}
      ORDER BY total_hc DESC
    `;

    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return this.aggregateKindRows(rows);
  }

  // ===========================================================================
  // Expense Breakdowns (reuses pattern from ExpenseSummary)
  // ===========================================================================

  /**
   * Get expense totals by category (HC + foreign)
   */
  private async getExpensesByCategory(params: GetDataParams): Promise<CategoryBreakdownRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');
    const lang = 'en'; // TODO: get from user profile

    const sql = `
      SELECT
        ec.${FIELDS.ID} AS category_id,
        ec.${FIELDS.CODE} AS category_code,
        COALESCE(ecl.${FIELDS.NAME}, ec.${FIELDS.CODE}) AS category_name,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count_hc,
        eb.${FIELDS.HOME_CURRENCY} AS currency
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_CATEGORY_L10N} ecl
        ON ecl.${FIELDS.EXPENSE_CATEGORY_ID} = ec.${FIELDS.ID} AND ecl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
      GROUP BY ec.${FIELDS.ID}, ec.${FIELDS.CODE}, ecl.${FIELDS.NAME}, eb.${FIELDS.HOME_CURRENCY}
      ORDER BY total_hc DESC
    `;

    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return this.aggregateExpenseCategoryRows(rows);
  }

  /**
   * Get expense totals by kind (HC + foreign)
   */
  private async getExpensesByKind(params: GetDataParams): Promise<KindBreakdownRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');
    const lang = 'en'; // TODO: get from user profile

    const sql = `
      SELECT
        ek.${FIELDS.ID} AS kind_id,
        ek.${FIELDS.CODE} AS kind_code,
        COALESCE(ekl.${FIELDS.NAME}, ek.${FIELDS.CODE}) AS kind_name,
        ec.${FIELDS.ID} AS category_id,
        ec.${FIELDS.CODE} AS category_code,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count_hc,
        eb.${FIELDS.HOME_CURRENCY} AS currency
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_KIND_L10N} ekl
        ON ekl.${FIELDS.EXPENSE_KIND_ID} = ek.${FIELDS.ID} AND ekl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
      GROUP BY ek.${FIELDS.ID}, ek.${FIELDS.CODE}, ekl.${FIELDS.NAME}, ec.${FIELDS.ID}, ec.${FIELDS.CODE}, eb.${FIELDS.HOME_CURRENCY}
      ORDER BY total_hc DESC
    `;

    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return this.aggregateExpenseKindRows(rows);
  }

  // ===========================================================================
  // Foreign Currency Totals
  // ===========================================================================

  /**
   * Get foreign currency revenue totals (non-HC records)
   */
  private async getForeignRevenueTotals(params: GetDataParams): Promise<CurrencyAmountRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');

    const sql = `
      SELECT
        eb.${FIELDS.PAID_IN_CURRENCY} AS currency,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE}), 0) AS amount,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REVENUES} rv ON rv.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
        AND eb.${FIELDS.PAID_IN_CURRENCY} != COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY})
      GROUP BY eb.${FIELDS.PAID_IN_CURRENCY}
      ORDER BY amount DESC
    `;

    const result = await this.getDb().runRawQuery(sql, [...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      currency: row.currency,
      amount: this.parseFloat(row.amount),
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  /**
   * Get foreign currency expense totals (non-HC records, refuels + expenses)
   */
  private async getForeignExpenseTotals(params: GetDataParams): Promise<CurrencyAmountRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');

    const sql = `
      SELECT
        eb.${FIELDS.PAID_IN_CURRENCY} AS currency,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE}), 0) AS amount,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} IN (${EXPENSE_TYPES.REFUEL}, ${EXPENSE_TYPES.EXPENSE})
        AND eb.${FIELDS.PAID_IN_CURRENCY} != COALESCE(eb.${FIELDS.HOME_CURRENCY}, eb.${FIELDS.PAID_IN_CURRENCY})
      GROUP BY eb.${FIELDS.PAID_IN_CURRENCY}
      ORDER BY amount DESC
    `;

    const result = await this.getDb().runRawQuery(sql, [...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      currency: row.currency,
      amount: this.parseFloat(row.amount),
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  // ===========================================================================
  // Odometer Ranges
  // ===========================================================================

  /**
   * Get min/max odometer per car for total distance calculation
   */
  private async getCarOdometerRanges(params: GetDataParams): Promise<CarOdometerRangeRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');

    const sql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        MIN(eb.${FIELDS.ODOMETER}) AS min_odometer_km,
        MAX(eb.${FIELDS.ODOMETER}) AS max_odometer_km,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.ODOMETER} IS NOT NULL
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    const result = await this.getDb().runRawQuery(sql, [...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      carId: row.car_id,
      minOdometerKm: row.min_odometer_km != null ? this.parseFloat(row.min_odometer_km) : null,
      maxOdometerKm: row.max_odometer_km != null ? this.parseFloat(row.max_odometer_km) : null,
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  // ===========================================================================
  // Trips with Revenue (Per-Trip Profitability)
  // ===========================================================================

  /**
   * Get trips that have linked revenue records, with their expense totals
   */
  private async getTripsWithRevenue(params: GetDataParams): Promise<TripProfitabilityRaw[]> {
    const schema = config.dbSchema;
    const { accountId, carIds, tagIds, dateFrom, dateTo } = params;

    // Step 1: Find travel_ids that have at least one revenue record
    const travelConditions: string[] = [];
    const travelBindings: any[] = [];

    travelConditions.push(`eb.${FIELDS.ACCOUNT_ID} = ?`);
    travelBindings.push(accountId);

    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      travelConditions.push(`eb.${FIELDS.CAR_ID} IN (${placeholders})`);
      travelBindings.push(...carIds);
    }

    travelConditions.push(`eb.${FIELDS.WHEN_DONE} >= ?`);
    travelBindings.push(dateFrom);

    travelConditions.push(`eb.${FIELDS.WHEN_DONE} <= ?`);
    travelBindings.push(dateTo);

    travelConditions.push(`eb.${FIELDS.REMOVED_AT} IS NULL`);
    travelConditions.push(`eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}`);
    travelConditions.push(`eb.${FIELDS.TRAVEL_ID} IS NOT NULL`);

    // Tag filter
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(', ');
      travelConditions.push(`EXISTS (
        SELECT 1 FROM ${schema}.${TABLES.EXPENSE_EXPENSE_TAGS} eet
        WHERE eet.${FIELDS.EXPENSE_ID} = eb.${FIELDS.ID}
        AND eet.${FIELDS.EXPENSE_TAG_ID} IN (${tagPlaceholders})
      )`);
      travelBindings.push(...tagIds);
    }

    const travelWhere = `WHERE ${travelConditions.join(' AND ')}`;

    // Get travel IDs with revenue + travel details
    const travelsSql = `
      SELECT DISTINCT
        t.${FIELDS.ID} AS trip_id,
        t.${FIELDS.CAR_ID} AS car_id,
        t.${FIELDS.FIRST_DTTM} AS date,
        t.${FIELDS.PURPOSE} AS purpose,
        t.${FIELDS.DESTINATION} AS destination,
        t.${FIELDS.TRAVEL_TYPE} AS travel_type,
        t.${FIELDS.DISTANCE_KM} AS distance_km,
        t.${FIELDS.IS_ROUND_TRIP} AS is_round_trip
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.TRAVELS} t ON t.${FIELDS.ID} = eb.${FIELDS.TRAVEL_ID}
      ${travelWhere}
      ORDER BY t.${FIELDS.FIRST_DTTM} ASC
    `;

    const travelsResult = await this.getDb().runRawQuery(travelsSql, travelBindings);
    const travelRows = travelsResult?.rows || [];

    if (travelRows.length === 0) {
      return [];
    }

    const travelIds = travelRows.map((r: any) => r.trip_id);
    const travelPlaceholders = travelIds.map(() => '?').join(', ');

    // Step 2: Get revenue totals per travel_id
    const revenueTotalsSql = `
      SELECT
        eb.${FIELDS.TRAVEL_ID} AS travel_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS revenue_hc,
        COUNT(*) AS revenue_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      WHERE eb.${FIELDS.ACCOUNT_ID} = ?
        AND eb.${FIELDS.TRAVEL_ID} IN (${travelPlaceholders})
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
        AND eb.${FIELDS.REMOVED_AT} IS NULL
      GROUP BY eb.${FIELDS.TRAVEL_ID}
    `;

    // Step 3: Get refuels totals per travel_id
    const refuelTotalsSql = `
      SELECT
        eb.${FIELDS.TRAVEL_ID} AS travel_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS refuels_hc,
        COUNT(*) AS refuels_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      WHERE eb.${FIELDS.ACCOUNT_ID} = ?
        AND eb.${FIELDS.TRAVEL_ID} IN (${travelPlaceholders})
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL}
        AND eb.${FIELDS.REMOVED_AT} IS NULL
      GROUP BY eb.${FIELDS.TRAVEL_ID}
    `;

    // Step 4: Get expense totals per travel_id
    const expenseTotalsSql = `
      SELECT
        eb.${FIELDS.TRAVEL_ID} AS travel_id,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS expenses_hc,
        COUNT(*) AS expenses_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      WHERE eb.${FIELDS.ACCOUNT_ID} = ?
        AND eb.${FIELDS.TRAVEL_ID} IN (${travelPlaceholders})
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND eb.${FIELDS.REMOVED_AT} IS NULL
      GROUP BY eb.${FIELDS.TRAVEL_ID}
    `;

    // Step 5: Get tags per travel_id
    const tagsSql = `
      SELECT
        tet.${FIELDS.TRAVEL_ID} AS travel_id,
        et.${FIELDS.ID} AS tag_id,
        et.${FIELDS.TAG_NAME} AS tag_name,
        et.${FIELDS.TAG_COLOR} AS tag_color
      FROM ${schema}.${TABLES.TRAVEL_EXPENSE_TAGS} tet
      INNER JOIN ${schema}.${TABLES.EXPENSE_TAGS} et ON et.${FIELDS.ID} = tet.${FIELDS.EXPENSE_TAG_ID}
      WHERE tet.${FIELDS.TRAVEL_ID} IN (${travelPlaceholders})
        AND et.${FIELDS.REMOVED_AT} IS NULL
      ORDER BY tet.${FIELDS.TRAVEL_ID}, tet.${FIELDS.ORDER_NO}
    `;

    const [revenueResult, refuelsResult, expensesResult, tagsResult] = await Promise.all([
      this.getDb().runRawQuery(revenueTotalsSql, [accountId, ...travelIds]),
      this.getDb().runRawQuery(refuelTotalsSql, [accountId, ...travelIds]),
      this.getDb().runRawQuery(expenseTotalsSql, [accountId, ...travelIds]),
      this.getDb().runRawQuery(tagsSql, travelIds),
    ]);

    // Build lookup maps
    const revenueMap = this.buildTravelLookup(revenueResult?.rows || []);
    const refuelsMap = this.buildTravelLookup(refuelsResult?.rows || []);
    const expensesMap = this.buildTravelLookup(expensesResult?.rows || []);
    const tagsMap = this.buildTravelTagsLookup(tagsResult?.rows || []);

    return travelRows.map((row: any) => ({
      tripId: row.trip_id,
      carId: row.car_id,
      date: row.date ? new Date(row.date) : null,
      purpose: row.purpose || '',
      destination: row.destination || '',
      travelType: row.travel_type || '',
      distanceKm: row.distance_km != null ? this.parseFloat(row.distance_km) : null,
      isRoundTrip: row.is_round_trip || false,
      revenueHc: this.parseFloat(revenueMap.get(row.trip_id)?.revenue_hc),
      revenueCount: this.parseInt(revenueMap.get(row.trip_id)?.revenue_count),
      linkedRefuelsHc: this.parseFloat(refuelsMap.get(row.trip_id)?.refuels_hc),
      linkedExpensesHc: this.parseFloat(expensesMap.get(row.trip_id)?.expenses_hc),
      tags: (tagsMap.get(row.trip_id) || []).map((t: any) => ({
        tagId: t.tag_id,
        tagName: t.tag_name,
        tagColor: t.tag_color,
      })),
    }));
  }

  // ===========================================================================
  // Odometer Warning Data
  // ===========================================================================

  /**
   * Get odometer completeness and readings data per car for gap detection
   */
  private async getOdometerWarningData(params: GetDataParams): Promise<OdometerWarningRaw[]> {
    const schema = config.dbSchema;
    const { bindings, whereClause } = this.buildBaseConditions(params, 'eb');

    // Query 1: Count total records vs records with odometer per car
    const countsSql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        COUNT(*) AS total_records,
        COUNT(eb.${FIELDS.ODOMETER}) AS with_odometer
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    // Query 2: Ordered odometer readings per car for gap detection
    const readingsSql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        eb.${FIELDS.ODOMETER} AS odometer
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.ODOMETER} IS NOT NULL
      ORDER BY eb.${FIELDS.CAR_ID}, eb.${FIELDS.WHEN_DONE} ASC
    `;

    const [countsResult, readingsResult] = await Promise.all([
      this.getDb().runRawQuery(countsSql, [...bindings]),
      this.getDb().runRawQuery(readingsSql, [...bindings]),
    ]);

    const countsRows = countsResult?.rows || [];
    const readingsRows = readingsResult?.rows || [];

    // Group readings by car_id
    const readingsMap = new Map<string, number[]>();
    for (const row of readingsRows) {
      const carId = row.car_id;
      if (!readingsMap.has(carId)) {
        readingsMap.set(carId, []);
      }
      readingsMap.get(carId)!.push(this.parseFloat(row.odometer));
    }

    return countsRows.map((row: any) => {
      const carId = row.car_id;
      const totalRecords = this.parseInt(row.total_records);
      const recordsWithOdometer = this.parseInt(row.with_odometer);

      return {
        carId,
        totalRecords,
        recordsWithOdometer,
        recordsMissingOdometer: totalRecords - recordsWithOdometer,
        odometerReadings: readingsMap.get(carId) || [],
      };
    });
  }

  // ===========================================================================
  // Shared Helper Methods
  // ===========================================================================

  /**
   * Build common WHERE conditions for expense_bases queries
   */
  private buildBaseConditions(
    params: GetDataParams,
    alias: string,
  ): { conditions: string[]; bindings: any[]; whereClause: string } {
    const { accountId, carIds, tagIds, dateFrom, dateTo } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID (always required)
    conditions.push(`${alias}.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car IDs filter
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`${alias}.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Date range
    conditions.push(`${alias}.${FIELDS.WHEN_DONE} >= ?`);
    bindings.push(dateFrom);

    conditions.push(`${alias}.${FIELDS.WHEN_DONE} <= ?`);
    bindings.push(dateTo);

    // Not deleted
    conditions.push(`${alias}.${FIELDS.REMOVED_AT} IS NULL`);

    // Tag filter
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(', ');
      conditions.push(`EXISTS (
        SELECT 1 FROM ${schema}.${TABLES.EXPENSE_EXPENSE_TAGS} eet
        WHERE eet.${FIELDS.EXPENSE_ID} = ${alias}.${FIELDS.ID}
        AND eet.${FIELDS.EXPENSE_TAG_ID} IN (${tagPlaceholders})
      )`);
      bindings.push(...tagIds);
    }

    return {
      conditions,
      bindings,
      whereClause: `WHERE ${conditions.join(' AND ')}`,
    };
  }

  /**
   * Build a lookup map by car_id from query rows
   */
  private buildCarLookup(rows: any[], keyField: string): Map<string, any> {
    const map = new Map<string, any>();
    for (const row of rows) {
      map.set(row[keyField], row);
    }
    return map;
  }

  /**
   * Build a lookup map by year-month key
   */
  private buildMonthLookup(rows: any[]): Map<string, any> {
    const map = new Map<string, any>();
    for (const row of rows) {
      const key = `${this.parseInt(row.year)}-${String(this.parseInt(row.month)).padStart(2, '0')}`;
      map.set(key, row);
    }
    return map;
  }

  /**
   * Calculate monthly distance from odometer data (sum of max-min per car per month)
   */
  private calculateMonthlyDistance(rows: any[]): Map<string, number> {
    // Group by year-month, then sum (max - min) per car
    const carMonthMap = new Map<string, Map<string, { min: number; max: number }>>();

    for (const row of rows) {
      const key = `${this.parseInt(row.year)}-${String(this.parseInt(row.month)).padStart(2, '0')}`;
      const carId = row.car_id;

      if (!carMonthMap.has(key)) {
        carMonthMap.set(key, new Map());
      }

      const carMap = carMonthMap.get(key)!;
      const minOdo = this.parseFloat(row.min_odometer);
      const maxOdo = this.parseFloat(row.max_odometer);

      if (!carMap.has(carId)) {
        carMap.set(carId, { min: minOdo, max: maxOdo });
      } else {
        const existing = carMap.get(carId)!;
        existing.min = Math.min(existing.min, minOdo);
        existing.max = Math.max(existing.max, maxOdo);
      }
    }

    const distanceMap = new Map<string, number>();
    for (const [key, carMap] of carMonthMap) {
      let totalDistance = 0;
      for (const { min, max } of carMap.values()) {
        totalDistance += Math.max(0, max - min);
      }
      distanceMap.set(key, totalDistance);
    }

    return distanceMap;
  }

  /**
   * Build a lookup map by travel_id from aggregated query rows
   */
  private buildTravelLookup(rows: any[]): Map<string, any> {
    const map = new Map<string, any>();
    for (const row of rows) {
      map.set(row.travel_id, row);
    }
    return map;
  }

  /**
   * Build a lookup map of tags grouped by travel_id
   */
  private buildTravelTagsLookup(rows: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();
    for (const row of rows) {
      if (!map.has(row.travel_id)) {
        map.set(row.travel_id, []);
      }
      map.get(row.travel_id)!.push(row);
    }
    return map;
  }

  // ===========================================================================
  // Aggregation Helpers (HC + Foreign Currency)
  // ===========================================================================

  /**
   * Aggregate revenue category rows: merge HC rows, separate foreign currency rows
   */
  private aggregateCategoryRows(
    rows: any[],
    idField: string,
    codeField: string,
    nameField: string,
  ): RevenueCategoryBreakdownRaw[] {
    const map = new Map<number, RevenueCategoryBreakdownRaw>();

    for (const row of rows) {
      const catId = this.parseInt(row[idField]);
      const isHc = row.currency != null; // HC rows have home_currency set

      if (!map.has(catId)) {
        map.set(catId, {
          categoryId: catId,
          categoryCode: row[codeField],
          categoryName: row[nameField],
          totalAmountHc: 0,
          recordsCountHc: 0,
          foreignCurrencies: [],
        });
      }

      const entry = map.get(catId)!;

      // All rows grouped by home_currency — accumulate HC totals
      entry.totalAmountHc += this.parseFloat(row.total_hc);
      entry.recordsCountHc += this.parseInt(row.records_count_hc);
    }

    return Array.from(map.values());
  }

  /**
   * Aggregate revenue kind rows
   */
  private aggregateKindRows(rows: any[]): RevenueKindBreakdownRaw[] {
    const map = new Map<number, RevenueKindBreakdownRaw>();

    for (const row of rows) {
      const kindId = this.parseInt(row.kind_id);

      if (!map.has(kindId)) {
        map.set(kindId, {
          kindId,
          kindCode: row.kind_code,
          kindName: row.kind_name,
          categoryId: this.parseInt(row.category_id),
          categoryCode: row.category_code,
          totalAmountHc: 0,
          recordsCountHc: 0,
          foreignCurrencies: [],
        });
      }

      const entry = map.get(kindId)!;
      entry.totalAmountHc += this.parseFloat(row.total_hc);
      entry.recordsCountHc += this.parseInt(row.records_count_hc);
    }

    return Array.from(map.values());
  }

  /**
   * Aggregate expense category rows (same pattern as revenue)
   */
  private aggregateExpenseCategoryRows(rows: any[]): CategoryBreakdownRaw[] {
    const map = new Map<number, CategoryBreakdownRaw>();

    for (const row of rows) {
      const catId = this.parseInt(row.category_id);

      if (!map.has(catId)) {
        map.set(catId, {
          categoryId: catId,
          categoryCode: row.category_code,
          categoryName: row.category_name,
          totalAmountHc: 0,
          recordsCountHc: 0,
          foreignCurrencies: [],
        });
      }

      const entry = map.get(catId)!;
      entry.totalAmountHc += this.parseFloat(row.total_hc);
      entry.recordsCountHc += this.parseInt(row.records_count_hc);
    }

    return Array.from(map.values());
  }

  /**
   * Aggregate expense kind rows
   */
  private aggregateExpenseKindRows(rows: any[]): KindBreakdownRaw[] {
    const map = new Map<number, KindBreakdownRaw>();

    for (const row of rows) {
      const kindId = this.parseInt(row.kind_id);

      if (!map.has(kindId)) {
        map.set(kindId, {
          kindId,
          kindCode: row.kind_code,
          kindName: row.kind_name,
          categoryId: this.parseInt(row.category_id),
          categoryCode: row.category_code,
          totalAmountHc: 0,
          recordsCountHc: 0,
          foreignCurrencies: [],
        });
      }

      const entry = map.get(kindId)!;
      entry.totalAmountHc += this.parseFloat(row.total_hc);
      entry.recordsCountHc += this.parseInt(row.records_count_hc);
    }

    return Array.from(map.values());
  }

  // ===========================================================================
  // Parse Helpers
  // ===========================================================================

  private parseFloat(value: any): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  private parseInt(value: any): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}

export { ReportProfitabilityGw };