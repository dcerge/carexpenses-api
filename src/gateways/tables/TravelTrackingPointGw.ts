// ./src/gateways/tables/TravelTrackingPointGw.ts

import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES, TRACKING_STATUS } from '../../database';

class TravelTrackingPointGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.TRAVEL_TRACKING_POINTS,
      hasStatus: false,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: false,     // We handle created_at via DB default, not via BaseGateway
      hasUpdatedAt: false,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      hardRemove: true,         // No soft deletes — physical deletion only
      filterByUserField: undefined,
      selectFields: [`${TABLES.TRAVEL_TRACKING_POINTS}.*`],
      idField: `${TABLES.TRAVEL_TRACKING_POINTS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      noCache: true,            // No Redis/DataLoader caching for telemetry data
      defaultSorting: [
        {
          name: FIELDS.SEQ,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const {
      accountId,
      travelId,
      segmentId,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(`${TABLES.TRAVEL_TRACKING_POINTS}.${FIELDS.ACCOUNT_ID}`, castArray(accountId));
    }

    if (travelId) {
      query.whereIn(`${TABLES.TRAVEL_TRACKING_POINTS}.${FIELDS.TRAVEL_ID}`, castArray(travelId));
    }

    if (segmentId != null) {
      query.where(`${TABLES.TRAVEL_TRACKING_POINTS}.${FIELDS.SEGMENT_ID}`, segmentId);
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
    const { accountId, id, travelId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (travelId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    return filtersAppliedQty;
  }

  // ---------------------------------------------------------------------------
  // Custom Methods
  // ---------------------------------------------------------------------------

  /**
   * Returns all tracking points for a travel, ordered by seq.
   * Used for polyline generation on trip completion.
   * Bypasses pagination to return the full track.
   */
  async getByTravelId(accountId: string, travelId: string): Promise<any[]> {
    const result = await this.getDb().runRawQuery(
      `SELECT * FROM ${config.dbSchema}.${TABLES.TRAVEL_TRACKING_POINTS}
       WHERE ${FIELDS.ACCOUNT_ID} = ? AND ${FIELDS.TRAVEL_ID} = ?
       ORDER BY ${FIELDS.SEQ} ASC`,
      [accountId, travelId],
    );

    return result?.rows || [];
  }

  /**
   * Returns the last tracking point for a travel (highest seq).
   * Used to validate seq continuity when receiving new batches.
   */
  async getLastPoint(accountId: string, travelId: string): Promise<any | null> {
    const result = await this.getDb().runRawQuery(
      `SELECT * FROM ${config.dbSchema}.${TABLES.TRAVEL_TRACKING_POINTS}
       WHERE ${FIELDS.ACCOUNT_ID} = ? AND ${FIELDS.TRAVEL_ID} = ?
       ORDER BY ${FIELDS.SEQ} DESC
       LIMIT 1`,
      [accountId, travelId],
    );

    return result?.rows?.[0] || null;
  }

  /**
   * Hard-deletes all tracking points for a specific travel.
   * Used when discarding tracking or during manual cleanup.
   */
  async removeByTravelId(accountId: string, travelId: string): Promise<number> {
    const result = await this.getDb().runRawQuery(
      `DELETE FROM ${config.dbSchema}.${TABLES.TRAVEL_TRACKING_POINTS}
       WHERE ${FIELDS.ACCOUNT_ID} = ? AND ${FIELDS.TRAVEL_ID} = ?`,
      [accountId, travelId],
    );

    return result?.rowCount || 0;
  }

  /**
   * Hard-deletes tracking points older than the given number of days
   * where the associated travel has tracking_status = COMPLETED.
   * Deletes in batches to avoid long-running transactions.
   *
   * @param olderThanDays - Delete points with created_at older than this many days ago.
   * @param batchSize - Max rows to delete per batch. Default 1000.
   * @returns Total number of deleted rows.
   */
  async removeOlderThan(olderThanDays: number, batchSize: number = 1000): Promise<number> {
    let totalDeleted = 0;
    let deletedInBatch = 0;

    do {
      const result = await this.getDb().runRawQuery(
        `DELETE FROM ${config.dbSchema}.${TABLES.TRAVEL_TRACKING_POINTS}
         WHERE ${FIELDS.ID} IN (
           SELECT ttp.${FIELDS.ID}
           FROM ${config.dbSchema}.${TABLES.TRAVEL_TRACKING_POINTS} ttp
           INNER JOIN ${config.dbSchema}.${TABLES.TRAVELS} t
             ON t.${FIELDS.ID} = ttp.${FIELDS.TRAVEL_ID}
           WHERE ttp.${FIELDS.CREATED_AT} < NOW() - INTERVAL '${olderThanDays} days'
             AND t.${FIELDS.TRACKING_STATUS} = ?
           LIMIT ?
         )`,
        [TRACKING_STATUS.COMPLETED, batchSize],
      );

      deletedInBatch = result?.rowCount || 0;
      totalDeleted += deletedInBatch;
    } while (deletedInBatch >= batchSize);

    return totalDeleted;
  }

  /**
   * Returns the count of tracking points for a travel.
   */
  async countByTravelId(accountId: string, travelId: string): Promise<number> {
    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.TRAVEL_TRACKING_POINTS}
       WHERE ${FIELDS.ACCOUNT_ID} = ? AND ${FIELDS.TRAVEL_ID} = ?`,
      [accountId, travelId],
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { TravelTrackingPointGw };