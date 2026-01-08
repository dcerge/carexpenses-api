// ./src/gateways/tables/ExpenseBaseGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

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
        {
          name: FIELDS.ODOMETER,
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
      labelId,
      travelId,
      whenDoneFrom,
      whenDoneTo,
      searchKeyword,
      withOdometer,
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

    if (labelId) {
      query.whereIn(FIELDS.LABEL_ID, castArray(labelId));
    }

    if (travelId) {
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (whenDoneFrom) {
      query.where(FIELDS.WHEN_DONE, '>=', whenDoneFrom);
    }

    if (whenDoneTo) {
      query.where(FIELDS.WHEN_DONE, '<=', whenDoneTo);
    }

    if (withOdometer != null) {
      if (withOdometer) {
        query.whereNotNull(FIELDS.ODOMETER);
      } else {
        query.whereNull(FIELDS.ODOMETER);
      }
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(FIELDS.LOCATION, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.WHERE_DONE, 'ilike', `%${searchKeyword}%`);
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
    const { accountId, userId, carId, expenseType } = filterParams ?? {};

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

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.EXPENSE_BASES} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { ExpenseBaseGw };
