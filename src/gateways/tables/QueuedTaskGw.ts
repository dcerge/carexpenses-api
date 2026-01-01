// ./src/gateways/tables/QueuedTaskGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class QueuedTaskGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.QUEUED_TASKS,
      hasStatus: false,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.QUEUED_TASKS}.*`],
      idField: `${TABLES.QUEUED_TASKS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.CREATED_AT,
          order: SORT_ORDER.DESC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { userId, taskType, taskStatus } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (userId) {
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (taskType) {
      query.whereIn(FIELDS.TASK_TYPE, castArray(taskType));
    }

    if (taskStatus) {
      query.whereIn(FIELDS.TASK_STATUS, castArray(taskStatus));
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { userId, taskType, taskStatus } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (taskType != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TASK_TYPE, castArray(taskType));
    }

    if (taskStatus != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TASK_STATUS, castArray(taskStatus));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { userId, taskType, taskStatus } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (taskType != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TASK_TYPE, castArray(taskType));
    }

    if (taskStatus != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TASK_STATUS, castArray(taskStatus));
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { userId, taskType, taskStatus } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (userId) {
      sqlFilter.push(`${FIELDS.USER_ID} = ?`);
      bindings.push(userId);
    }

    if (taskType) {
      sqlFilter.push(`${FIELDS.TASK_TYPE} = ?`);
      bindings.push(taskType);
    }

    if (taskStatus) {
      sqlFilter.push(`${FIELDS.TASK_STATUS} = ?`);
      bindings.push(taskStatus);
    }

    const filterStr = sqlFilter.length > 0 ? ' WHERE ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.QUEUED_TASKS}${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { QueuedTaskGw };
