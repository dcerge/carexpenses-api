import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class TireSetGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.TIRE_SETS,
      hasStatus: false,
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
      selectFields: [`${TABLES.TIRE_SETS}.*`],
      idField: `${TABLES.TIRE_SETS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.NAME,
          order: SORT_ORDER.ASC,
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
      id,
      accountId,
      userId,
      carId,
      tireType,
      searchKeyword,
      status
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(`${TABLES.TIRE_SETS}.${FIELDS.ID}`, castArray(id));
    }

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId) {
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId) {
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (tireType) {
      query.whereIn(FIELDS.TIRE_TYPE, castArray(tireType));
    }

    if (status) {
      query.whereIn(FIELDS.STATUS, castArray(status));
    }

    if (searchKeyword) {
      query.where(FIELDS.NAME, 'ilike', `%${searchKeyword}%`);
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    return filtersAppliedQty;
  }

  /**
   * Get distinct account IDs that have non-deleted tire sets in ACTIVE or STORED status.
   * Used by the warning flags cron job to process accounts in batches.
   *
   * @param statuses - Array of statuses to include (e.g., [ACTIVE, STORED])
   * @returns Array of account ID strings
   */
  async getDistinctAccountIds(statuses: number[]): Promise<string[]> {
    const placeholders = statuses.map(() => '?').join(', ');

    const result = await this.getDb().runRawQuery(
      `SELECT DISTINCT account_id FROM ${TABLES.TIRE_SETS} ` +
      `WHERE removed_at IS NULL AND status IN (${placeholders}) ` +
      `ORDER BY account_id`,
      statuses,
    );

    return result?.rows?.map((row: any) => row.account_id) || [];
  }
}

export { TireSetGw };