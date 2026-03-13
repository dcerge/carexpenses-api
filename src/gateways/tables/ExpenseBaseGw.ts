import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';
import { logger } from '../../logger';
import { EXPENSE_TYPES } from '../../boundary';

class ExpenseBaseGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_BASES,
      hasStatus: true,
      hasVersion: true,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: true,
      hasCreatedBy: true,
      hasUpdatedBy: true,
      hasRemovedBy: true,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.EXPENSE_BASES}.*`],
      idField: `${TABLES.EXPENSE_BASES}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [STATUSES.ACTIVE],
      defaultSorting: [
        {
          name: FIELDS.WHEN_DONE,
          order: SORT_ORDER.DESC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const {
      accountId,
      userId,
      carId,
      expenseType,
      travelId,
      dateFrom,
      dateTo,
      kindId,
      searchKeyword,
      withOdometer,
      expenseScheduleId,
      pointType,
      tireSetId
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId) {
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId) {
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (expenseType) {
      query.whereIn(FIELDS.EXPENSE_TYPE, castArray(expenseType));
    }

    if (travelId) {
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (expenseScheduleId) {
      query.whereIn(FIELDS.EXPENSE_SCHEDULE_ID, castArray(expenseScheduleId));
    }

    if (dateFrom) {
      query.where(FIELDS.WHEN_DONE, '>=', dateFrom);
    }

    if (dateTo) {
      query.where(FIELDS.WHEN_DONE, '<=', dateTo);
    }

    if (withOdometer != null) {
      if (withOdometer) {
        query.whereNotNull(FIELDS.ODOMETER);
      } else {
        query.whereNull(FIELDS.ODOMETER);
      }
    }

    // New filter for travel waypoint type
    if (pointType) {
      query.whereIn(FIELDS.POINT_TYPE, castArray(pointType));
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(FIELDS.LOCATION, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.WHERE_DONE, 'ilike', `%${searchKeyword}%`);
      });
    }

    if (kindId) {
      const self = this;
      const kindIds = castArray(kindId);
      query.innerJoin(TABLES.EXPENSES, function (table: any) {
        table.on(`${TABLES.EXPENSES}.${FIELDS.ID}`, '=', `${TABLES.EXPENSE_BASES}.${FIELDS.ID}`);
        table.andOn(self.getDb().raw(
          `${TABLES.EXPENSES}.${FIELDS.KIND_ID} IN (${kindIds.map(() => '?').join(',')})`,
          kindIds
        ));
      });
    }

    if (tireSetId) {
      const self = this;
      query.innerJoin(TABLES.EXPENSES, function (table: any) {
        table.on(`${TABLES.EXPENSES}.${FIELDS.ID}`, '=', `${TABLES.EXPENSE_BASES}.${FIELDS.ID}`);
        table.andOn(`${TABLES.EXPENSES}.${FIELDS.TIRE_SET_ID}`, '=', self.getDb().raw('?', tireSetId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId, travelId, expenseType, id } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (travelId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (expenseType != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_TYPE, castArray(expenseType));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId, travelId, expenseType, id } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (travelId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (expenseType != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_TYPE, castArray(expenseType));
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, userId, carId, expenseType, travelId, pointType } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (accountId) {
      sqlFilter.push(`${FIELDS.ACCOUNT_ID} = ?`);
      bindings.push(accountId);
    }

    if (userId) {
      sqlFilter.push(`${FIELDS.USER_ID} = ?`);
      bindings.push(userId);
    }

    if (carId) {
      sqlFilter.push(`${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (expenseType) {
      sqlFilter.push(`${FIELDS.EXPENSE_TYPE} = ?`);
      bindings.push(expenseType);
    }

    if (travelId) {
      sqlFilter.push(`${FIELDS.TRAVEL_ID} = ?`);
      bindings.push(travelId);
    }

    if (pointType) {
      sqlFilter.push(`${FIELDS.POINT_TYPE} = ?`);
      bindings.push(pointType);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.EXPENSE_BASES} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Fetch aggregate odometer statistics for multiple cars, grouped by car_id.
   * Used by VehicleFinancingCore for lease mileage tracking.
   *
   * For each car, returns the first/latest odometer readings and when_done dates,
   * filtered to active non-removed records that have odometer data.
   * The startDate per car allows filtering to only records within the lease term.
   *
   * Uses the partial index idx_eb_car_odometer_active for efficient index-only scans.
   *
   * @param params.accountId - Account ID for security filtering (required)
   * @param params.carStartDates - Map of carId -> startDate (ISO string) for per-car filtering
   * @returns Array of { carId, firstOdometer, latestOdometer, firstReadingDate, latestReadingDate, dataPoints }
   */
  async getOdometerStatsByCarIds(params: {
    accountId: string;
    carStartDates: Map<string, string>;
  }): Promise<
    Array<{
      carId: string;
      firstOdometer: number;
      latestOdometer: number;
      firstReadingDate: string;
      latestReadingDate: string;
      dataPoints: number;
    }>
  > {
    const { accountId, carStartDates } = params;

    if (!accountId || !carStartDates || carStartDates.size === 0) {
      return [];
    }

    const carIds = [...carStartDates.keys()];

    // Build CASE expression for per-car startDate filtering
    // Each car may have a different lease start date
    // Cast to timestamptz so PostgreSQL can compare with when_done column
    let startDateCase = '(CASE ';
    const caseBindings: any[] = [];
    for (const [carId, startDate] of carStartDates) {
      startDateCase += `WHEN ${FIELDS.CAR_ID} = ? THEN ?::timestamptz `;
      caseBindings.push(carId, startDate);
    }
    startDateCase += 'END)';

    // The CASE expression is repeated in three FILTER clauses
    const carIdPlaceholders = carIds.map(() => '?').join(',');

    const sql = `
      SELECT
        ${FIELDS.CAR_ID} AS "carId",
        MIN(${FIELDS.ODOMETER}) FILTER (WHERE ${FIELDS.WHEN_DONE} >= ${startDateCase}) AS "firstOdometer",
        MAX(${FIELDS.ODOMETER}) AS "latestOdometer",
        MIN(${FIELDS.WHEN_DONE}) FILTER (WHERE ${FIELDS.WHEN_DONE} >= ${startDateCase}) AS "firstReadingDate",
        MAX(${FIELDS.WHEN_DONE}) AS "latestReadingDate",
        COUNT(*) FILTER (WHERE ${FIELDS.WHEN_DONE} >= ${startDateCase}) AS "dataPoints"
      FROM ${config.dbSchema}.${TABLES.EXPENSE_BASES}
      WHERE ${FIELDS.CAR_ID} IN (${carIdPlaceholders})
        AND ${FIELDS.ACCOUNT_ID} = ?
        AND ${FIELDS.ODOMETER} IS NOT NULL
        AND ${FIELDS.STATUS} = ?
        AND ${FIELDS.REMOVED_AT} IS NULL
      GROUP BY ${FIELDS.CAR_ID}
    `;

    const bindings = [
      // Three repetitions of CASE bindings for the three FILTER clauses
      ...caseBindings,
      ...caseBindings,
      ...caseBindings,
      // WHERE clause bindings
      ...carIds,
      accountId,
      STATUSES.ACTIVE,
    ];

    const items = await this.getDb().runRawQuery(sql, bindings);

    if (!items?.rows) {
      return [];
    }

    const result = items.rows
      .filter((row: any) => row.firstOdometer != null && row.latestOdometer != null)
      .map((row: any) => ({
        carId: row.carId,
        firstOdometer: parseFloat(row.firstOdometer),
        latestOdometer: parseFloat(row.latestOdometer),
        firstReadingDate: row.firstReadingDate,
        latestReadingDate: row.latestReadingDate,
        dataPoints: parseInt(row.dataPoints, 10) || 0,
      }));

    return result;
  }

  /**
   * Fetch all MAINTENANCE and REPAIRS expenses for a single car,
   * joined with expense kind and category localization tables.
   * Used exclusively by ReportCarHandoverCore.
   *
   * Filters:
   *   - expense_type = 2 (expenses only, no refuels)
   *   - expense_categories.code IN ('MAINTENANCE', 'REPAIRS')
   *   - status = ACTIVE
   *   - removed_at IS NULL
   *   - account_id = accountId (security)
   *   - car_id = carId
   *
   * Odometer is returned as-is in km (stored unit). Conversion to the
   * car's mileageIn unit happens in ReportCarHandoverCore.
   *
   * @param params.carId    - Car UUID to fetch records for
   * @param params.accountId - Account UUID for security filtering (required)
   * @param params.lang     - ISO 639-1 language code for localized names (default 'en')
   * @returns Array of HandoverRawRecord ordered by when_done DESC
   */
  async listForHandover(params: {
    carId: string;
    accountId: string;
    lang: string;
  }): Promise<Array<{
    id: string;
    whenDone: string;
    odometer: number | null;
    whereDone: string | null;
    shortNote: string | null;
    comments: string | null;
    categoryCode: string;
    categoryName: string | null;
    kindCode: string;
    kindName: string | null;
  }>> {
    const { carId, accountId, lang } = params;

    if (!carId || !accountId) {
      return [];
    }

    const schema = config.dbSchema;

    const sql = `
      SELECT
        eb.${FIELDS.ID}                       AS "id",
        eb.${FIELDS.WHEN_DONE}                AS "whenDone",
        eb.${FIELDS.ODOMETER}                 AS "odometer",
        eb.${FIELDS.WHERE_DONE}               AS "whereDone",
        eb.${FIELDS.COMMENTS}                 AS "comments",
        e.${FIELDS.SHORT_NOTE}                AS "shortNote",
        ec.${FIELDS.CODE}                     AS "categoryCode",
        COALESCE(ecl.${FIELDS.NAME}, ecl_en.${FIELDS.NAME}) AS "categoryName",
        ek.${FIELDS.CODE}                     AS "kindCode",
        COALESCE(ekl.${FIELDS.NAME}, ekl_en.${FIELDS.NAME}) AS "kindName"
      FROM ${schema}.${TABLES.EXPENSE_BASES} eb
      INNER JOIN ${schema}.${TABLES.EXPENSES} e
        ON e.${FIELDS.ID} = eb.${FIELDS.ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek
        ON ek.${FIELDS.ID} = e.${FIELDS.KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec
        ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_CATEGORY_L10N} ecl
        ON ecl.${FIELDS.EXPENSE_CATEGORY_ID} = ec.${FIELDS.ID}
        AND ecl.${FIELDS.LANG} = ?
      LEFT JOIN ${schema}.${TABLES.EXPENSE_CATEGORY_L10N} ecl_en
        ON ecl_en.${FIELDS.EXPENSE_CATEGORY_ID} = ec.${FIELDS.ID}
        AND ecl_en.${FIELDS.LANG} = 'en'
      LEFT JOIN ${schema}.${TABLES.EXPENSE_KIND_L10N} ekl
        ON ekl.${FIELDS.EXPENSE_KIND_ID} = ek.${FIELDS.ID}
        AND ekl.${FIELDS.LANG} = ?
      LEFT JOIN ${schema}.${TABLES.EXPENSE_KIND_L10N} ekl_en
        ON ekl_en.${FIELDS.EXPENSE_KIND_ID} = ek.${FIELDS.ID}
        AND ekl_en.${FIELDS.LANG} = 'en'
      WHERE eb.${FIELDS.CAR_ID} = ?
        AND eb.${FIELDS.ACCOUNT_ID} = ?
        AND eb.${FIELDS.EXPENSE_TYPE} = ?
        AND eb.${FIELDS.STATUS} = ?
        AND eb.${FIELDS.REMOVED_AT} IS NULL
        AND ec.${FIELDS.CODE} IN ('MAINTENANCE', 'REPAIRS')
      ORDER BY eb.${FIELDS.WHEN_DONE} DESC
    `;

    const bindings = [
      lang,        // ecl.lang
      lang,        // ekl.lang
      carId,
      accountId,
      EXPENSE_TYPES.EXPENSE,
      STATUSES.ACTIVE,
    ];

    const result = await this.getDb().runRawQuery(sql, bindings);

    if (!result?.rows) {
      return [];
    }

    return result.rows.map((row: any) => ({
      id: row.id,
      whenDone: row.whenDone,
      odometer: row.odometer != null ? parseFloat(row.odometer) : null,
      whereDone: row.whereDone ?? null,
      shortNote: row.shortNote ?? null,
      comments: row.comments ?? null,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName ?? null,
      kindCode: row.kindCode,
      kindName: row.kindName ?? null,
    }));
  }
}

export { ExpenseBaseGw };