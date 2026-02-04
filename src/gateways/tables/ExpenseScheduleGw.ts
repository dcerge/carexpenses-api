// ./src/gateways/tables/ExpenseScheduleGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import config from '../../config';
import { EXPENSE_SCHEDULE_STATUS, FIELDS, TABLES } from '../../database';

class ExpenseScheduleGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_SCHEDULES,
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
      selectFields: [`${TABLES.EXPENSE_SCHEDULES}.*`],
      idField: `${TABLES.EXPENSE_SCHEDULES}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [EXPENSE_SCHEDULE_STATUS.ACTIVE, EXPENSE_SCHEDULE_STATUS.COMPLETED, EXPENSE_SCHEDULE_STATUS.PAUSED],
      defaultSorting: [
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
      kindId,
      scheduleType,
      status,
      nextScheduledAtFrom,
      nextScheduledAtTo,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.ACCOUNT_ID}`, castArray(accountId));
    }

    if (userId) {
      query.whereIn(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.USER_ID}`, castArray(userId));
    }

    if (carId) {
      query.whereIn(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (kindId) {
      query.whereIn(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.KIND_ID}`, castArray(kindId));
    }

    if (scheduleType) {
      query.whereIn(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.SCHEDULE_TYPE}`, castArray(scheduleType));
    }

    if (status) {
      query.whereIn(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.STATUS}`, castArray(status));
    }

    if (nextScheduledAtFrom) {
      query.where(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.NEXT_SCHEDULED_AT}`, '>=', nextScheduledAtFrom);
    }

    if (nextScheduledAtTo) {
      query.where(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.NEXT_SCHEDULED_AT}`, '<=', nextScheduledAtTo);
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.WHERE_DONE}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.SHORT_NOTE}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.EXPENSE_SCHEDULES}.${FIELDS.COMMENTS}`, 'ilike', `%${searchKeyword}%`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId, id } = whereParams || {};

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

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId, id } = whereParams || {};

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

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, userId, carId, kindId, scheduleType, status } = filterParams ?? {};

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

    if (kindId) {
      sqlFilter.push(`${FIELDS.KIND_ID} = ?`);
      bindings.push(kindId);
    }

    if (scheduleType) {
      sqlFilter.push(`${FIELDS.SCHEDULE_TYPE} = ?`);
      bindings.push(scheduleType);
    }

    if (status) {
      sqlFilter.push(`${FIELDS.STATUS} = ?`);
      bindings.push(status);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.EXPENSE_SCHEDULES} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Get all active schedules that are due for processing
   * Used by the cron job to find schedules that need expenses created
   */
  async getSchedulesDueForProcessing(asOfDate: Date): Promise<any[]> {
    const result = await this.getDb().runRawQuery(
      `SELECT es.* 
       FROM ${config.dbSchema}.${TABLES.EXPENSE_SCHEDULES} es
       INNER JOIN ${config.dbSchema}.${TABLES.CARS} c ON c.${FIELDS.ID} = es.${FIELDS.CAR_ID}
       WHERE es.${FIELDS.REMOVED_AT} IS NULL
         AND es.${FIELDS.STATUS} = ?
         AND es.${FIELDS.START_AT} <= ?
         AND (es.${FIELDS.END_AT} IS NULL OR es.${FIELDS.END_AT} >= ?)
         AND es.${FIELDS.NEXT_SCHEDULED_AT} <= ?
         AND c.${FIELDS.REMOVED_AT} IS NULL
         AND c.${FIELDS.STATUS} = ?
       ORDER BY es.${FIELDS.NEXT_SCHEDULED_AT} ASC`,
      [STATUSES.ACTIVE, asOfDate, asOfDate, asOfDate, STATUSES.ACTIVE],
    );

    return result?.rows ?? [];
  }

  /**
   * Update schedule after expense creation
   */
  async updateScheduleAfterProcessing(
    id: string,
    accountId: string,
    lastAddedAt: Date,
    nextScheduledAt: Date | null,
    lastCreatedExpenseId: string,
    newStatus?: number,
  ): Promise<void> {
    const updateData: any = {
      [FIELDS.LAST_ADDED_AT]: lastAddedAt,
      [FIELDS.NEXT_SCHEDULED_AT]: nextScheduledAt,
      [FIELDS.LAST_CREATED_EXPENSE_ID]: lastCreatedExpenseId,
      [FIELDS.UPDATED_AT]: new Date(),
    };

    if (newStatus != null) {
      updateData[FIELDS.STATUS] = newStatus;
    }

    await this.update(updateData, { id, accountId });
  }
}

export { ExpenseScheduleGw };