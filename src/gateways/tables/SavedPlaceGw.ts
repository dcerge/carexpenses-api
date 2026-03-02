// ./src/gateways/tables/SavedPlaceGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../../database';

class SavedPlaceGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.SAVED_PLACES,
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
      hasRemovedAtStr: true,
      filterByUserField: undefined,
      selectFields: [`${TABLES.SAVED_PLACES}.*`],
      idField: `${TABLES.SAVED_PLACES}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [STATUS.ACTIVE],
      defaultSorting: [
        {
          name: FIELDS.USE_COUNT,
          order: SORT_ORDER.DESC,
        },
        {
          name: FIELDS.LAST_USED_AT,
          order: SORT_ORDER.DESC,
        },
        {
          name: FIELDS.NAME,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const {
      accountId,
      placeType,
      isPrivate,
      createdBy,
      status,
      latitude,
      longitude,
      radiusM,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(`${TABLES.SAVED_PLACES}.${FIELDS.ACCOUNT_ID}`, castArray(accountId));
    }

    if (placeType) {
      query.whereIn(`${TABLES.SAVED_PLACES}.${FIELDS.PLACE_TYPE}`, castArray(placeType));
    }

    if (isPrivate !== undefined && isPrivate !== null) {
      query.where(`${TABLES.SAVED_PLACES}.${FIELDS.IS_PRIVATE}`, isPrivate);
    }

    if (createdBy) {
      query.whereIn(`${TABLES.SAVED_PLACES}.${FIELDS.CREATED_BY}`, castArray(createdBy));
    }

    if (status) {
      query.whereIn(`${TABLES.SAVED_PLACES}.${FIELDS.STATUS}`, castArray(status));
    }

    // Proximity filter using Haversine approximation
    if (latitude != null && longitude != null) {
      const radius = radiusM || 150;
      // Convert radius from meters to approximate degrees (1 degree ≈ 111,320 meters)
      const degreeApprox = radius / 111320;

      // Bounding box pre-filter for index usage
      query.whereBetween(`${TABLES.SAVED_PLACES}.${FIELDS.LATITUDE}`, [
        latitude - degreeApprox,
        latitude + degreeApprox,
      ]);
      query.whereBetween(`${TABLES.SAVED_PLACES}.${FIELDS.LONGITUDE}`, [
        longitude - degreeApprox,
        longitude + degreeApprox,
      ]);

      // Haversine distance filter using each place's own radius_m
      query.whereRaw(`
        (6371000 * acos(
          cos(radians(?)) * cos(radians(${FIELDS.LATITUDE})) *
          cos(radians(${FIELDS.LONGITUDE}) - radians(?)) +
          sin(radians(?)) * sin(radians(${FIELDS.LATITUDE}))
        )) <= COALESCE(${FIELDS.RADIUS_M}, ?)
      `, [latitude, longitude, latitude, radius]);
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(`${TABLES.SAVED_PLACES}.${FIELDS.NAME}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.SAVED_PLACES}.${FIELDS.WHERE_DONE}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.SAVED_PLACES}.${FIELDS.ADDRESS_1}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.SAVED_PLACES}.${FIELDS.CITY}`, 'ilike', `%${searchKeyword}%`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, id } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, id } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, placeType, isPrivate, status } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (accountId) {
      sqlFilter.push(`${FIELDS.ACCOUNT_ID} = ?`);
      bindings.push(accountId);
    }

    if (placeType) {
      sqlFilter.push(`${FIELDS.PLACE_TYPE} = ?`);
      bindings.push(placeType);
    }

    if (isPrivate !== undefined && isPrivate !== null) {
      sqlFilter.push(`${FIELDS.IS_PRIVATE} = ?`);
      bindings.push(isPrivate);
    }

    if (status) {
      sqlFilter.push(`${FIELDS.STATUS} = ?`);
      bindings.push(status);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.SAVED_PLACES} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Atomically increment use_count and update last_used_at for a saved place.
   * Also sets updated_by and updated_at.
   *
   * @param id The saved place ID
   * @param accountId Account ID for security filtering
   * @param userId User ID to set as updated_by
   */
  async touch(id: string, accountId: string, userId: string): Promise<void> {
    await this.getDb().runRawQuery(
      `UPDATE ${config.dbSchema}.${TABLES.SAVED_PLACES} 
       SET ${FIELDS.USE_COUNT} = COALESCE(${FIELDS.USE_COUNT}, 0) + 1, 
           ${FIELDS.LAST_USED_AT} = NOW(),
           ${FIELDS.UPDATED_BY} = ?,
           ${FIELDS.UPDATED_AT} = NOW()
       WHERE ${FIELDS.ID} = ? AND ${FIELDS.ACCOUNT_ID} = ? AND ${FIELDS.REMOVED_AT} IS NULL`,
      [userId, id, accountId],
    );
  }

  /**
   * Atomically decrement use_count on a saved place (minimum 0).
   * Also sets updated_by and updated_at.
   *
   * @param id The saved place ID
   * @param accountId Account ID for security filtering
   * @param userId User ID to set as updated_by
   */
  async decrementUsage(id: string, accountId: string, userId: string): Promise<void> {
    await this.getDb().runRawQuery(
      `UPDATE ${config.dbSchema}.${TABLES.SAVED_PLACES} 
       SET ${FIELDS.USE_COUNT} = GREATEST(COALESCE(${FIELDS.USE_COUNT}, 0) - 1, 0), 
           ${FIELDS.UPDATED_BY} = ?,
           ${FIELDS.UPDATED_AT} = NOW()
       WHERE ${FIELDS.ID} = ? AND ${FIELDS.ACCOUNT_ID} = ? AND ${FIELDS.REMOVED_AT} IS NULL`,
      [userId, id, accountId],
    );
  }
}

export { SavedPlaceGw };