// ./src/gateways/reports/ReportTravelGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, EXPENSE_TYPES, TRANSFER_STATUS, TRAVEL_STATUS } from '../../database';

import {
  TravelReportFilter,
  TravelRaw,
  TravelTagRaw,
  LinkedExpenseTotalRaw,
  DestinationFallbackRaw,
  CarOdometerRangeRaw,
  PeriodExpenseBreakdownRaw,
  TravelTypeSummaryRaw,
  TravelReportRawData,
} from '../../boundary';

// =============================================================================
// Types
// =============================================================================

interface GetDataParams {
  accountId: string;
  carIds: string[];
  tagIds: string[];
  travelTypes: string[];
  dateFrom: string;
  dateTo: string;
}

// =============================================================================
// Gateway Class
// =============================================================================

class ReportTravelGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.TRAVELS,
      keyPrefix: 'reports-travel',
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
   * Get all data needed for the travel report
   */
  async getData(params: GetDataParams): Promise<TravelReportRawData> {
    const { accountId, carIds } = params;

    // First, get filtered travels
    const travels = await this.getTravelsWithFilters(params);
    const travelIds = travels.map((t) => t.id);

    // Then fetch related data in parallel
    const [
      travelTags,
      linkedExpenseTotals,
      destinationFallbacks,
      carOdometerRanges,
      periodExpenseBreakdown,
      travelTypeSummaries,
    ] = await Promise.all([
      this.getTravelTags(travelIds),
      this.getLinkedExpenseTotals(accountId, travelIds),
      this.getDestinationFallbacks(travels),
      this.getTotalDistanceInPeriod(params),
      this.getAllExpensesInPeriod(params),
      this.getTravelTypeSummaries(params),
    ]);

    return {
      travels,
      travelTags,
      linkedExpenseTotals,
      destinationFallbacks,
      carOdometerRanges,
      periodExpenseBreakdown,
      travelTypeSummaries,
      carIds,
    };
  }

  // ===========================================================================
  // Individual Query Methods
  // ===========================================================================

  /**
   * Get travels filtered by cars, tags, travel types, and date range
   */
  private async getTravelsWithFilters(params: GetDataParams): Promise<TravelRaw[]> {
    const schema = config.dbSchema;
    const { accountId, carIds, tagIds, travelTypes, dateFrom, dateTo } = params;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter (always required)
    conditions.push(`t.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car IDs filter (if provided)
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`t.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Travel types filter (if provided)
    if (travelTypes.length > 0) {
      const placeholders = travelTypes.map(() => '?').join(', ');
      conditions.push(`t.${FIELDS.TRAVEL_TYPE} IN (${placeholders})`);
      bindings.push(...travelTypes);
    }

    // Date range filter - travel falls within range if first_dttm is in range
    conditions.push(`t.${FIELDS.FIRST_DTTM} >= ?`);
    bindings.push(dateFrom);

    conditions.push(`t.${FIELDS.FIRST_DTTM} <= ?`);
    bindings.push(dateTo);

    // Active status
    conditions.push(`t.${FIELDS.STATUS} = ${TRAVEL_STATUS.COMPLETED}`);

    // Not deleted
    conditions.push(`t.${FIELDS.REMOVED_AT} IS NULL`);

    // Tag filter (if provided) - uses EXISTS subquery
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(', ');
      conditions.push(`EXISTS (
        SELECT 1 FROM ${schema}.${TABLES.TRAVEL_EXPENSE_TAGS} tet
        WHERE tet.${FIELDS.TRAVEL_ID} = t.${FIELDS.ID}
        AND tet.${FIELDS.EXPENSE_TAG_ID} IN (${tagPlaceholders})
      )`);
      bindings.push(...tagIds);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        t.${FIELDS.ID} AS id,
        t.${FIELDS.CAR_ID} AS car_id,
        t.${FIELDS.ACCOUNT_ID} AS account_id,
        t.${FIELDS.USER_ID} AS user_id,
        t.${FIELDS.IS_ACTIVE} AS is_active,
        t.${FIELDS.FIRST_ODOMETER} AS first_odometer_km,
        t.${FIELDS.LAST_ODOMETER} AS last_odometer_km,
        t.${FIELDS.FIRST_DTTM} AS first_dttm,
        t.${FIELDS.LAST_DTTM} AS last_dttm,
        t.${FIELDS.LABEL_ID} AS label_id,
        t.${FIELDS.PURPOSE} AS purpose,
        t.${FIELDS.DESTINATION} AS destination,
        t.${FIELDS.TRAVEL_TYPE} AS travel_type,
        t.${FIELDS.DISTANCE_KM} AS distance_km,
        t.${FIELDS.IS_ROUND_TRIP} AS is_round_trip,
        t.${FIELDS.REIMBURSEMENT_RATE} AS reimbursement_rate,
        t.${FIELDS.REIMBURSEMENT_RATE_CURRENCY} AS reimbursement_rate_currency,
        t.${FIELDS.CALCULATED_REIMBURSEMENT} AS calculated_reimbursement,
        t.${FIELDS.ACTIVE_MINUTES} AS active_minutes,
        t.${FIELDS.TOTAL_MINUTES} AS total_minutes,
        t.${FIELDS.LAST_RECORD_ID} AS last_record_id,
        t.${FIELDS.COMMENTS} AS comments,
        t.${FIELDS.STATUS} AS status
      FROM ${schema}.${TABLES.TRAVELS} t
      ${whereClause}
      ORDER BY t.${FIELDS.FIRST_DTTM} ASC
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    console.log('==== TRAVELS', rows);

    return rows.map((row: any) => this.mapTravelRow(row));
  }

  /**
   * Get tags for a list of travels (batch query)
   */
  private async getTravelTags(travelIds: string[]): Promise<TravelTagRaw[]> {
    if (travelIds.length === 0) {
      return [];
    }

    const schema = config.dbSchema;
    const placeholders = travelIds.map(() => '?').join(', ');

    const sql = `
      SELECT
        tet.${FIELDS.TRAVEL_ID} AS travel_id,
        et.${FIELDS.ID} AS tag_id,
        et.${FIELDS.TAG_NAME} AS tag_name,
        et.${FIELDS.TAG_COLOR} AS tag_color,
        tet.${FIELDS.ORDER_NO} AS order_no
      FROM ${schema}.${TABLES.TRAVEL_EXPENSE_TAGS} tet
      INNER JOIN ${schema}.${TABLES.EXPENSE_TAGS} et ON et.${FIELDS.ID} = tet.${FIELDS.EXPENSE_TAG_ID}
      WHERE tet.${FIELDS.TRAVEL_ID} IN (${placeholders})
        AND et.${FIELDS.REMOVED_AT} IS NULL
      ORDER BY tet.${FIELDS.TRAVEL_ID}, tet.${FIELDS.ORDER_NO}
    `;

    const result = await this.getDb().runRawQuery(sql, travelIds);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      travelId: row.travel_id,
      tagId: row.tag_id,
      tagName: row.tag_name,
      tagColor: row.tag_color,
      orderNo: this.parseFloat(row.order_no),
    }));
  }

  /**
   * Get linked expense totals grouped by travel_id and expense_type
   * Only includes expenses that have travel_id set (directly linked)
   */
  private async getLinkedExpenseTotals(
    accountId: string,
    travelIds: string[],
  ): Promise<LinkedExpenseTotalRaw[]> {
    if (travelIds.length === 0) {
      return [];
    }

    const schema = config.dbSchema;
    const placeholders = travelIds.map(() => '?').join(', ');

    const sql = `
      SELECT
        eb.${FIELDS.TRAVEL_ID} AS travel_id,
        eb.${FIELDS.EXPENSE_TYPE} AS expense_type,
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_price_hc,
        COALESCE(SUM(
          CASE WHEN eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL} 
          THEN r.${FIELDS.REFUEL_VOLUME} 
          ELSE 0 END
        ), 0) AS total_volume_liters,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      LEFT JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      WHERE eb.${FIELDS.ACCOUNT_ID} = ?
        AND eb.${FIELDS.TRAVEL_ID} IN (${placeholders})
        AND eb.${FIELDS.REMOVED_AT} IS NULL
      GROUP BY eb.${FIELDS.TRAVEL_ID}, eb.${FIELDS.EXPENSE_TYPE}
    `;

    const result = await this.getDb().runRawQuery(sql, [accountId, ...travelIds]);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      travelId: row.travel_id,
      expenseType: this.parseInt(row.expense_type),
      totalPriceHc: this.parseFloat(row.total_price_hc),
      totalVolumeLiters: row.total_volume_liters != null ? this.parseFloat(row.total_volume_liters) : null,
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  /**
   * Get destination fallbacks for travels with empty destination
   * Fetches where_done or location from the last_record_id expense_bases record
   */
  private async getDestinationFallbacks(travels: TravelRaw[]): Promise<DestinationFallbackRaw[]> {
    // Filter travels that need fallback (empty destination AND have last_record_id)
    const travelsNeedingFallback = travels.filter(
      (t) => (!t.destination || t.destination.trim() === '') && t.lastRecordId,
    );

    if (travelsNeedingFallback.length === 0) {
      return [];
    }

    const schema = config.dbSchema;

    // Build a map of last_record_id -> travel_id for quick lookup
    const recordToTravelMap = new Map<string, string>();
    for (const travel of travelsNeedingFallback) {
      if (travel.lastRecordId) {
        recordToTravelMap.set(travel.lastRecordId, travel.id);
      }
    }

    const recordIds = Array.from(recordToTravelMap.keys());
    const placeholders = recordIds.map(() => '?').join(', ');

    const sql = `
      SELECT
        eb.${FIELDS.ID} AS record_id,
        eb.${FIELDS.WHERE_DONE} AS where_done,
        eb.${FIELDS.LOCATION} AS location
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      WHERE eb.${FIELDS.ID} IN (${placeholders})
    `;

    const result = await this.getDb().runRawQuery(sql, recordIds);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      travelId: recordToTravelMap.get(row.record_id) || '',
      lastRecordId: row.record_id,
      whereDone: row.where_done,
      location: row.location,
    }));
  }

  /**
   * Get min/max odometer per car for calculating total distance in period
   * Uses ALL expense_bases records (regardless of travel_id)
   */
  private async getTotalDistanceInPeriod(params: GetDataParams): Promise<CarOdometerRangeRaw[]> {
    const schema = config.dbSchema;
    const { accountId, carIds, dateFrom, dateTo } = params;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter
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

    // Must have odometer
    conditions.push(`eb.${FIELDS.ODOMETER} IS NOT NULL`);

    // Not deleted
    conditions.push(`eb.${FIELDS.REMOVED_AT} IS NULL`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        eb.${FIELDS.CAR_ID} AS car_id,
        MIN(eb.${FIELDS.ODOMETER}) AS min_odometer_km,
        MAX(eb.${FIELDS.ODOMETER}) AS max_odometer_km,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      ${whereClause}
      GROUP BY eb.${FIELDS.CAR_ID}
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      carId: row.car_id,
      minOdometerKm: row.min_odometer_km != null ? this.parseFloat(row.min_odometer_km) : null,
      maxOdometerKm: row.max_odometer_km != null ? this.parseFloat(row.max_odometer_km) : null,
      recordsCount: this.parseInt(row.records_count),
    }));
  }

  /**
   * Get all expenses in period with breakdown by type
   * Used for the actual expense method calculation
   * Includes ALL expense_bases records for selected cars, regardless of travel_id
   */
  private async getAllExpensesInPeriod(params: GetDataParams): Promise<PeriodExpenseBreakdownRaw> {
    const schema = config.dbSchema;
    const { accountId, carIds, dateFrom, dateTo } = params;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter
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

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Query for refuels
    const refuelsSql = `
      SELECT
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COALESCE(SUM(r.${FIELDS.REFUEL_VOLUME}), 0) AS volume_liters,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REFUELS} r ON r.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REFUEL}
    `;

    // Query for maintenance expenses (is_it_maintenance = true)
    const maintenanceSql = `
      SELECT
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND ek.${FIELDS.IS_IT_MAINTENANCE} = true
    `;

    // Query for other expenses (is_it_maintenance = false)
    const otherExpensesSql = `
      SELECT
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
        AND ek.${FIELDS.IS_IT_MAINTENANCE} = false
    `;

    // Query for revenues
    const revenuesSql = `
      SELECT
        COALESCE(SUM(eb.${FIELDS.TOTAL_PRICE_IN_HC}), 0) AS total_hc,
        COUNT(*) AS records_count
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.REVENUES} rv ON rv.${FIELDS.ID} = eb.${FIELDS.ID}
      ${whereClause}
        AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.REVENUE}
    `;

    // Execute all queries in parallel
    const [refuelsResult, maintenanceResult, otherExpensesResult, revenuesResult] = await Promise.all([
      this.getDb().runRawQuery(refuelsSql, bindings),
      this.getDb().runRawQuery(maintenanceSql, bindings),
      this.getDb().runRawQuery(otherExpensesSql, bindings),
      this.getDb().runRawQuery(revenuesSql, bindings),
    ]);

    const refuelsRow = refuelsResult?.rows?.[0] || {};
    const maintenanceRow = maintenanceResult?.rows?.[0] || {};
    const otherExpensesRow = otherExpensesResult?.rows?.[0] || {};
    const revenuesRow = revenuesResult?.rows?.[0] || {};

    return {
      refuelsTotalHc: this.parseFloat(refuelsRow.total_hc),
      refuelsVolumeLiters: this.parseFloat(refuelsRow.volume_liters),
      refuelsCount: this.parseInt(refuelsRow.records_count),

      maintenanceTotalHc: this.parseFloat(maintenanceRow.total_hc),
      maintenanceCount: this.parseInt(maintenanceRow.records_count),

      otherExpensesTotalHc: this.parseFloat(otherExpensesRow.total_hc),
      otherExpensesCount: this.parseInt(otherExpensesRow.records_count),

      revenuesTotalHc: this.parseFloat(revenuesRow.total_hc),
      revenuesCount: this.parseInt(revenuesRow.records_count),
    };
  }

  /**
   * Get summary by travel type for filtered travels
   */
  private async getTravelTypeSummaries(params: GetDataParams): Promise<TravelTypeSummaryRaw[]> {
    const schema = config.dbSchema;
    const { accountId, carIds, tagIds, travelTypes, dateFrom, dateTo } = params;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Account ID filter
    conditions.push(`t.${FIELDS.ACCOUNT_ID} = ?`);
    bindings.push(accountId);

    // Car IDs filter (if provided)
    if (carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      conditions.push(`t.${FIELDS.CAR_ID} IN (${placeholders})`);
      bindings.push(...carIds);
    }

    // Travel types filter (if provided)
    if (travelTypes.length > 0) {
      const placeholders = travelTypes.map(() => '?').join(', ');
      conditions.push(`t.${FIELDS.TRAVEL_TYPE} IN (${placeholders})`);
      bindings.push(...travelTypes);
    }

    // Date range filter
    conditions.push(`t.${FIELDS.FIRST_DTTM} >= ?`);
    bindings.push(dateFrom);

    conditions.push(`t.${FIELDS.FIRST_DTTM} <= ?`);
    bindings.push(dateTo);

    // Active status
    conditions.push(`t.${FIELDS.STATUS} = ${TRAVEL_STATUS.COMPLETED}`);

    // Not deleted
    conditions.push(`t.${FIELDS.REMOVED_AT} IS NULL`);

    // Tag filter (if provided)
    if (tagIds.length > 0) {
      const tagPlaceholders = tagIds.map(() => '?').join(', ');
      conditions.push(`EXISTS (
        SELECT 1 FROM ${schema}.${TABLES.TRAVEL_EXPENSE_TAGS} tet
        WHERE tet.${FIELDS.TRAVEL_ID} = t.${FIELDS.ID}
        AND tet.${FIELDS.EXPENSE_TAG_ID} IN (${tagPlaceholders})
      )`);
      bindings.push(...tagIds);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT
        t.${FIELDS.TRAVEL_TYPE} AS travel_type,
        COUNT(*) AS trips_count,
        COALESCE(SUM(t.${FIELDS.DISTANCE_KM}), 0) AS total_distance_km
      FROM ${schema}.${TABLES.TRAVELS} t
      ${whereClause}
      GROUP BY t.${FIELDS.TRAVEL_TYPE}
      ORDER BY total_distance_km DESC
    `;

    const result = await this.getDb().runRawQuery(sql, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      travelType: row.travel_type,
      tripsCount: this.parseInt(row.trips_count),
      totalDistanceKm: this.parseFloat(row.total_distance_km),
    }));
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Map a database row to TravelRaw interface
   */
  private mapTravelRow(row: any): TravelRaw {
    return {
      id: row.id,
      carId: row.car_id,
      accountId: row.account_id,
      userId: row.user_id,
      isActive: row.is_active,
      firstOdometerKm: row.first_odometer_km != null ? this.parseFloat(row.first_odometer_km) : null,
      lastOdometerKm: row.last_odometer_km != null ? this.parseFloat(row.last_odometer_km) : null,
      firstDttm: row.first_dttm ? new Date(row.first_dttm) : null,
      lastDttm: row.last_dttm ? new Date(row.last_dttm) : null,
      labelId: row.label_id,
      purpose: row.purpose || '',
      destination: row.destination,
      travelType: row.travel_type,
      distanceKm: row.distance_km != null ? this.parseFloat(row.distance_km) : null,
      isRoundTrip: row.is_round_trip || false,
      reimbursementRate: row.reimbursement_rate != null ? this.parseFloat(row.reimbursement_rate) : null,
      reimbursementRateCurrency: row.reimbursement_rate_currency,
      calculatedReimbursement:
        row.calculated_reimbursement != null ? this.parseFloat(row.calculated_reimbursement) : null,
      activeMinutes: row.active_minutes != null ? this.parseInt(row.active_minutes) : null,
      totalMinutes: row.total_minutes != null ? this.parseInt(row.total_minutes) : null,
      lastRecordId: row.last_record_id,
      comments: row.comments,
      status: this.parseInt(row.status),
    };
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

export { ReportTravelGw };