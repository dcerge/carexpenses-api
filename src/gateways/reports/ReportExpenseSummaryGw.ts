// ./src/gateways/reports/ReportExpenseSummaryGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, EXPENSE_TYPES } from '../../database';

import {
  CategoryBreakdownRaw,
  CurrencyAmountRaw,
  ExpenseSummaryRawData,
  GetDataParams,
  KindBreakdownRaw,
} from '../../boundary';

// =============================================================================
// Gateway Class
// =============================================================================

class ReportExpenseSummaryGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_BASES,
      keyPrefix: 'reports-expense-summary',
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
   * Build the WHERE clause for filtering expense_bases
   * Returns [whereClause, bindings] - whereClause includes "WHERE" keyword
   */
  private buildBaseWhereClause(params: GetDataParams): [string, any[]] {
    const { accountId, carIds, tagIds, dateFrom, dateTo } = params;
    const schema = config.dbSchema;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter (always required)
    conditions.push(`eb.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car IDs filter (if provided)
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`eb.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Date range filter
    conditions.push(`eb.${FIELDS.WHEN_DONE} >= ?`);
    bindings.push(dateFrom);

    conditions.push(`eb.${FIELDS.WHEN_DONE} <= ?`);
    bindings.push(dateTo);

    // Not deleted
    conditions.push(`eb.${FIELDS.REMOVED_AT} IS NULL`);

    // Tag filter (if provided) - uses EXISTS subquery for compatibility
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(', ');
      conditions.push(`EXISTS (
        SELECT 1 FROM ${schema}.${TABLES.EXPENSE_EXPENSE_TAGS} eet
        WHERE eet.${FIELDS.EXPENSE_ID} = eb.${FIELDS.ID}
        AND eet.${FIELDS.EXPENSE_TAG_ID} IN (${tagPlaceholders})
      )`);
      bindings.push(...tagIds);
    }

    return [`WHERE ${conditions.join(' AND ')}`, bindings];
  }

  /**
   * Get aggregated report data using multiple simple queries
   */
  async getData(params: GetDataParams): Promise<ExpenseSummaryRawData> {
    const [
      totalsHc,
      totalsForeign,
      fuelTotals,
      mileageStats,
      recordCounts,
      byCategoryHc,
      byCategoryForeign,
      byKindHc,
      byKindForeign,
    ] = await Promise.all([
      this.getTotalsHc(params),
      this.getTotalsForeign(params),
      this.getFuelTotals(params),
      this.getMileageStats(params),
      this.getRecordCounts(params),
      this.getByCategoryHc(params),
      this.getByCategoryForeign(params),
      this.getByKindHc(params),
      this.getByKindForeign(params),
    ]);

    return {
      // HC totals
      totalCostHc: totalsHc.totalCostHc,
      refuelsCostHc: totalsHc.refuelsCostHc,
      expensesCostHc: totalsHc.expensesCostHc,
      refuelsCountHc: totalsHc.refuelsCountHc,
      expensesCountHc: totalsHc.expensesCountHc,

      // Foreign totals
      foreignCurrencyTotals: this.mapToBaseCurrencyAmount(totalsForeign),
      foreignRefuels: this.extractForeignRefuels(totalsForeign),
      foreignExpenses: this.extractForeignExpenses(totalsForeign),

      // Fuel
      totalVolumeLiters: fuelTotals.totalVolumeLiters,
      refuelsCount: fuelTotals.refuelsCount,

      // Mileage
      minOdometerKm: mileageStats.minOdometerKm,
      maxOdometerKm: mileageStats.maxOdometerKm,

      // Counts
      expensesCount: recordCounts.expensesCount,
      totalRecordsCount: recordCounts.totalRecordsCount,
      vehiclesCount: recordCounts.vehiclesCount,

      // Breakdowns
      byCategory: this.mergeCategoryBreakdown(byCategoryHc, byCategoryForeign),
      byKind: this.mergeKindBreakdown(byKindHc, byKindForeign),
    };
  }

  /**
   * Get HC totals (records with total_price_in_hc IS NOT NULL)
   */
  private async getTotalsHc(params: GetDataParams): Promise<{
    totalCostHc: number;
    refuelsCostHc: number;
    expensesCostHc: number;
    refuelsCountHc: number;
    expensesCountHc: number;
  }> {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);

    const sql = `
      SELECT
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_cost_hc,
        COALESCE(SUM(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL} THEN eb.${FIELDS.TOTAL_PRICE_IN_HC} ELSE 0 END), 0) AS refuels_cost_hc,
        COALESCE(SUM(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE} THEN eb.${FIELDS.TOTAL_PRICE_IN_HC} ELSE 0 END), 0) AS expenses_cost_hc,
        COUNT(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL} THEN 1 END) AS refuels_count_hc,
        COUNT(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE} THEN 1 END) AS expenses_count_hc
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NOT NULL
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const row = result?.rows?.[0] || {};

    return {
      totalCostHc: this.parseFloat(row.total_cost_hc),
      refuelsCostHc: this.parseFloat(row.refuels_cost_hc),
      expensesCostHc: this.parseFloat(row.expenses_cost_hc),
      refuelsCountHc: this.parseInt(row.refuels_count_hc),
      expensesCountHc: this.parseInt(row.expenses_count_hc),
    };
  }

  /**
   * Get foreign currency totals (records with total_price_in_hc IS NULL)
   */
  private async getTotalsForeign(params: GetDataParams): Promise<
    Array<{
      currency: string;
      amount: number;
      recordsCount: number;
      refuelsAmount: number;
      refuelsCount: number;
      expensesAmount: number;
      expensesCount: number;
    }>
  > {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);

    const sql = `
      SELECT
        eb.${FIELDS.PAID_IN_CURRENCY} AS currency,
        SUM(eb.${FIELDS.TOTAL_PRICE}) AS amount,
        COUNT(*) AS records_count,
        SUM(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL} THEN eb.${FIELDS.TOTAL_PRICE} ELSE 0 END) AS refuels_amount,
        COUNT(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL} THEN 1 END) AS refuels_count,
        SUM(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE} THEN eb.${FIELDS.TOTAL_PRICE} ELSE 0 END) AS expenses_amount,
        COUNT(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE} THEN 1 END) AS expenses_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NULL
      GROUP BY eb.${FIELDS.PAID_IN_CURRENCY}
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      currency: row.currency,
      amount: this.parseFloat(row.amount),
      recordsCount: this.parseInt(row.records_count),
      refuelsAmount: this.parseFloat(row.refuels_amount),
      refuelsCount: this.parseInt(row.refuels_count),
      expensesAmount: this.parseFloat(row.expenses_amount),
      expensesCount: this.parseInt(row.expenses_count),
    }));
  }

  /**
   * Get fuel totals (all refuels regardless of currency)
   */
  private async getFuelTotals(params: GetDataParams): Promise<{ totalVolumeLiters: number; refuelsCount: number }> {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);

    const sql = `
      SELECT
        COALESCE(SUM(r.${FIELDS.REFUEL_VOLUME}), 0) AS total_volume_liters,
        COUNT(*) AS refuels_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL}
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const row = result?.rows?.[0] || {};

    return {
      totalVolumeLiters: this.parseFloat(row.total_volume_liters),
      refuelsCount: this.parseInt(row.refuels_count),
    };
  }

  /**
   * Get mileage statistics (min/max odometer)
   */
  private async getMileageStats(
    params: GetDataParams,
  ): Promise<{ minOdometerKm: number | null; maxOdometerKm: number | null }> {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);

    const sql = `
      SELECT
        MIN(eb.${FIELDS.ODOMETER}) AS min_odometer_km,
        MAX(eb.${FIELDS.ODOMETER}) AS max_odometer_km
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
        AND eb.${FIELDS.ODOMETER} IS NOT NULL
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const row = result?.rows?.[0] || {};

    return {
      minOdometerKm: row.min_odometer_km != null ? this.parseFloat(row.min_odometer_km) : null,
      maxOdometerKm: row.max_odometer_km != null ? this.parseFloat(row.max_odometer_km) : null,
    };
  }

  /**
   * Get record counts
   */
  private async getRecordCounts(
    params: GetDataParams,
  ): Promise<{ totalRecordsCount: number; expensesCount: number; vehiclesCount: number }> {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);

    const sql = `
      SELECT
        COUNT(*) AS total_records_count,
        COUNT(CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE} THEN 1 END) AS expenses_count,
        COUNT(DISTINCT eb.${FIELDS.CAR_ID}) AS vehicles_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const row = result?.rows?.[0] || {};

    return {
      totalRecordsCount: this.parseInt(row.total_records_count),
      expensesCount: this.parseInt(row.expenses_count),
      vehiclesCount: this.parseInt(row.vehicles_count),
    };
  }

  /**
   * Get category breakdown for HC records
   * Joins expense_category_l10n for localized category names
   */
  private async getByCategoryHc(params: GetDataParams): Promise<
    Array<{
      categoryId: number;
      categoryCode: string;
      categoryName: string;
      totalAmountHc: number;
      recordsCountHc: number;
    }>
  > {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);
    const lang = params.lang || 'en';

    const sql = `
      SELECT
        ek.${FIELDS.EXPENSE_CATEGORY_ID} AS category_id,
        ec.${FIELDS.CODE} AS category_code,
        COALESCE(ecl.${FIELDS.NAME}, ec.${FIELDS.CODE}) AS category_name,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_amount_hc,
        COUNT(*) AS records_count_hc
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_CATEGORY_L10N} ecl 
        ON ecl.${FIELDS.EXPENSE_CATEGORY_ID} = ec.${FIELDS.ID} 
        AND ecl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NOT NULL
      GROUP BY ek.${FIELDS.EXPENSE_CATEGORY_ID}, ec.${FIELDS.CODE}, ecl.${FIELDS.NAME}
    `;

    // Add lang binding at the beginning (before WHERE clause bindings)
    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      categoryId: this.parseInt(row.category_id),
      categoryCode: row.category_code,
      categoryName: row.category_name,
      totalAmountHc: this.parseFloat(row.total_amount_hc),
      recordsCountHc: this.parseInt(row.records_count_hc),
    }));
  }

  /**
   * Get category breakdown for foreign currency records
   * Joins expense_category_l10n for localized category names
   */
  private async getByCategoryForeign(params: GetDataParams): Promise<
    Array<{
      categoryId: number;
      categoryCode: string;
      categoryName: string;
      currency: string;
      amount: number;
      recordsCount: number;
    }>
  > {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);
    const lang = params.lang || 'en';

    const sql = `
      SELECT
        ek.${FIELDS.EXPENSE_CATEGORY_ID} AS category_id,
        ec.${FIELDS.CODE} AS category_code,
        COALESCE(ecl.${FIELDS.NAME}, ec.${FIELDS.CODE}) AS category_name,
        eb.${FIELDS.PAID_IN_CURRENCY} AS currency,
        SUM(eb.${FIELDS.TOTAL_PRICE}) AS amount,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_CATEGORY_L10N} ecl 
        ON ecl.${FIELDS.EXPENSE_CATEGORY_ID} = ec.${FIELDS.ID} 
        AND ecl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NULL
      GROUP BY ek.${FIELDS.EXPENSE_CATEGORY_ID}, ec.${FIELDS.CODE}, ecl.${FIELDS.NAME}, eb.${FIELDS.PAID_IN_CURRENCY}
    `;

    // Add lang binding at the beginning (before WHERE clause bindings)
    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      categoryId: this.parseInt(row.category_id),
      categoryCode: row.category_code,
      categoryName: row.category_name,
      currency: row.currency,
      amount: this.parseFloat(row.amount),
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  /**
   * Get kind breakdown for HC records
   * Joins expense_kind_l10n for localized kind names
   */
  private async getByKindHc(params: GetDataParams): Promise<
    Array<{
      kindId: number;
      kindCode: string;
      kindName: string;
      categoryId: number;
      categoryCode: string;
      totalAmountHc: number;
      recordsCountHc: number;
    }>
  > {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);
    const lang = params.lang || 'en';

    const sql = `
      SELECT
        ek.${FIELDS.ID} AS kind_id,
        ek.${FIELDS.CODE} AS kind_code,
        COALESCE(ekl.${FIELDS.NAME}, ek.${FIELDS.CODE}) AS kind_name,
        ek.${FIELDS.EXPENSE_CATEGORY_ID} AS category_id,
        ec.${FIELDS.CODE} AS category_code,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_amount_hc,
        COUNT(*) AS records_count_hc
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_KIND_L10N} ekl 
        ON ekl.${FIELDS.EXPENSE_KIND_ID} = ek.${FIELDS.ID} 
        AND ekl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NOT NULL
      GROUP BY ek.${FIELDS.ID}, ek.${FIELDS.CODE}, ekl.${FIELDS.NAME}, ek.${FIELDS.EXPENSE_CATEGORY_ID}, ec.${FIELDS.CODE}
    `;

    // Add lang binding at the beginning (before WHERE clause bindings)
    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      kindId: this.parseInt(row.kind_id),
      kindCode: row.kind_code,
      kindName: row.kind_name,
      categoryId: this.parseInt(row.category_id),
      categoryCode: row.category_code,
      totalAmountHc: this.parseFloat(row.total_amount_hc),
      recordsCountHc: this.parseInt(row.records_count_hc),
    }));
  }

  /**
   * Get kind breakdown for foreign currency records
   * Joins expense_kind_l10n for localized kind names
   */
  private async getByKindForeign(params: GetDataParams): Promise<
    Array<{
      kindId: number;
      kindCode: string;
      kindName: string;
      categoryId: number;
      categoryCode: string;
      currency: string;
      amount: number;
      recordsCount: number;
    }>
  > {
    const schema = config.dbSchema;
    const [whereClause, bindings] = this.buildBaseWhereClause(params);
    const lang = params.lang || 'en';

    const sql = `
      SELECT
        ek.${FIELDS.ID} AS kind_id,
        ek.${FIELDS.CODE} AS kind_code,
        COALESCE(ekl.${FIELDS.NAME}, ek.${FIELDS.CODE}) AS kind_name,
        ek.${FIELDS.EXPENSE_CATEGORY_ID} AS category_id,
        ec.${FIELDS.CODE} AS category_code,
        eb.${FIELDS.PAID_IN_CURRENCY} AS currency,
        SUM(eb.${FIELDS.TOTAL_PRICE}) AS amount,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_KIND_L10N} ekl 
        ON ekl.${FIELDS.EXPENSE_KIND_ID} = ek.${FIELDS.ID} 
        AND ekl.${FIELDS.LANG} = ?
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND eb.${FIELDS.TOTAL_PRICE_IN_HC} IS NULL
      GROUP BY ek.${FIELDS.ID}, ek.${FIELDS.CODE}, ekl.${FIELDS.NAME}, ek.${FIELDS.EXPENSE_CATEGORY_ID}, ec.${FIELDS.CODE}, eb.${FIELDS.PAID_IN_CURRENCY}
    `;

    // Add lang binding at the beginning (before WHERE clause bindings)
    const result = await this.getDb().runRawQuery(sql, [lang, ...bindings]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      kindId: this.parseInt(row.kind_id),
      kindCode: row.kind_code,
      kindName: row.kind_name,
      categoryId: this.parseInt(row.category_id),
      categoryCode: row.category_code,
      currency: row.currency,
      amount: this.parseFloat(row.amount),
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  /**
   * Map foreign totals to base currency amount format
   */
  private mapToBaseCurrencyAmount(
    totalsForeign: Array<{ currency: string; amount: number; recordsCount: number }>,
  ): CurrencyAmountRaw[] {
    return totalsForeign.map((item) => ({
      currency: item.currency,
      amount: item.amount,
      recordsCount: item.recordsCount,
    }));
  }

  /**
   * Extract foreign refuels from foreign totals
   */
  private extractForeignRefuels(
    totalsForeign: Array<{ currency: string; refuelsAmount: number; refuelsCount: number }>,
  ): CurrencyAmountRaw[] {
    return totalsForeign
      .filter((item) => item.refuelsCount > 0)
      .map((item) => ({
        currency: item.currency,
        amount: item.refuelsAmount,
        recordsCount: item.refuelsCount,
      }));
  }

  /**
   * Extract foreign expenses from foreign totals
   */
  private extractForeignExpenses(
    totalsForeign: Array<{ currency: string; expensesAmount: number; expensesCount: number }>,
  ): CurrencyAmountRaw[] {
    return totalsForeign
      .filter((item) => item.expensesCount > 0)
      .map((item) => ({
        currency: item.currency,
        amount: item.expensesAmount,
        recordsCount: item.expensesCount,
      }));
  }

  /**
   * Merge HC and foreign category breakdowns
   */
  private mergeCategoryBreakdown(
    hcRows: Array<{
      categoryId: number;
      categoryCode: string;
      categoryName: string;
      totalAmountHc: number;
      recordsCountHc: number;
    }>,
    foreignRows: Array<{
      categoryId: number;
      categoryCode: string;
      categoryName: string;
      currency: string;
      amount: number;
      recordsCount: number;
    }>,
  ): CategoryBreakdownRaw[] {
    const categoryMap = new Map<number, CategoryBreakdownRaw>();

    // Add HC data
    for (const row of hcRows) {
      categoryMap.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        totalAmountHc: row.totalAmountHc,
        recordsCountHc: row.recordsCountHc,
        foreignCurrencies: [],
      });
    }

    // Add foreign currency data
    for (const row of foreignRows) {
      let category = categoryMap.get(row.categoryId);

      if (!category) {
        category = {
          categoryId: row.categoryId,
          categoryCode: row.categoryCode,
          categoryName: row.categoryName,
          totalAmountHc: 0,
          recordsCountHc: 0,
          foreignCurrencies: [],
        };
        categoryMap.set(row.categoryId, category);
      }

      category.foreignCurrencies.push({
        currency: row.currency,
        amount: row.amount,
        recordsCount: row.recordsCount,
      });
    }

    return Array.from(categoryMap.values());
  }

  /**
   * Merge HC and foreign kind breakdowns
   */
  private mergeKindBreakdown(
    hcRows: Array<{
      kindId: number;
      kindCode: string;
      kindName: string;
      categoryId: number;
      categoryCode: string;
      totalAmountHc: number;
      recordsCountHc: number;
    }>,
    foreignRows: Array<{
      kindId: number;
      kindCode: string;
      kindName: string;
      categoryId: number;
      categoryCode: string;
      currency: string;
      amount: number;
      recordsCount: number;
    }>,
  ): KindBreakdownRaw[] {
    const kindMap = new Map<number, KindBreakdownRaw>();

    // Add HC data
    for (const row of hcRows) {
      kindMap.set(row.kindId, {
        kindId: row.kindId,
        kindCode: row.kindCode,
        kindName: row.kindName,
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        totalAmountHc: row.totalAmountHc,
        recordsCountHc: row.recordsCountHc,
        foreignCurrencies: [],
      });
    }

    // Add foreign currency data
    for (const row of foreignRows) {
      let kind = kindMap.get(row.kindId);

      if (!kind) {
        kind = {
          kindId: row.kindId,
          kindCode: row.kindCode,
          kindName: row.kindName,
          categoryId: row.categoryId,
          categoryCode: row.categoryCode,
          totalAmountHc: 0,
          recordsCountHc: 0,
          foreignCurrencies: [],
        };
        kindMap.set(row.kindId, kind);
      }

      kind.foreignCurrencies.push({
        currency: row.currency,
        amount: row.amount,
        recordsCount: row.recordsCount,
      });
    }

    return Array.from(kindMap.values());
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

export {
  ReportExpenseSummaryGw,
  ExpenseSummaryRawData,
  CurrencyAmountRaw,
  CategoryBreakdownRaw,
  KindBreakdownRaw,
  GetDataParams,
};
