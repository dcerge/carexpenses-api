import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES, TRAVEL_STATUS } from '../../database';

class TravelGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.TRAVELS,
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
      selectFields: [`${TABLES.TRAVELS}.*`],
      idField: `${TABLES.TRAVELS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [
        TRAVEL_STATUS.IN_PROGRESS,
        TRAVEL_STATUS.COMPLETED,
        TRAVEL_STATUS.APPROVED,
        TRAVEL_STATUS.REIMBURSED,
        TRAVEL_STATUS.REJECTED,
        TRAVEL_STATUS.SUBMITTED
      ],
      defaultSorting: [
        {
          name: FIELDS.FIRST_DTTM,
          order: SORT_ORDER.DESC,
        },
        {
          name: FIELDS.CREATED_AT,
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
      isActive,
      purpose,
      destination,
      searchKeyword,
      // New filters
      travelType,
      isRoundTrip,
      firstDttmFrom,
      firstDttmTo,
      lastDttmFrom,
      lastDttmTo,
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

    if (isActive != null) {
      query.where(FIELDS.IS_ACTIVE, isActive);
    }

    if (purpose) {
      query.whereIn(FIELDS.PURPOSE, castArray(purpose));
    }

    if (destination) {
      query.whereIn(FIELDS.DESTINATION, castArray(destination));
    }

    // New field filters
    if (travelType) {
      query.whereIn(FIELDS.TRAVEL_TYPE, castArray(travelType));
    }

    if (isRoundTrip != null) {
      query.where(FIELDS.IS_ROUND_TRIP, isRoundTrip);
    }

    // Date range filters for trip start
    if (firstDttmFrom) {
      query.where(FIELDS.FIRST_DTTM, '>=', firstDttmFrom);
    }

    if (firstDttmTo) {
      query.where(FIELDS.FIRST_DTTM, '<=', firstDttmTo);
    }

    // Date range filters for trip end
    if (lastDttmFrom) {
      query.where(FIELDS.LAST_DTTM, '>=', lastDttmFrom);
    }

    if (lastDttmTo) {
      query.where(FIELDS.LAST_DTTM, '<=', lastDttmTo);
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(FIELDS.PURPOSE, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.DESTINATION, 'ilike', `%${searchKeyword}%`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

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

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

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

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, userId, carId, travelType } = filterParams ?? {};

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

    if (travelType) {
      sqlFilter.push(`${FIELDS.TRAVEL_TYPE} = ?`);
      bindings.push(travelType);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.TRAVELS} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Get recent unique travel purposes for the given cars.
   * Deduplicates by normalized purpose, returning the most recent spelling.
   * Results are sorted by most recently used first.
   *
   * Uses the partial index: travels_purpose_lookup_idx
   * (account_id, car_id, purpose_normalized, first_dttm DESC)
   * WHERE removed_at IS NULL AND purpose IS NOT NULL AND purpose != ''
   *
   * @param carIds Array of car IDs to search
   * @param accountId Account ID for security filtering
   * @param limit Max number of purposes to return
   * @returns Array of { purpose: string } objects
   */
  async getRecentPurposes(
    carIds: string[],
    accountId: string,
    limit: number = 10,
  ): Promise<Array<{ purpose: string }>> {
    if (!carIds || carIds.length === 0) {
      return [];
    }

    const carPlaceholders = carIds.map(() => '?').join(', ');

    const query = `
      SELECT sub.purpose
      FROM (
        SELECT DISTINCT ON (LOWER(TRIM(t.purpose))) TRIM(t.purpose) AS purpose, t.first_dttm
        FROM ${config.dbSchema}.${TABLES.TRAVELS} t
        WHERE t.${FIELDS.CAR_ID} IN (${carPlaceholders})
          AND t.${FIELDS.ACCOUNT_ID} = ?
          AND t.${FIELDS.REMOVED_AT} IS NULL
          AND t.${FIELDS.PURPOSE} IS NOT NULL
          AND TRIM(t.${FIELDS.PURPOSE}) != ''
        ORDER BY LOWER(TRIM(t.purpose)), t.first_dttm DESC
      ) sub
      ORDER BY sub.first_dttm DESC
      LIMIT ?
    `;

    const bindings = [...carIds, accountId, limit];

    const result = await this.getDb().runRawQuery(query, bindings);

    return (result?.rows || []).map((row: any) => ({
      purpose: row.purpose,
    }));
  }
}

export { TravelGw };