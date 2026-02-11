// ./src/gateways/tables/VehicleTaskGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { VEHICLE_TASK_STATUS, FIELDS, TABLES } from '../../database';

class VehicleTaskGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.VEHICLE_TASKS,
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
      selectFields: [`${TABLES.VEHICLE_TASKS}.*`],
      idField: `${TABLES.VEHICLE_TASKS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [VEHICLE_TASK_STATUS.TODO, VEHICLE_TASK_STATUS.IN_PROGRESS, VEHICLE_TASK_STATUS.COMPLETE],
      defaultSorting: [
        {
          name: FIELDS.ORDER_NO,
          order: SORT_ORDER.ASC,
        },
        {
          name: FIELDS.DUE_DATE,
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
      accountId,
      carId,
      assignedToUserId,
      createdByUserId,
      completedByUserId,
      priority,
      category,
      scheduleType,
      status,
      dueDateFrom,
      dueDateTo,
      reminderDateFrom,
      reminderDateTo,
      linkedExpenseId,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.ACCOUNT_ID}`, castArray(accountId));
    }

    if (carId) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (assignedToUserId) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.ASSIGNED_TO_USER_ID}`, castArray(assignedToUserId));
    }

    if (createdByUserId) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.CREATED_BY_USER_ID}`, castArray(createdByUserId));
    }

    if (completedByUserId) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.COMPLETED_BY_USER_ID}`, castArray(completedByUserId));
    }

    if (priority) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.PRIORITY}`, castArray(priority));
    }

    if (category) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.CATEGORY}`, castArray(category));
    }

    if (scheduleType) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.SCHEDULE_TYPE}`, castArray(scheduleType));
    }

    if (status) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.STATUS}`, castArray(status));
    }

    if (dueDateFrom) {
      query.where(`${TABLES.VEHICLE_TASKS}.${FIELDS.DUE_DATE}`, '>=', dueDateFrom);
    }

    if (dueDateTo) {
      query.where(`${TABLES.VEHICLE_TASKS}.${FIELDS.DUE_DATE}`, '<=', dueDateTo);
    }

    if (reminderDateFrom) {
      query.where(`${TABLES.VEHICLE_TASKS}.${FIELDS.REMINDER_DATE}`, '>=', reminderDateFrom);
    }

    if (reminderDateTo) {
      query.where(`${TABLES.VEHICLE_TASKS}.${FIELDS.REMINDER_DATE}`, '<=', reminderDateTo);
    }

    if (linkedExpenseId) {
      query.whereIn(`${TABLES.VEHICLE_TASKS}.${FIELDS.LINKED_EXPENSE_ID}`, castArray(linkedExpenseId));
    }

    if (searchKeyword) {
      query.where(function (table) {
        table
          .where(`${TABLES.VEHICLE_TASKS}.${FIELDS.TITLE}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.VEHICLE_TASKS}.${FIELDS.NOTES}`, 'ilike', `%${searchKeyword}%`)
          .orWhere(`${TABLES.VEHICLE_TASKS}.${FIELDS.CATEGORY}`, 'ilike', `%${searchKeyword}%`);
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
    const { accountId, carId, assignedToUserId, priority, category, scheduleType, status } = filterParams ?? {};

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

    if (assignedToUserId) {
      sqlFilter.push(`${FIELDS.ASSIGNED_TO_USER_ID} = ?`);
      bindings.push(assignedToUserId);
    }

    if (priority) {
      sqlFilter.push(`${FIELDS.PRIORITY} = ?`);
      bindings.push(priority);
    }

    if (category) {
      sqlFilter.push(`${FIELDS.CATEGORY} = ?`);
      bindings.push(category);
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
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.VEHICLE_TASKS} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Get tasks due for reminder notifications.
   * Used by the cron/notification job to find tasks with pending reminders.
   */
  async getTasksDueForReminder(asOfDate: Date): Promise<any[]> {
    const result = await this.getDb().runRawQuery(
      `SELECT vt.*
       FROM ${config.dbSchema}.${TABLES.VEHICLE_TASKS} vt
       WHERE vt.${FIELDS.REMOVED_AT} IS NULL
         AND vt.${FIELDS.STATUS} IN (?, ?)
         AND vt.${FIELDS.REMINDER_DATE} IS NOT NULL
         AND vt.${FIELDS.REMINDER_DATE} <= ?
       ORDER BY vt.${FIELDS.REMINDER_DATE} ASC`,
      [VEHICLE_TASK_STATUS.TODO, VEHICLE_TASK_STATUS.IN_PROGRESS, asOfDate],
    );

    return result?.rows ?? [];
  }

  /**
   * Get active tasks for a vehicle, used by the dashboard widget.
   * Returns todo and in-progress tasks sorted by due date.
   */
  async getActiveTasksForDashboard(accountId: string, limit: number = 10): Promise<any[]> {
    const result = await this.getDb().runRawQuery(
      `SELECT vt.*
       FROM ${config.dbSchema}.${TABLES.VEHICLE_TASKS} vt
       WHERE vt.${FIELDS.REMOVED_AT} IS NULL
         AND vt.${FIELDS.ACCOUNT_ID} = ?
         AND vt.${FIELDS.STATUS} IN (?, ?)
       ORDER BY 
         CASE WHEN vt.${FIELDS.DUE_DATE} IS NULL THEN 1 ELSE 0 END ASC,
         vt.${FIELDS.DUE_DATE} ASC,
         vt.${FIELDS.PRIORITY} DESC,
         vt.${FIELDS.CREATED_AT} DESC
       LIMIT ?`,
      [accountId, VEHICLE_TASK_STATUS.TODO, VEHICLE_TASK_STATUS.IN_PROGRESS, limit],
    );

    return result?.rows ?? [];
  }

  /**
   * Get dashboard tasks with proper urgency-based ordering.
   *
   * Fetches task IDs via a lightweight SQL query sorted by urgency,
   * then hydrates full objects through the dataloader cache.
   *
   * Selection criteria:
   * - All overdue tasks (due date < now, status = TODO or IN_PROGRESS)
   * - All in-progress tasks (regardless of due date)
   * - Tasks due soon (due date between now and dueSoonDate, status = TODO)
   *
   * Sort order:
   * 1. Overdue first (most overdue at top)
   * 2. In-progress (by priority DESC, then due date ASC)
   * 3. Due soon (by due date ASC)
   *
   * @param accountId    Account to filter by (SQL-level security)
   * @param carIds       Optional vehicle filter. Null = all vehicles + account-wide tasks.
   * @param dueSoonDate  The cutoff date for "due soon" (now + N days)
   * @param limit        Maximum number of tasks to return
   * @returns Array of full task objects in display order
   */
  async getDashboardTasks(
    accountId: string,
    carIds: string[] | null,
    dueSoonDate: Date,
    limit: number = 20,
  ): Promise<any[]> {
    const bindings: any[] = [];

    // Build optional car filter clause
    let carFilter = '';

    if (carIds && carIds.length > 0) {
      const placeholders = carIds.map(() => '?').join(', ');
      // Include tasks for the specified cars OR account-wide tasks (car_id IS NULL)
      carFilter = ` AND (vt.${FIELDS.CAR_ID} IN (${placeholders}) OR vt.${FIELDS.CAR_ID} IS NULL)`;
      bindings.push(...carIds);
    }

    // Step 1: Fetch only IDs in urgency order
    //
    // Uses a CASE expression to assign urgency_rank for sorting:
    //   1 = overdue (due_date < NOW)
    //   2 = in_progress (status = IN_PROGRESS, not overdue)
    //   3 = due_soon (due_date <= dueSoonDate, status = TODO)
    //
    // Tasks that are TODO with no due date or due date beyond the threshold
    // are excluded — they belong on the full tasks page, not the dashboard.
    const sql = `
      SELECT vt.${FIELDS.ID}
        FROM ${config.dbSchema}.${TABLES.VEHICLE_TASKS} vt
       WHERE vt.${FIELDS.REMOVED_AT} IS NULL
         AND vt.${FIELDS.ACCOUNT_ID} = ?
         AND vt.${FIELDS.STATUS} IN (?, ?)
         ${carFilter}
         AND (
           -- Overdue: has due date in the past
           (vt.${FIELDS.DUE_DATE} IS NOT NULL AND vt.${FIELDS.DUE_DATE} < NOW())
           -- In progress: regardless of due date
           OR vt.${FIELDS.STATUS} = ?
           -- Due soon: TODO tasks with due date within threshold
           OR (vt.${FIELDS.STATUS} = ? AND vt.${FIELDS.DUE_DATE} IS NOT NULL AND vt.${FIELDS.DUE_DATE} <= ?)
         )
       ORDER BY
         CASE
           WHEN vt.${FIELDS.DUE_DATE} IS NOT NULL AND vt.${FIELDS.DUE_DATE} < NOW()
             THEN 1
           WHEN vt.${FIELDS.STATUS} = ?
             THEN 2
           ELSE 3
         END ASC,
         vt.${FIELDS.PRIORITY} DESC,
         CASE WHEN vt.${FIELDS.DUE_DATE} IS NULL THEN 1 ELSE 0 END ASC,
         vt.${FIELDS.DUE_DATE} ASC,
         vt.${FIELDS.CREATED_AT} DESC
       LIMIT ?
    `;

    const fullBindings = [
      accountId,                         // WHERE account_id
      VEHICLE_TASK_STATUS.TODO,          // WHERE status IN
      VEHICLE_TASK_STATUS.IN_PROGRESS,   // WHERE status IN
      ...bindings,                       // car filter (if any)
      VEHICLE_TASK_STATUS.IN_PROGRESS,   // OR status = IN_PROGRESS
      VEHICLE_TASK_STATUS.TODO,          // OR status = TODO
      dueSoonDate,                       // AND due_date <= dueSoonDate
      VEHICLE_TASK_STATUS.IN_PROGRESS,   // ORDER BY CASE status = IN_PROGRESS
      limit,                             // LIMIT
    ];

    const result = await this.getDb().runRawQuery(sql, fullBindings);
    const rows = result?.rows ?? [];

    if (rows.length === 0) {
      return [];
    }

    // Step 2: Hydrate full objects via dataloader cache
    const ids = rows.map((row: any) => row.id);
    const tasks = await this.loader.loadMany(ids);

    return tasks;
  }

  /**
   * Mark a task as complete and optionally link it to an expense.
   */
  async completeTask(
    id: string,
    accountId: string,
    completedByUserId: string,
    linkedExpenseId?: string,
  ): Promise<void> {
    const updateData: any = {
      [FIELDS.STATUS]: VEHICLE_TASK_STATUS.COMPLETE,
      [FIELDS.COMPLETED_AT]: new Date(),
      [FIELDS.COMPLETED_BY_USER_ID]: completedByUserId,
    };

    if (linkedExpenseId) {
      updateData[FIELDS.LINKED_EXPENSE_ID] = linkedExpenseId;
    }

    return await this.update({ id, accountId }, updateData);
  }
}

export { VehicleTaskGw };