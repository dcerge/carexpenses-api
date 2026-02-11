// ./src/core/VehicleTaskCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/vehicleTaskValidators';
import { SCHEDULE_TYPES, VEHICLE_TASK_STATUS, VEHICLE_TASK_PRIORITY } from '../database';
import { SCHEDULE_CONSTANTS, USER_ROLES } from '../boundary';

dayjs.extend(utc);

// ===========================================================================
// Constants
// ===========================================================================

const DEFAULT_DASHBOARD_LIMIT = 20;
const DEFAULT_DUE_SOON_DAYS = 14;

// ===========================================================================
// Core Class
// ===========================================================================

class VehicleTaskCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'vehicleTaskGw',
      name: 'VehicleTask',
      hasOrderNo: true,
      orderNoAsDecimal: true,
      doAuth: true,
      doingWhat: {
        list: 'listing vehicle tasks',
        get: 'getting a vehicle task',
        getMany: 'getting multiple vehicle tasks',
        create: 'creating a vehicle task',
        createMany: '',
        update: 'updating a vehicle task',
        updateMany: '',
        set: '',
        remove: 'removing a vehicle task',
        removeMany: 'removing multiple vehicle tasks',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  // ===========================================================================
  // Date/Time Formatting + Computed Urgency Fields
  // ===========================================================================

  /**
   * Process a task on output: format date fields and compute urgency metadata.
   *
   * Computed fields added to every task:
   * - isOverdue: boolean — true if due date is in the past and task is active
   * - daysUntilDue: number | null — days until due (negative = overdue), null if no due date or inactive
   * - urgencyStatus: string — overdue | due_soon | in_progress | upcoming | no_due_date | complete
   *
   * The dueSoonDays threshold is resolved from:
   * 1. The value cached on `this._dueSoonDays` (set by dashboard action)
   * 2. Falling back to DEFAULT_DUE_SOON_DAYS (14)
   *
   * For the dashboard query, `_dueSoonDays` is set from user profile before
   * processing. For regular list/get queries, the default is used.
   */
  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    // Format date fields
    const dateFields = ['dueDate', 'reminderDate', 'completedAt', 'createdAt', 'updatedAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    // Compute urgency fields
    const isComplete = item.status === VEHICLE_TASK_STATUS.COMPLETE;
    const isRemoved = item.status === VEHICLE_TASK_STATUS.REMOVED;
    const isInProgress = item.status === VEHICLE_TASK_STATUS.IN_PROGRESS;
    const isInactive = isComplete || isRemoved;

    // For inactive tasks, set simple defaults
    if (isInactive) {
      item.isOverdue = false;
      item.daysUntilDue = null;
      item.urgencyStatus = isComplete ? 'complete' : 'removed';
      return item;
    }

    // Compute days until due for active tasks
    const now = dayjs().utc().startOf('day');
    const dueSoonDays = this._dueSoonDays ?? DEFAULT_DUE_SOON_DAYS;

    if (item.dueDate) {
      const dueDate = dayjs(item.dueDate).utc().startOf('day');
      const daysUntilDue = dueDate.diff(now, 'day');

      item.daysUntilDue = daysUntilDue;
      item.isOverdue = daysUntilDue < 0;

      if (daysUntilDue < 0) {
        item.urgencyStatus = 'overdue';
      } else if (isInProgress) {
        item.urgencyStatus = 'in_progress';
      } else if (daysUntilDue <= dueSoonDays) {
        item.urgencyStatus = 'due_soon';
      } else {
        item.urgencyStatus = 'upcoming';
      }
    } else {
      // No due date
      item.daysUntilDue = null;
      item.isOverdue = false;
      item.urgencyStatus = isInProgress ? 'in_progress' : 'no_due_date';
    }

    return item;
  }

  /**
   * Cached dueSoonDays threshold, set by the dashboard action before processing tasks.
   * Allows processItemOnOut to use the correct user-profile-aware threshold.
   * Reset to null after dashboard processing.
   */
  private _dueSoonDays: number | null = null;

  // ===========================================================================
  // Schedule Calculation Utilities (for recurrence)
  // ===========================================================================

  /**
   * Get the last day of a given month
   */
  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Calculate the next due date for a recurring task based on schedule config.
   * Returns null if the task is one-time (no recurrence needed).
   */
  public calculateNextDueDate(
    scheduleType: string,
    scheduleDays: string | null,
    referenceDate: Date = new Date(),
  ): Date | null {
    // One-time tasks don't recur
    if (scheduleType === SCHEDULE_TYPES.ONE_TIME || !scheduleDays) {
      return null;
    }

    const days = scheduleDays.split(',').map((d) => d.trim()).filter((d) => d.length > 0);

    if (days.length === 0) {
      this.logger.log(
        `Cannot calculate next due date because schedule days string is empty ` +
        `for schedule type "${scheduleType}"`,
      );
      return null;
    }

    const refDate = dayjs(referenceDate).utc().startOf('day');
    const searchFrom = refDate.add(1, 'day');

    let nextDate: dayjs.Dayjs | null = null;

    switch (scheduleType) {
      case SCHEDULE_TYPES.WEEKLY:
        nextDate = this.findNextWeeklyDate(days, searchFrom);
        break;

      case SCHEDULE_TYPES.MONTHLY:
        nextDate = this.findNextMonthlyDate(days, searchFrom);
        break;

      case SCHEDULE_TYPES.YEARLY:
        nextDate = this.findNextYearlyDate(days, searchFrom);
        break;

      default:
        this.logger.log(`Cannot calculate next due date because schedule type "${scheduleType}" is not recognized`);
        return null;
    }

    if (!nextDate) {
      this.logger.log(
        `No next occurrence found for schedule type "${scheduleType}" ` +
        `with days "${scheduleDays}" after ${refDate.format('YYYY-MM-DD')}`,
      );
      return null;
    }

    return nextDate.hour(12).minute(0).second(0).millisecond(0).toDate();
  }

  /**
   * Find next weekly occurrence.
   * Days are ISO format: 1=Monday, 7=Sunday.
   */
  private findNextWeeklyDate(days: string[], searchFrom: dayjs.Dayjs): dayjs.Dayjs | null {
    const dayNumbers = days
      .map((d) => parseInt(d, 10))
      .filter((n) => !isNaN(n) && n >= SCHEDULE_CONSTANTS.WEEKLY_DAY_MIN && n <= SCHEDULE_CONSTANTS.WEEKLY_DAY_MAX)
      .sort((a, b) => a - b);

    if (dayNumbers.length === 0) {
      return null;
    }

    for (let i = 0; i < SCHEDULE_CONSTANTS.WEEKLY_SEARCH_DAYS; i++) {
      const checkDate = searchFrom.add(i, 'day');
      let isoDayOfWeek: number = checkDate.day();
      isoDayOfWeek = isoDayOfWeek === 0 ? 7 : isoDayOfWeek;

      if (dayNumbers.includes(isoDayOfWeek)) {
        return checkDate;
      }
    }

    return null;
  }

  /**
   * Find next monthly occurrence.
   * Days can be 1-31 or 'last'.
   */
  private findNextMonthlyDate(days: string[], searchFrom: dayjs.Dayjs): dayjs.Dayjs | null {
    const normalizedDays = days.map((d) => d.toLowerCase().trim());

    for (let i = 0; i < SCHEDULE_CONSTANTS.MONTHLY_SEARCH_DAYS; i++) {
      const checkDate = searchFrom.add(i, 'day');
      const dayOfMonth = checkDate.date();
      const lastDayOfMonth = this.getLastDayOfMonth(checkDate.year(), checkDate.month());

      for (const day of normalizedDays) {
        if (day === 'last') {
          if (dayOfMonth === lastDayOfMonth) {
            return checkDate;
          }
        } else {
          const targetDay = parseInt(day, 10);
          if (!isNaN(targetDay) && targetDay >= SCHEDULE_CONSTANTS.MONTHLY_DAY_MIN && targetDay <= SCHEDULE_CONSTANTS.MONTHLY_DAY_MAX) {
            const effectiveDay = Math.min(targetDay, lastDayOfMonth);
            if (dayOfMonth === effectiveDay) {
              return checkDate;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Find next yearly occurrence.
   * Days are in MM-DD format.
   */
  private findNextYearlyDate(days: string[], searchFrom: dayjs.Dayjs): dayjs.Dayjs | null {
    const currentYear = searchFrom.year();

    for (let yearOffset = 0; yearOffset < SCHEDULE_CONSTANTS.YEARLY_SEARCH_YEARS; yearOffset++) {
      const year = currentYear + yearOffset;

      const datesForYear: dayjs.Dayjs[] = [];

      for (const day of days) {
        const targetDate = dayjs.utc(`${year}-${day}`).startOf('day');
        if (targetDate.isValid()) {
          datesForYear.push(targetDate);
        }
      }

      datesForYear.sort((a, b) => a.valueOf() - b.valueOf());

      for (const targetDate of datesForYear) {
        if (targetDate.isSame(searchFrom) || targetDate.isAfter(searchFrom)) {
          return targetDate;
        }
      }
    }

    return null;
  }

  /**
   * Create the next recurring task from a completed task.
   * Copies title, notes, category, priority, car assignment, schedule config,
   * and assigned user. Sets due date to the next scheduled occurrence.
   */
  private async createNextRecurringTask(
    completedTask: any,
    accountId: string | undefined,
    userId: string | undefined,
    now: Date,
  ): Promise<string | null> {
    this.logger.debug(
      `Calculating next occurrence for recurring task ${completedTask.id} ` +
      `with schedule type "${completedTask.scheduleType}" and days "${completedTask.scheduleDays}"`,
    );

    // Use the original due date as reference so the next occurrence advances
    // past the current due date. Fall back to completedAt or now if no due date.
    const referenceDate = completedTask.dueDate || completedTask.completedAt || now;

    const nextDueDate = this.calculateNextDueDate(
      completedTask.scheduleType,
      completedTask.scheduleDays,
      referenceDate,
    );

    if (!nextDueDate) {
      this.logger.log(
        `No next occurrence could be calculated for recurring task ${completedTask.id}, ` +
        `skipping creation of follow-up task`,
      );
      return null;
    }

    // Calculate reminder date relative to the new due date (preserve the offset)
    let reminderDate: Date | null = null;

    if (completedTask.reminderDate && completedTask.dueDate) {
      const originalDue = dayjs(completedTask.dueDate).utc();
      const originalReminder = dayjs(completedTask.reminderDate).utc();
      const offsetMs = originalDue.diff(originalReminder);

      if (offsetMs > 0) {
        reminderDate = dayjs(nextDueDate).utc().subtract(offsetMs, 'millisecond').toDate();
        this.logger.debug(
          `Preserved reminder offset of ${Math.round(offsetMs / 86400000)} day(s) ` +
          `for the next recurring task, reminder set to ${dayjs(reminderDate).utc().format('YYYY-MM-DD')}`,
        );
      }
    }

    this.logger.debug(
      `Creating next recurring task from completed task ${completedTask.id} ` +
      `with due date ${dayjs(nextDueDate).utc().format('YYYY-MM-DD')}`,
    );

    const nextTasks = await this.getGateways().vehicleTaskGw.create({
      accountId,
      carId: completedTask.carId,
      assignedToUserId: completedTask.assignedToUserId,
      title: completedTask.title,
      notes: completedTask.notes,
      category: completedTask.category,
      priority: completedTask.priority,
      dueDate: nextDueDate,
      reminderDate,
      scheduleType: completedTask.scheduleType,
      scheduleDays: completedTask.scheduleDays,
      status: VEHICLE_TASK_STATUS.TODO,
      createdBy: userId,
      createdAt: now,
    });

    const nextTask = nextTasks[0]
    const nextTaskId = nextTask?.id;

    if (nextTaskId) {
      this.logger.log(
        `Successfully created next recurring task ${nextTaskId} ` +
        `(due ${dayjs(nextDueDate).utc().format('YYYY-MM-DD')}) as follow-up to completed task ${completedTask.id}`,
      );
    } else {
      this.logger.log(
        `Failed to create next recurring task from completed task ${completedTask.id}, ` +
        `gateway returned no ID`,
      );
    }

    return nextTask || null;
  }

  // ===========================================================================
  // List
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    this.logger.debug(`Listing vehicle tasks for account ${accountId} with filter:`, filter);

    // Use AppCore's filterAccessibleCarIds for DRIVER role restriction
    const carIdFilter = await this.filterAccessibleCarIds(filter?.carId);

    const updArgs = {
      ...args,
      filter: {
        ...filter,
        accountId,
        ...(carIdFilter ? { carId: carIdFilter } : {}),
      },
    };

    return updArgs;
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    this.logger.debug(`Returning ${items.length} vehicle task(s) from list query`);

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      this.logger.debug('Vehicle task was not found by the gateway');
      return item;
    }

    // Validate car access (if task is car-specific)
    if (item.carId) {
      const hasAccess = await this.validateCarAccess({ id: item.carId, accountId: item.accountId });

      if (!hasAccess) {
        this.logger.log(
          `Access denied to vehicle task ${item.id} because user does not have access ` +
          `to vehicle ${item.carId}`,
        );
        return null;
      }
    }

    this.logger.debug(`Returning vehicle task ${item.id} (status=${item.status}, car=${item.carId || 'account-wide'})`);

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const { accountId } = this.getContext();

    // Filter to only items in this account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    // Get accessible car IDs for car-specific tasks
    const carIds = [...new Set(filteredItems.filter((item) => item.carId).map((item) => item.carId))];
    const accessibleCarIds = await this.filterAccessibleCarIds(carIds);
    const accessibleSet = new Set(accessibleCarIds);

    // Include account-wide tasks (carId = null) and tasks for accessible cars
    const accessibleItems = filteredItems.filter(
      (item) => !item.carId || accessibleSet.has(item.carId),
    );

    this.logger.debug(
      `Returning ${accessibleItems.length} of ${items.length} requested vehicle tasks ` +
      `(${items.length - accessibleItems.length} filtered out by account or car access)`,
    );

    return accessibleItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    this.logger.debug(
      `User ${userId} is creating a vehicle task "${params.title}" ` +
      `for ${params.carId ? `vehicle ${params.carId}` : 'the account (no specific vehicle)'}`,
    );

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to create vehicle tasks`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create tasks');
    }

    // Validate car access if car-specific task
    if (params.carId) {
      const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

      if (!hasAccess) {
        this.logger.log(
          `User ${userId} does not have access to vehicle ${params.carId}, cannot create task`,
        );
        return OpResult.fail(
          OP_RESULT_CODES.NOT_FOUND,
          {},
          'You do not have permission to create tasks for this vehicle',
        );
      }
    }

    const newTask = {
      ...params,
      accountId,
      priority: params.priority ?? VEHICLE_TASK_PRIORITY.LOW,
      scheduleType: params.scheduleType ?? SCHEDULE_TYPES.ONE_TIME,
      status: params.status ?? VEHICLE_TASK_STATUS.TODO,
      createdBy: userId,
      createdAt: this.now(),
    };

    this.logger.debug(
      `Vehicle task is ready for creation: priority=${newTask.priority}, ` +
      `scheduleType="${newTask.scheduleType}", ` +
      `dueDate=${newTask.dueDate || 'none'}, ` +
      `assignedTo=${newTask.assignedToUserId || 'unassigned'}`,
    );

    return newTask;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const created = items?.[0];

    if (created) {
      this.logger.log(
        `Vehicle task ${created.id} "${created.title}" was successfully created ` +
        `for ${created.carId ? `vehicle ${created.carId}` : 'the account'}`,
      );
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Update
  // ===========================================================================

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId, roleId } = this.getContext();

    this.logger.debug(`User ${userId} is updating vehicle task ${id}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to update vehicle tasks`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update tasks');
    }

    // Check if task exists and user has access
    const task = await this.getGateways().vehicleTaskGw.get(id);

    if (!task || task.accountId !== accountId) {
      this.logger.log(
        `Vehicle task ${id} was not found or does not belong to account ${accountId}, cannot update`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle task not found');
    }

    // Validate car access if task is car-specific
    if (task.carId) {
      const hasAccess = await this.validateCarAccess({ id: task.carId, accountId });

      if (!hasAccess) {
        this.logger.log(
          `User ${userId} does not have access to vehicle ${task.carId} referenced by task ${id}, cannot update`,
        );
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to update this task');
      }
    }

    // If changing car, validate access to the new car
    if (params.carId && params.carId !== task.carId) {
      this.logger.debug(
        `Task ${id} is being moved from vehicle ${task.carId || 'account-wide'} to vehicle ${params.carId}`,
      );

      const hasNewCarAccess = await this.validateCarAccess({ id: params.carId, accountId });

      if (!hasNewCarAccess) {
        this.logger.log(
          `User ${userId} does not have access to target vehicle ${params.carId}, ` +
          `cannot move task ${id} to this vehicle`,
        );
        return OpResult.fail(
          OP_RESULT_CODES.NOT_FOUND,
          {},
          'You do not have permission to move task to this vehicle',
        );
      }
    }

    // Don't allow changing accountId
    const { accountId: _, ...restParams } = params;

    const updateParams = {
      ...restParams,
      updatedBy: userId,
      updatedAt: this.now(),
    };

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(`Vehicle task ${id} is ready for update`);

    return updateParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const updated = items?.[0];

    if (updated) {
      this.logger.log(`Vehicle task ${updated.id} was successfully updated`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, userId, roleId } = this.getContext();

    if (!id) {
      this.logger.log('Cannot remove vehicle task because no ID was provided in the request');
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle task ID is required');
    }

    this.logger.debug(`User ${userId} is removing vehicle task ${id}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to remove vehicle tasks`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove tasks');
    }

    const task = await this.getGateways().vehicleTaskGw.get(id);

    if (!task || task.accountId !== accountId) {
      this.logger.log(
        `Vehicle task ${id} was not found or does not belong to account ${accountId}, cannot remove`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle task not found');
    }

    // Validate car access if task is car-specific
    if (task.carId) {
      const hasAccess = await this.validateCarAccess({ id: task.carId, accountId });

      if (!hasAccess) {
        this.logger.log(
          `User ${userId} does not have access to vehicle ${task.carId} referenced by task ${id}, cannot remove`,
        );
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to remove this task');
      }
    }

    where.accountId = accountId;

    this.logger.debug(`Vehicle task ${id} "${task.title}" is ready for removal`);

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const removed = items?.[0];

    if (removed) {
      this.logger.log(`Vehicle task ${removed.id} was successfully removed`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId, userId, roleId } = this.getContext();

    this.logger.debug(`User ${userId} is removing ${where.length} vehicle task(s) in bulk`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to remove vehicle tasks`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove tasks');
    }

    const allowedWhere: any[] = [];

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        this.logger.debug('Skipping a remove-many item because it has no ID');
        continue;
      }

      const task = await this.getGateways().vehicleTaskGw.get(id);

      if (!task || task.accountId !== accountId) {
        this.logger.debug(
          `Skipping task ${id} from bulk removal because it was not found or belongs to another account`,
        );
        continue;
      }

      // Validate car access if task is car-specific
      if (task.carId) {
        const hasAccess = await this.validateCarAccess({ id: task.carId, accountId });

        if (!hasAccess) {
          this.logger.debug(
            `Skipping task ${id} from bulk removal because user does not have access to vehicle ${task.carId}`,
          );
          continue;
        }
      }

      allowedWhere.push({ ...item, accountId });
    }

    this.logger.log(
      `Bulk removal: ${allowedWhere.length} of ${where.length} vehicle tasks passed access checks and will be removed`,
    );

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (Array.isArray(items)) {
      this.logger.log(`Successfully removed ${items.length} vehicle task(s) in bulk`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Custom Action: Complete Task
  // ===========================================================================

  /**
   * Mark a task as complete.
   *
   * Sets status to COMPLETE, records completedAt and completedByUserId.
   * If the task has a recurring schedule (not one-time), automatically
   * creates the next occurrence with the computed due date.
   */
  public async complete(args: { where: { id: string } }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: true,
      doingWhat: 'completing vehicle task',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const { id } = actionArgs?.where || {};
        const { accountId, userId, roleId } = this.getContext();

        if (!id) {
          this.logger.log('Cannot complete vehicle task because no ID was provided in the request');
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Task ID is required');
        }

        this.logger.debug(`User ${userId} is completing vehicle task ${id}`);

        if (roleId === USER_ROLES.VIEWER) {
          this.logger.log(`User ${userId} with role ${roleId} is not allowed to complete vehicle tasks`);
          return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to complete tasks');
        }

        const task = await this.getGateways().vehicleTaskGw.get(id);

        if (!task || task.accountId !== accountId) {
          this.logger.log(
            `Vehicle task ${id} was not found or does not belong to account ${accountId}, cannot complete`,
          );
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle task not found');
        }

        // Validate car access if task is car-specific
        if (task.carId) {
          const hasAccess = await this.validateCarAccess({ id: task.carId, accountId });

          if (!hasAccess) {
            this.logger.log(
              `User ${userId} does not have access to vehicle ${task.carId} referenced by task ${id}, cannot complete`,
            );
            return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle task not found');
          }
        }

        if (task.status === VEHICLE_TASK_STATUS.COMPLETE) {
          this.logger.log(`Vehicle task ${id} is already marked as complete, nothing to do`);
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Task is already complete');
        }

        if (task.status === VEHICLE_TASK_STATUS.REMOVED) {
          this.logger.log(`Vehicle task ${id} has been removed and cannot be completed`);
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Cannot complete a removed task');
        }

        const now = this.now();

        this.logger.debug(
          `Marking vehicle task ${id} "${task.title}" as complete ` +
          `(was status=${task.status}, assigned to ${task.assignedToUserId || 'nobody'})`,
        );

        // Mark the task as complete
        const updTasks = await this.getGateways().vehicleTaskGw.completeTask(id, accountId, userId);

        this.logger.debug(`Completed task is`, updTasks)

        // If this is a recurring task, create the next occurrence
        let nextTask: any = null;

        if (task.scheduleType && task.scheduleType !== SCHEDULE_TYPES.ONE_TIME) {
          this.logger.debug(
            `Task ${id} is a recurring task with schedule type "${task.scheduleType}", ` +
            `attempting to create the next occurrence`,
          );

          nextTask = await this.createNextRecurringTask(task, accountId, userId, now);
        } else {
          this.logger.debug(`Task ${id} is a one-time task, no follow-up task will be created`);
        }

        // Fetch the updated task
        const updatedTask = updTasks[0];

        this.logger.log(
          `Vehicle task ${id} "${task.title}" was successfully completed by user ${userId}` +
          (nextTask?.id ? `, next recurring task ${nextTask?.id} was created` : ''),
        );

        const items = [this.processItemOnOut(updatedTask)];

        if (nextTask) {
          items.push(this.processItemOnOut(nextTask));
        }

        return OpResult.ok(items);
      },
    });
  }

  // ===========================================================================
  // Custom Action: Dashboard
  // ===========================================================================

  /**
   * Get tasks needing attention for the dashboard widget.
   *
   * Returns active tasks (overdue, in-progress, due soon) with computed
   * urgency fields via processItemOnOut.
   *
   * Before processing, sets `_dueSoonDays` from user profile so that
   * processItemOnOut uses the correct threshold for urgencyStatus.
   */
  public async dashboard(args: {
    params?: {
      carId?: string[] | null;
      dueSoonDays?: number | null;
      limit?: number | null;
    };
  }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: false,
      doingWhat: 'loading dashboard tasks',
      action: async (actionArgs: any) => {
        const { params } = actionArgs || {};
        const { carId, dueSoonDays, limit } = params || {};
        const { accountId, userId } = this.getContext();

        this.logger.debug(
          `User ${userId} is loading dashboard tasks ` +
          `(carId=${carId || 'all'}, dueSoonDays=${dueSoonDays || 'from profile'}, limit=${limit || DEFAULT_DASHBOARD_LIMIT})`,
        );

        // ---------------------------------------------------------------
        // Resolve dueSoonDays from user profile if not provided
        // ---------------------------------------------------------------

        let effectiveDueSoonDays = dueSoonDays;

        if (effectiveDueSoonDays == null || effectiveDueSoonDays <= 0) {
          const userProfile = await this.getCurrentUserProfile();
          effectiveDueSoonDays = userProfile.notifyInDays || DEFAULT_DUE_SOON_DAYS;

          this.logger.debug(
            `dueSoonDays not provided, using user profile notifyInDays: ${effectiveDueSoonDays}`,
          );
        }

        // Set the threshold so processItemOnOut uses it for urgencyStatus
        this._dueSoonDays = effectiveDueSoonDays;

        try {
          const now = this.now();
          const dueSoonDate = dayjs(now).utc().add(effectiveDueSoonDays, 'day').toDate();
          const effectiveLimit = limit && limit > 0 ? limit : DEFAULT_DASHBOARD_LIMIT;

          // ---------------------------------------------------------------
          // Apply car access filtering (DRIVER/VIEWER role restriction)
          // ---------------------------------------------------------------

          const accessibleCarIds = await this.filterAccessibleCarIds(
            carId && carId.length > 0 ? carId : null,
          );

          this.logger.debug(
            `Dashboard car filter: requested=${carId || 'all'}, ` +
            `accessible=${accessibleCarIds ? accessibleCarIds.join(',') : 'all'}`,
          );

          // ---------------------------------------------------------------
          // Fetch tasks from gateway (IDs → dataloader → full objects)
          // ---------------------------------------------------------------

          const tasks = await this.getGateways().vehicleTaskGw.getDashboardTasks(
            accountId,
            accessibleCarIds,
            dueSoonDate,
            effectiveLimit,
          );

          this.logger.debug(`Gateway returned ${tasks.length} dashboard task(s)`);

          if (tasks.length === 0) {
            return OpResult.ok([]);
          }

          // ---------------------------------------------------------------
          // Process tasks (dates + urgency fields via processItemOnOut)
          // ---------------------------------------------------------------

          const processedTasks = tasks.map((task: any) => this.processItemOnOut({ ...task }));

          this.logger.log(
            `Dashboard returning ${processedTasks.length} task(s): ` +
            `${processedTasks.filter((t: any) => t.urgencyStatus === 'overdue').length} overdue, ` +
            `${processedTasks.filter((t: any) => t.urgencyStatus === 'in_progress').length} in progress, ` +
            `${processedTasks.filter((t: any) => t.urgencyStatus === 'due_soon').length} due soon`,
          );

          return OpResult.ok(processedTasks);
        } finally {
          // Always reset to avoid leaking into subsequent requests
          this._dueSoonDays = null;
        }
      },
    });
  }
}

export { VehicleTaskCore };