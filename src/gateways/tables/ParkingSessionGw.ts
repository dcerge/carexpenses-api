// ./src/gateways/tables/ParkingSessionGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { PARKING_SESSION_STATUS, FIELDS, TABLES } from '../../database';

class ParkingSessionGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.PARKING_SESSIONS,
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
      selectFields: [`${TABLES.PARKING_SESSIONS}.*`],
      idField: `${TABLES.PARKING_SESSIONS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [PARKING_SESSION_STATUS.ACTIVE, PARKING_SESSION_STATUS.COMPLETED],
      defaultSorting: [
        {
          name: FIELDS.START_TIME,
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
      carId,
      travelId,
      expenseId,
      startedBy,
      endedBy,
      status,
      startTimeFrom,
      startTimeTo,
      endTimeFrom,
      endTimeTo,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.ACCOUNT_ID}`, castArray(accountId));
    }

    if (carId) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (travelId) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.TRAVEL_ID}`, castArray(travelId));
    }

    if (expenseId) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.EXPENSE_ID}`, castArray(expenseId));
    }

    if (startedBy) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.STARTED_BY}`, castArray(startedBy));
    }

    if (endedBy) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.ENDED_BY}`, castArray(endedBy));
    }

    if (status) {
      query.whereIn(`${TABLES.PARKING_SESSIONS}.${FIELDS.STATUS}`, castArray(status));
    }

    if (startTimeFrom) {
      query.where(`${TABLES.PARKING_SESSIONS}.${FIELDS.START_TIME}`, '>=', startTimeFrom);
    }

    if (startTimeTo) {
      query.where(`${TABLES.PARKING_SESSIONS}.${FIELDS.START_TIME}`, '<=', startTimeTo);
    }

    if (endTimeFrom) {
      query.where(`${TABLES.PARKING_SESSIONS}.${FIELDS.END_TIME}`, '>=', endTimeFrom);
    }

    if (endTimeTo) {
      query.where(`${TABLES.PARKING_SESSIONS}.${FIELDS.END_TIME}`, '<=', endTimeTo);
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(`${TABLES.PARKING_SESSIONS}.${FIELDS.FORMATTED_ADDRESS}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.PARKING_SESSIONS}.${FIELDS.NOTES}`, 'ilike', `%${searchKeyword}%`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, carId, id } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, carId, id } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (id != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, carId, status, startedBy } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (accountId) {
      sqlFilter.push(`${FIELDS.ACCOUNT_ID} = ?`);
      bindings.push(accountId);
    }

    if (carId) {
      sqlFilter.push(`${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (status) {
      sqlFilter.push(`${FIELDS.STATUS} = ?`);
      bindings.push(status);
    }

    if (startedBy) {
      sqlFilter.push(`${FIELDS.STARTED_BY} = ?`);
      bindings.push(startedBy);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.PARKING_SESSIONS} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { ParkingSessionGw };