// ./src/core/ExpenseScheduleCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/expenseScheduleValidators';
import { SCHEDULE_TYPES, EXPENSE_SCHEDULE_STATUS, EXPENSE_TYPES, TABLES } from '../database';
import { camelKeys, STATUSES } from '@sdflc/utils';
import config from '../config';
import { logger } from '../logger';
import { SCHEDULE_CONSTANTS, USER_ROLES } from '../boundary';
import { CarStatsUpdater, FEATURE_CODES, ServiceIntervalNextUpdater } from '../utils';
import { trialCheckMiddleware } from '../middleware';

dayjs.extend(utc);

// ===========================================================================
// Core Class
// ===========================================================================

class ExpenseScheduleCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseScheduleGw',
      name: 'ExpenseSchedule',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expense schedules',
        get: 'getting an expense schedule',
        getMany: 'getting multiple expense schedules',
        create: 'creating an expense schedule',
        createMany: '',
        update: 'updating an expense schedule',
        updateMany: '',
        set: '',
        remove: 'removing an expense schedule',
        removeMany: 'removing multiple expense schedules',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  public async expenseSchedulesQty(): Promise<number> {
    return this.getGateways().expenseScheduleGw.count({ accountId: this.getContext().accountId });
  }

  // ===========================================================================
  // Date/Time Formatting
  // ===========================================================================

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    const dateFields = ['startAt', 'endAt', 'nextScheduledAt', 'lastAddedAt', 'createdAt', 'updatedAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    return item;
  }

  // ===========================================================================
  // Schedule Calculation Utilities
  // ===========================================================================

  /**
   * Parse schedule_days string into an array based on schedule_type
   */
  private parseScheduleDays(scheduleType: string, scheduleDays: string): string[] {
    return scheduleDays.split(',').map((d) => d.trim()).filter((d) => d.length > 0);
  }

  /**
   * Get the last day of a given month
   */
  private getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Calculate the next scheduled date from a given reference date
   * Returns null if schedule has ended or is one-time and completed
   */
  public calculateNextScheduledAt(
    scheduleType: string,
    scheduleDays: string,
    startAt: Date,
    endAt: Date | null,
    referenceDate: Date = new Date(),
  ): Date | null {
    const days = this.parseScheduleDays(scheduleType, scheduleDays);

    if (days.length === 0) {
      logger.warn(`[ExpenseScheduleCore] Empty schedule days for type: ${scheduleType}`);
      return null;
    }

    const refDate = dayjs(referenceDate).utc().startOf('day');
    const startDate = dayjs(startAt).utc().startOf('day');

    // Use the later of reference date or start date
    let searchFrom = refDate.isAfter(startDate) ? refDate : startDate;

    // For finding next occurrence, we start from the day after reference
    // unless reference is before start, then we start from start
    if (refDate.isBefore(startDate)) {
      searchFrom = startDate;
    } else {
      searchFrom = refDate.add(1, 'day');
    }

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

      case SCHEDULE_TYPES.ONE_TIME:
        const oneTimeDate = dayjs(scheduleDays).utc().startOf('day');
        if (oneTimeDate.isValid() && (oneTimeDate.isAfter(refDate) || oneTimeDate.isSame(refDate))) {
          nextDate = oneTimeDate;
        }
        break;

      default:
        logger.warn(`[ExpenseScheduleCore] Unknown schedule type: ${scheduleType}`);
        return null;
    }

    if (!nextDate) {
      return null;
    }

    // Check if next date is within end date
    if (endAt) {
      const endDate = dayjs(endAt).utc().startOf('day');
      if (nextDate.isAfter(endDate)) {
        return null;
      }
    }

    // Return date with 12:00 PM UTC time
    return nextDate.hour(12).minute(0).second(0).millisecond(0).toDate();
  }

  /**
   * Find next weekly occurrence
   * Days are ISO format: 1=Monday, 7=Sunday
   */
  private findNextWeeklyDate(days: string[], searchFrom: dayjs.Dayjs): dayjs.Dayjs | null {
    const dayNumbers = days
      .map((d) => parseInt(d, 10))
      .filter((n) => !isNaN(n) && n >= SCHEDULE_CONSTANTS.WEEKLY_DAY_MIN && n <= SCHEDULE_CONSTANTS.WEEKLY_DAY_MAX)
      .sort((a, b) => a - b);

    if (dayNumbers.length === 0) {
      logger.warn(`[ExpenseScheduleCore] No valid weekly days found in: ${days.join(',')}`);
      return null;
    }

    for (let i = 0; i < SCHEDULE_CONSTANTS.WEEKLY_SEARCH_DAYS; i++) {
      const checkDate = searchFrom.add(i, 'day');
      // dayjs uses 0=Sunday, but we want 1=Monday, 7=Sunday (ISO format)
      let isoDayOfWeek: number = checkDate.day();
      isoDayOfWeek = isoDayOfWeek === 0 ? 7 : isoDayOfWeek;

      if (dayNumbers.includes(isoDayOfWeek)) {
        return checkDate;
      }
    }

    return null;
  }

  /**
   * Find next monthly occurrence
   * Days can be 1-31 or 'last'
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
            // Handle months with fewer days
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
   * Find next yearly occurrence
   * Days are in MM-DD format
   */
  private findNextYearlyDate(days: string[], searchFrom: dayjs.Dayjs): dayjs.Dayjs | null {
    const currentYear = searchFrom.year();

    for (let yearOffset = 0; yearOffset < SCHEDULE_CONSTANTS.YEARLY_SEARCH_YEARS; yearOffset++) {
      const year = currentYear + yearOffset;

      // Parse and sort dates for this year
      const datesForYear: dayjs.Dayjs[] = [];

      for (const day of days) {
        const targetDate = dayjs.utc(`${year}-${day}`).startOf('day');

        // Skip invalid dates (e.g., Feb 30)
        if (!targetDate.isValid()) {
          continue;
        }

        datesForYear.push(targetDate);
      }

      // Sort dates chronologically
      datesForYear.sort((a, b) => a.valueOf() - b.valueOf());

      // Find the first date that is on or after searchFrom
      for (const targetDate of datesForYear) {
        if (targetDate.isSame(searchFrom) || targetDate.isAfter(searchFrom)) {
          return targetDate;
        }
      }
    }

    return null;
  }

  /**
   * Calculate all scheduled dates within a range.
   * 
   * This is the unified method for calculating scheduled dates. It replaces
   * the previous calculateAllScheduledDates and calculateScheduledDatesInRange methods.
   * 
   * @param scheduleType - Type of schedule (weekly, monthly, yearly, one_time)
   * @param scheduleDays - Schedule configuration string
   * @param rangeStart - Start of the date range (inclusive)
   * @param rangeEnd - End of the date range (inclusive)
   * @param afterDate - Optional: only return dates AFTER this date (exclusive)
   *                    If not provided, includes all dates from rangeStart
   * @returns Array of scheduled dates within the range
   */
  private calculateScheduledDatesInRange(
    scheduleType: string,
    scheduleDays: string,
    rangeStart: Date,
    rangeEnd: Date,
    afterDate?: Date
  ): Date[] {
    const dates: Date[] = [];

    const rangeStartDayjs = dayjs(rangeStart).utc().startOf('day');
    const rangeEndDayjs = dayjs(rangeEnd).utc().startOf('day');

    // If afterDate is provided, use it; otherwise use day before rangeStart
    const effectiveAfterDate = afterDate
      ? dayjs(afterDate).utc().startOf('day')
      : rangeStartDayjs.subtract(1, 'day');

    // For one-time schedules, just check if the date is within range
    if (scheduleType === SCHEDULE_TYPES.ONE_TIME) {
      const oneTimeDate = dayjs(scheduleDays).utc().startOf('day');

      if (!oneTimeDate.isValid()) {
        logger.warn(`[ExpenseScheduleCore] Invalid one-time date: ${scheduleDays}`);
        return dates;
      }

      // Check if within range AND after the effective after date
      const isAfterStart = oneTimeDate.isAfter(effectiveAfterDate);
      const isWithinRange =
        (oneTimeDate.isSame(rangeStartDayjs) || oneTimeDate.isAfter(rangeStartDayjs)) &&
        (oneTimeDate.isSame(rangeEndDayjs) || oneTimeDate.isBefore(rangeEndDayjs));

      if (isAfterStart && isWithinRange) {
        dates.push(oneTimeDate.hour(12).minute(0).second(0).millisecond(0).toDate());
      }

      return dates;
    }

    // For recurring schedules, iterate through all occurrences
    let referenceDate = effectiveAfterDate.toDate();
    let iterations = 0;

    while (iterations < SCHEDULE_CONSTANTS.MAX_SCHEDULED_DATES_ITERATIONS) {
      const nextDate = this.calculateNextScheduledAt(
        scheduleType,
        scheduleDays,
        rangeStart,
        null, // Don't pass endAt here, we check manually
        referenceDate
      );

      if (!nextDate) {
        break;
      }

      const nextDayjs = dayjs(nextDate).utc().startOf('day');

      // Stop if we've passed the end date
      if (nextDayjs.isAfter(rangeEndDayjs)) {
        break;
      }

      dates.push(nextDate);
      referenceDate = nextDate;
      iterations++;
    }

    if (iterations >= SCHEDULE_CONSTANTS.MAX_SCHEDULED_DATES_ITERATIONS) {
      logger.warn(
        `[ExpenseScheduleCore] Hit max iterations (${SCHEDULE_CONSTANTS.MAX_SCHEDULED_DATES_ITERATIONS}) ` +
        `calculating scheduled dates for type: ${scheduleType}`
      );
    }

    return dates;
  }

  /**
   * Calculate all missed dates between lastAddedAt and asOfDate
   * 
   * @deprecated Use calculateScheduledDatesInRange instead
   */
  public calculateMissedDates(
    scheduleType: string,
    scheduleDays: string,
    startAt: Date,
    endAt: Date | null,
    lastAddedAt: Date | null,
    asOfDate: Date,
  ): Date[] {
    const effectiveStartAt = lastAddedAt
      ? dayjs(lastAddedAt).utc().startOf('day').toDate()
      : dayjs(startAt).utc().subtract(1, 'day').startOf('day').toDate();

    const effectiveEndAt = endAt
      ? dayjs(endAt).utc().startOf('day')
      : dayjs(asOfDate).utc().startOf('day');

    const actualEndAt = effectiveEndAt.isBefore(dayjs(asOfDate).utc().startOf('day'))
      ? effectiveEndAt.toDate()
      : dayjs(asOfDate).utc().startOf('day').toDate();

    return this.calculateScheduledDatesInRange(
      scheduleType,
      scheduleDays,
      startAt,
      actualEndAt,
      effectiveStartAt
    );
  }

  /**
   * Calculate subtotal and totalPrice if not provided
   */
  private calculateTotals(params: any): any {
    const costWork = parseFloat(params.costWork) || 0;
    const costParts = parseFloat(params.costParts) || 0;
    const tax = parseFloat(params.tax) || 0;
    const fees = parseFloat(params.fees) || 0;

    let subtotal = params.subtotal;
    let totalPrice = params.totalPrice;

    // Calculate subtotal if not provided
    if (subtotal === undefined || subtotal === null) {
      subtotal = costWork + costParts;
    } else {
      subtotal = parseFloat(subtotal) || 0;
    }

    // Calculate totalPrice if not provided
    if (totalPrice === undefined || totalPrice === null) {
      totalPrice = subtotal + tax + fees;
    } else {
      totalPrice = parseFloat(totalPrice) || 0;
    }

    return {
      ...params,
      subtotal,
      totalPrice,
    };
  }

  // ===========================================================================
  // List
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Use AppCore's filterAccessibleCarIds for DRIVER role restriction
    const carIdFilter = await this.filterAccessibleCarIds(filter?.carId);

    return {
      ...args,
      filter: {
        ...filter,
        accountId,
        ...(carIdFilter ? { carId: carIdFilter } : {}),
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: item.carId, accountId: item.accountId });

    if (!hasAccess) {
      return null;
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const { accountId } = this.getContext();

    // Filter to only items in this account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    // Get accessible car IDs
    const carIds = [...new Set(filteredItems.map((item) => item.carId))];
    const accessibleCarIds = await this.filterAccessibleCarIds(carIds);
    const accessibleSet = new Set(accessibleCarIds);

    // Filter to only accessible cars
    const accessibleItems = filteredItems.filter((item) => accessibleSet.has(item.carId));

    return accessibleItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create expence schedules');
    }

    const trialCheck = await trialCheckMiddleware({
      core: this,
      operation: 'create',
      featureCode: FEATURE_CODES.EXPENSE_SCHEDULES_QTY,
      featureValue: await this.expenseSchedulesQty(),
    });

    if (trialCheck.code !== OP_RESULT_CODES.OK) {
      return trialCheck;
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to create expence schedules for the vehicle');
    }

    // Calculate totals
    const paramsWithTotals = this.calculateTotals(params);

    // Calculate initial next_scheduled_at
    const startAt = new Date(params.startAt);
    const endAt = params.endAt ? new Date(params.endAt) : null;

    // For initial calculation, use day before start date as reference
    const referenceDate = dayjs(startAt).subtract(1, 'day').toDate();
    const nextScheduledAt = this.calculateNextScheduledAt(
      params.scheduleType,
      params.scheduleDays,
      startAt,
      endAt,
      referenceDate,
    );

    const newSchedule = {
      ...paramsWithTotals,
      accountId,
      userId,
      nextScheduledAt,
      status: params.status ?? EXPENSE_SCHEDULE_STATUS.ACTIVE,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newSchedule;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
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

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update expence schedules');
    }

    // Check if schedule exists and user has access
    const schedule = await this.getGateways().expenseScheduleGw.get(id);

    if (!schedule || schedule.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: schedule.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to update the expence schedule');
    }

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, ...restParams } = params;

    // Calculate totals with merged values
    const paramsWithTotals = this.calculateTotals({
      costWork: params.costWork ?? schedule.costWork,
      costParts: params.costParts ?? schedule.costParts,
      tax: params.tax ?? schedule.tax,
      fees: params.fees ?? schedule.fees,
      subtotal: params.subtotal,
      totalPrice: params.totalPrice,
    });

    // Recalculate next_scheduled_at if schedule config changed
    const scheduleType = params.scheduleType ?? schedule.scheduleType;
    const scheduleDays = params.scheduleDays ?? schedule.scheduleDays;
    const startAt = params.startAt ? new Date(params.startAt) : new Date(schedule.startAt);
    const endAt =
      params.endAt !== undefined
        ? params.endAt
          ? new Date(params.endAt)
          : null
        : schedule.endAt
          ? new Date(schedule.endAt)
          : null;

    let nextScheduledAt = schedule.nextScheduledAt;

    // Recalculate if any schedule-related field changed
    if (
      params.scheduleType !== undefined ||
      params.scheduleDays !== undefined ||
      params.startAt !== undefined ||
      params.endAt !== undefined
    ) {
      const referenceDate = schedule.lastAddedAt
        ? new Date(schedule.lastAddedAt)
        : dayjs(startAt).subtract(1, 'day').toDate();

      nextScheduledAt = this.calculateNextScheduledAt(scheduleType, scheduleDays, startAt, endAt, referenceDate);
    }

    const updateParams = {
      ...restParams,
      ...paramsWithTotals,
      nextScheduledAt,
      updatedBy: userId,
      updatedAt: this.now(),
    };

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return updateParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, roleId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule ID is required');
    }

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove expence schedules');
    }

    // Check if schedule exists and user has access
    const schedule = await this.getGateways().expenseScheduleGw.get(id);

    if (!schedule || schedule.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: schedule.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to remove the expence schedule');
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId, roleId } = this.getContext();
    const allowedWhere: any[] = [];

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove expence schedules');
    }

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const schedule = await this.getGateways().expenseScheduleGw.get(id);

      if (!schedule || schedule.accountId !== accountId) {
        continue;
      }

      const hasAccess = await this.validateCarAccess({ id: schedule.carId, accountId });

      if (hasAccess) {
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Custom Actions: Pause, Resume, RunNow
  // ===========================================================================

  /**
   * Pause an active schedule
   */
  public async pause(args: { where: { id: string } }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: false,
      doingWhat: 'pausing expense schedule',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const { id } = actionArgs?.where || {};
        const { accountId, userId } = this.getContext();

        if (!id) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Schedule ID is required');
        }

        const schedule = await this.getGateways().expenseScheduleGw.get(id);

        if (!schedule || schedule.accountId !== accountId) {
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
        }

        const hasAccess = await this.validateCarAccess({ id: schedule.carId, accountId });

        if (!hasAccess) {
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
        }

        if (schedule.status === EXPENSE_SCHEDULE_STATUS.PAUSED) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Schedule is already paused');
        }

        if (schedule.status === EXPENSE_SCHEDULE_STATUS.COMPLETED) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Cannot pause a completed schedule');
        }

        const updatedItems = await this.getGateways().expenseScheduleGw.update(
          { id, accountId },
          {
            status: EXPENSE_SCHEDULE_STATUS.PAUSED,
            updatedBy: userId,
            updatedAt: this.now(),
          }
        );

        const updatedSchedule = updatedItems[0];

        return OpResult.ok([this.processItemOnOut(updatedSchedule)]);
      },
    });
  }

  /**
   * Resume a paused schedule.
   * 
   * IMPORTANT: When resuming, we skip the paused period by updating last_added_at
   * to yesterday. This ensures that no expenses are generated for the time the
   * schedule was paused. Only future occurrences will be created.
   * 
   * Example:
   * - Schedule paused on Jan 1 (last_added_at = Dec 15)
   * - Resume on April 1
   * - last_added_at is updated to March 31 (yesterday)
   * - Next scheduled expense will be April's occurrence, not Jan/Feb/Mar
   */
  public async resume(args: { where: { id: string } }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: false,
      doingWhat: 'resuming expense schedule',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const { id } = actionArgs?.where || {};
        const { accountId, userId } = this.getContext();

        if (!id) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Schedule ID is required');
        }

        const schedule = await this.getGateways().expenseScheduleGw.get(id);

        if (!schedule || schedule.accountId !== accountId) {
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
        }

        const hasAccess = await this.validateCarAccess({ id: schedule.carId, accountId });

        if (!hasAccess) {
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
        }

        if (schedule.status === EXPENSE_SCHEDULE_STATUS.ACTIVE) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Schedule is already active');
        }

        if (schedule.status === EXPENSE_SCHEDULE_STATUS.COMPLETED) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Cannot resume a completed schedule');
        }

        const now = this.now();
        const today = dayjs(now).utc().startOf('day');
        const startAt = new Date(schedule.startAt);
        const endAt = schedule.endAt ? new Date(schedule.endAt) : null;

        // Check if schedule has already ended
        if (endAt && dayjs(endAt).utc().startOf('day').isBefore(today)) {
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Cannot resume a schedule that has already ended'
          );
        }

        // IMPORTANT: Skip the paused period by setting last_added_at to yesterday.
        // This ensures no expenses are generated for the time the schedule was paused.
        // We use yesterday so that if today matches a scheduled day, it will be included.
        const yesterday = today.subtract(1, 'day').toDate();

        // Use the later of: original last_added_at or yesterday
        // This handles edge case where schedule was paused and resumed on same day
        const originalLastAddedAt = schedule.lastAddedAt
          ? dayjs(schedule.lastAddedAt).utc().startOf('day')
          : null;

        const newLastAddedAt = originalLastAddedAt && originalLastAddedAt.isAfter(dayjs(yesterday))
          ? schedule.lastAddedAt
          : yesterday;

        // Calculate next scheduled date from yesterday (so today can be included if applicable)
        const nextScheduledAt = this.calculateNextScheduledAt(
          schedule.scheduleType,
          schedule.scheduleDays,
          startAt,
          endAt,
          yesterday
        );

        // If no next occurrence exists, the schedule is effectively complete
        if (!nextScheduledAt) {
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'No future occurrences found for this schedule'
          );
        }

        const updated = await this.getGateways().expenseScheduleGw.update(
          { id, accountId },
          {
            status: EXPENSE_SCHEDULE_STATUS.ACTIVE,
            lastAddedAt: newLastAddedAt,
            nextScheduledAt,
            updatedBy: userId,
            updatedAt: now,
          }
        );

        const updatedSchedule = updated[0];

        return OpResult.ok([this.processItemOnOut(updatedSchedule)]);
      },
    });
  }

  /**
   * Manually trigger expense synchronization from a schedule.
   * 
   * @param args.where.id - Schedule ID
   * @param args.skipPausedPeriod - If true, only create expenses from today onwards,
   *                                ignoring any missed dates. Default: false (create all missed)
   * 
   * When skipPausedPeriod is false (default):
   * - Creates all missing expenses from startAt to today
   * - Updates existing expenses if amounts changed
   * - Soft-deletes expenses outside valid date range
   * 
   * When skipPausedPeriod is true:
   * - Only creates expense for today (if today matches schedule)
   * - Does NOT create expenses for past missed dates
   * - Useful when user wants to "start fresh" without backfilling
   * 
   * After processing, immediately recalculates car stats and service intervals.
   * 
   * @returns OpResult with { addedQty, updatedQty, removedQty }
   */
  public async runNow(args: {
    where: { id: string };
    skipPausedPeriod?: boolean;
  }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: true,
      doingWhat: 'running expense schedule now',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const { id } = actionArgs?.where || {};
        const skipPausedPeriod = actionArgs?.skipPausedPeriod ?? false;
        const { accountId, userId } = this.getContext();

        if (!id) {
          return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Schedule ID is required');
        }

        const schedule = await this.getGateways().expenseScheduleGw.get(id);

        if (!schedule || schedule.accountId !== accountId) {
          this.logger.log(`Schedule ${id} was not found or it belongs to another account`, schedule);
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
        }

        const hasAccess = await this.validateCarAccess({ id: schedule.carId, accountId });

        if (!hasAccess) {
          this.logger.log(`The user ${userId} has no permission to run expense schedule for the vehicle ${schedule.carId}`);
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense schedule not found');
        }

        // Check if schedule is in a valid state
        if (schedule.status === EXPENSE_SCHEDULE_STATUS.COMPLETED) {
          this.logger.log(`Failed to run expense schedule ${id} it is already completed:`, schedule);
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Cannot run a completed schedule'
          );
        }

        // Note: We allow running PAUSED schedules via runNow - it's a manual action

        const now = this.now();
        const today = dayjs(now).utc().startOf('day');
        const startAt = dayjs(schedule.startAt).utc().startOf('day');
        const endAt = schedule.endAt ? dayjs(schedule.endAt).utc().startOf('day') : null;

        // Check if schedule hasn't started yet
        if (startAt.isAfter(today)) {
          this.logger.log(`Cannot run expense schedule ${id} as it has not started yet:`, schedule);
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Schedule has not started yet. Start date is in the future.'
          );
        }

        this.logger.debug(`Running expense schedule ${id}`);

        // Calculate the effective end date (earlier of endAt or today)
        const effectiveEndDate = endAt && endAt.isBefore(today) ? endAt : today;

        // Determine the start date for calculating scheduled dates
        let calculationStartDate: dayjs.Dayjs;

        if (skipPausedPeriod) {
          // Only look at today - skip all past dates
          calculationStartDate = today;
        } else {
          // Look at all dates from schedule start
          calculationStartDate = startAt;
        }

        // Calculate all dates that SHOULD have expenses
        const scheduledDates = this.calculateScheduledDatesInRange(
          schedule.scheduleType,
          schedule.scheduleDays,
          calculationStartDate.toDate(),
          effectiveEndDate.toDate()
        );

        this.logger.debug(`Scheduled dates for the schedule ${id} are:`, scheduledDates);

        // Get existing expenses WITH DATE RANGE FILTERING for efficiency
        const dateRange = scheduledDates.length > 0
          ? {
            start: scheduledDates[0],
            end: scheduledDates[scheduledDates.length - 1]
          }
          : {
            start: calculationStartDate.toDate(),
            end: effectiveEndDate.toDate()
          };


        this.logger.debug(`Date range for the schedule ${id} are:`, dateRange);

        const existingExpenses = await this.getExpensesByScheduleId(id, accountId, dateRange);

        this.logger.debug(`Existing expenses created by the schedule ${id} are:`, existingExpenses);

        // Build a map of existing expenses by date (YYYY-MM-DD)
        const existingByDate = new Map<string, any>();
        for (const expense of existingExpenses) {
          const dateKey = dayjs(expense.whenDone).utc().format('YYYY-MM-DD');
          existingByDate.set(dateKey, expense);
        }

        // Build a set of scheduled date keys
        const scheduledDateKeys = new Set<string>();
        for (const date of scheduledDates) {
          const dateKey = dayjs(date).utc().format('YYYY-MM-DD');
          scheduledDateKeys.add(dateKey);
        }

        // Check if there's nothing to do
        if (scheduledDates.length === 0) {
          // Check if all existing expenses are still valid (no orphans to remove)
          const orphanedExpenses = [...existingByDate.keys()].filter(
            (dateKey) => !scheduledDateKeys.has(dateKey)
          );

          if (orphanedExpenses.length === 0) {
            this.logger.log(skipPausedPeriod
              ? `Today does not match any scheduled date for the schedule ${id}`
              : `No scheduled dates found within the valid range for the schedule ${id}`);

            return OpResult.fail(
              OP_RESULT_CODES.VALIDATION_FAILED,
              {},
              skipPausedPeriod
                ? 'Today does not match any scheduled date'
                : 'No scheduled dates found within the valid range'
            );
          }
        }

        // Get user's home currency if not specified in schedule
        let paidInCurrency = schedule.paidInCurrency;
        let homeCurrency = paidInCurrency;

        if (!paidInCurrency) {
          const userProfile = await this.getCurrentUserProfile();
          paidInCurrency = userProfile?.homeCurrency || 'USD';
          homeCurrency = paidInCurrency;
        }

        let addedQty = 0;
        let updatedQty = 0;
        let removedQty = 0;
        let lastCreatedExpenseId: string | null = schedule.lastCreatedExpenseId;
        let lastAddedAt: Date | null = schedule.lastAddedAt ? new Date(schedule.lastAddedAt) : null;

        // Track if any changes were made (for stats update)
        let hasChanges = false;

        // 1. Create missing expenses
        for (const scheduledDate of scheduledDates) {
          const dateKey = dayjs(scheduledDate).utc().format('YYYY-MM-DD');

          if (!existingByDate.has(dateKey)) {
            this.logger.debug(`Create an expense on date ${dateKey} from the schedule ${id}`);

            // Create new expense for this date
            const expenseId = await this.createExpenseFromSchedule(
              schedule,
              scheduledDate,
              accountId,
              userId,
              paidInCurrency,
              homeCurrency,
              now
            );

            if (expenseId) {
              addedQty++;
              lastCreatedExpenseId = expenseId;
              hasChanges = true;

              // Track the latest added date
              if (!lastAddedAt || dayjs(scheduledDate).isAfter(dayjs(lastAddedAt))) {
                lastAddedAt = scheduledDate;
              }
            }
          }
        }

        // 2. Update existing expenses with new amounts (if schedule was modified)
        // Only update if NOT skipping paused period (skipPausedPeriod=false means full sync)
        if (!skipPausedPeriod) {
          for (const [dateKey, expense] of existingByDate) {
            if (scheduledDateKeys.has(dateKey)) {

              // This expense is within valid range, check if it needs updating
              const needsUpdate = this.expenseNeedsUpdate(expense, schedule);

              if (needsUpdate) {
                this.logger.debug(`Updating an expense on date ${dateKey} from the schedule ${id}`, expense);
                await this.updateExpenseFromSchedule(expense, schedule, userId, now);
                updatedQty++;
                hasChanges = true;
              }
            }
          }

          // 3. Soft-delete expenses that are outside the valid date range
          for (const [dateKey, expense] of existingByDate) {
            if (!scheduledDateKeys.has(dateKey)) {
              this.logger.debug(`Remove an expense on date ${dateKey} from the schedule ${id}`, expense);
              // This expense is outside the valid range, soft delete it
              await this.softDeleteExpense(expense, userId, now);
              removedQty++;
              hasChanges = true;
            }
          }
        }

        // Check if anything was done
        if (addedQty === 0 && updatedQty === 0 && removedQty === 0) {
          this.logger.log(`All scheduled expenses already exist and are up to date`);

          return OpResult.fail(
            OP_RESULT_CODES.OK,
            [this.processItemOnOut(schedule)],
            'All scheduled expenses already exist and are up to date'
          );
        }

        // If skipPausedPeriod, update lastAddedAt to skip the gap
        if (skipPausedPeriod && addedQty > 0) {
          // Set lastAddedAt to today to mark the "fresh start"
          const latestScheduledDate = scheduledDates[scheduledDates.length - 1];
          lastAddedAt = latestScheduledDate;
        }

        // Calculate next scheduled date (after today)
        const nextScheduledAt = this.calculateNextScheduledAt(
          schedule.scheduleType,
          schedule.scheduleDays,
          new Date(schedule.startAt),
          schedule.endAt ? new Date(schedule.endAt) : null,
          today.toDate()
        );

        this.logger.debug(`Next scheduled date is ${nextScheduledAt} for the expense schedule ${schedule.id}`);

        // Determine new status
        let newStatus = schedule.status;

        // If schedule was PAUSED and we ran it, keep it PAUSED (user must explicitly resume)
        // Unless it's a one-time schedule that just completed
        if (schedule.scheduleType === SCHEDULE_TYPES.ONE_TIME) {
          newStatus = EXPENSE_SCHEDULE_STATUS.COMPLETED;
        } else if (!nextScheduledAt && endAt && endAt.isBefore(today)) {
          // Schedule has ended
          newStatus = EXPENSE_SCHEDULE_STATUS.COMPLETED;
        }

        // Update the schedule
        await this.getGateways().expenseScheduleGw.update(
          { id, accountId },
          {
            lastAddedAt,
            nextScheduledAt,
            lastCreatedExpenseId,
            status: newStatus,
            updatedBy: userId,
            updatedAt: now,
          }
        );

        const db = this.getDb();

        // ===========================================================================
        // Immediate Stats Update (user is waiting)
        // ===========================================================================
        if (hasChanges) {
          try {
            logger.debug(
              `[ExpenseScheduleCore] Updating stats for car ${schedule.carId} (currency: ${homeCurrency})`
            );

            const statsUpdater = new CarStatsUpdater(db, config.dbSchema);
            await statsUpdater.recalculateCarStats(schedule.carId, homeCurrency);

            logger.debug(
              `[ExpenseScheduleCore] Stats update complete for car ${schedule.carId}`
            );
          } catch (error: any) {
            // Log error but don't fail the operation - expenses were created successfully
            logger.error(
              `[ExpenseScheduleCore] Failed to update stats for car ${schedule.carId}:`,
              error
            );
          }

          // ===========================================================================
          // Immediate Service Interval Update
          // ===========================================================================
          if (schedule.kindId) {
            try {
              logger.debug(
                `[ExpenseScheduleCore] Updating service interval for car ${schedule.carId}, kind ${schedule.kindId}`
              );

              const serviceIntervalUpdater = new ServiceIntervalNextUpdater(db, config.dbSchema);
              await serviceIntervalUpdater.recalculateForCarAndKind(schedule.carId, schedule.kindId);

              logger.debug(
                `[ExpenseScheduleCore] Service interval update complete for car ${schedule.carId}, kind ${schedule.kindId}`
              );
            } catch (error: any) {
              // Log error but don't fail the operation
              logger.error(
                `[ExpenseScheduleCore] Failed to update service interval for car ${schedule.carId}, kind ${schedule.kindId}:`,
                error
              );
            }
          }
        }

        // Fetch updated schedule
        const updatedSchedule = await this.getGateways().expenseScheduleGw.get(id);

        const result = OpResult.ok([this.processItemOnOut(updatedSchedule)]);
        result['addedQty'] = addedQty;
        result['updatedQty'] = updatedQty;
        result['removedQty'] = removedQty;

        return result;
      },
    });
  }

  // ===========================================================================
  // Helper Methods for runNow
  // ===========================================================================

  /**
   * Get all expenses created by a specific schedule within a date range.
   * Uses date filtering to prevent loading entire expense history into memory.
   * 
   * @param scheduleId - The schedule ID
   * @param accountId - Account ID for security filtering
   * @param dateRange - Optional date range to filter expenses
   * @returns Array of expenses with id and whenDone fields
   */
  private async getExpensesByScheduleId(
    scheduleId: string,
    accountId: string | undefined,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    const db = this.getDb();

    let query: string;
    let bindings: any[];

    if (dateRange) {
      // Efficient range query when we know the date bounds
      query = `
        SELECT eb.id, eb.when_done, eb.subtototal, eb.tax, eb.fees, eb.total_price,
               eb.where_done, eb.comments, e.kind_id, e.cost_work, e.cost_parts, e.short_note
        FROM ${config.dbSchema}.${TABLES.EXPENSE_BASES} eb
        LEFT JOIN ${config.dbSchema}.${TABLES.EXPENSES} e ON e.id = eb.id
        WHERE eb.expense_schedule_id = ?
          AND eb.account_id = ?
          AND eb.removed_at IS NULL
          AND eb.when_done BETWEEN ? AND ?
        ORDER BY eb.when_done ASC
      `;
      bindings = [
        scheduleId,
        accountId,
        dayjs(dateRange.start).utc().startOf('day').toISOString(),
        dayjs(dateRange.end).utc().endOf('day').toISOString()
      ];
    } else {
      // Fallback: get all expenses but with a reasonable limit
      query = `
        SELECT eb.id, eb.when_done, eb.subtototal, eb.tax, eb.fees, eb.total_price,
               eb.where_done, eb.comments, e.kind_id, e.cost_work, e.cost_parts, e.short_note
        FROM ${config.dbSchema}.${TABLES.EXPENSE_BASES} eb
        LEFT JOIN ${config.dbSchema}.${TABLES.EXPENSES} e ON e.id = eb.id
        WHERE eb.expense_schedule_id = ?
          AND eb.account_id = ?
          AND eb.removed_at IS NULL
        ORDER BY eb.when_done ASC
        LIMIT ?
      `;
      bindings = [scheduleId, accountId, SCHEDULE_CONSTANTS.MAX_EXPENSES_PER_SCHEDULE];
    }

    const result = await db.runRawQuery(query, bindings);
    const rows = result?.rows ?? [];

    return camelKeys(rows);
  }

  /**
   * Create a new expense from a schedule for a specific date
   */
  private async createExpenseFromSchedule(
    schedule: any,
    expenseDate: Date,
    accountId: string | undefined,
    userId: string | undefined,
    paidInCurrency: string,
    homeCurrency: string,
    now: Date
  ): Promise<string | null> {
    // Defensive validation
    if (!schedule.accountId || !schedule.carId || !schedule.userId) {
      logger.error(
        `[ExpenseScheduleCore] Invalid schedule data for createExpenseFromSchedule: ` +
        `scheduleId=${schedule.id}, accountId=${schedule.accountId}, carId=${schedule.carId}, userId=${schedule.userId}`
      );
      return null;
    }

    // Create expense_base record
    const expenseBaseResult = await this.getGateways().expenseBaseGw.create({
      accountId,
      userId: schedule.userId,
      carId: schedule.carId,
      expenseType: EXPENSE_TYPES.EXPENSE,
      expenseScheduleId: schedule.id, // Link to the schedule
      whenDone: expenseDate,
      whereDone: schedule.whereDone,
      subtototal: schedule.subtotal,
      tax: schedule.tax,
      fees: schedule.fees,
      totalPrice: schedule.totalPrice,
      paidInCurrency,
      homeCurrency,
      totalPriceInHc: schedule.totalPrice, // Note: Now the user is responsible to enter amount in home currency based on bank statement
      comments: schedule.comments,
      status: STATUSES.ACTIVE,
      createdBy: userId,
      createdAt: now,
    });

    const expenseBaseId = Array.isArray(expenseBaseResult)
      ? expenseBaseResult[0]?.id
      : expenseBaseResult?.id;

    if (!expenseBaseId) {
      logger.error(`[ExpenseScheduleCore] Failed to create expense_base for schedule ${schedule.id}`);
      return null;
    }

    // Create expense record (with same ID as expense_base)
    await this.getGateways().expenseGw.create({
      id: expenseBaseId,
      kindId: schedule.kindId,
      costWork: schedule.costWork,
      costParts: schedule.costParts,
      costWorkHc: schedule.costWork, // Note: Now the user is responsible to enter amount in home currency based on bank statement
      costPartsHc: schedule.costParts,
      shortNote: schedule.shortNote,
    });

    logger.debug(
      `[ExpenseScheduleCore] Created expense ${expenseBaseId} for schedule ${schedule.id} ` +
      `on ${expenseDate.toISOString()}`
    );

    return expenseBaseId;
  }

  /**
   * Check if an existing expense needs to be updated based on schedule changes
   */
  private expenseNeedsUpdate(expense: any, schedule: any): boolean {
    // Compare relevant fields
    const fieldsToCompare = [
      { expenseField: 'subtototal', scheduleField: 'subtotal' },
      { expenseField: 'tax', scheduleField: 'tax' },
      { expenseField: 'fees', scheduleField: 'fees' },
      { expenseField: 'totalPrice', scheduleField: 'totalPrice' },
      { expenseField: 'whereDone', scheduleField: 'whereDone' },
      { expenseField: 'comments', scheduleField: 'comments' },
      { expenseField: 'kindId', scheduleField: 'kindId' },
      { expenseField: 'costWork', scheduleField: 'costWork' },
      { expenseField: 'costParts', scheduleField: 'costParts' },
      { expenseField: 'shortNote', scheduleField: 'shortNote' },
    ];

    for (const { expenseField, scheduleField } of fieldsToCompare) {
      const expenseValue = expense[expenseField];
      const scheduleValue = schedule[scheduleField];

      // Handle null/undefined comparison
      if (expenseValue == null && scheduleValue == null) {
        continue;
      }

      if (expenseValue == null || scheduleValue == null) {
        return true;
      }

      // Handle numeric comparison
      if (typeof scheduleValue === 'number' || !isNaN(parseFloat(scheduleValue))) {
        if (parseFloat(expenseValue) !== parseFloat(scheduleValue)) {
          return true;
        }
      } else {
        // String comparison
        if (String(expenseValue) !== String(scheduleValue)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update an existing expense with new schedule values
   */
  private async updateExpenseFromSchedule(
    expense: any,
    schedule: any,
    userId: string | undefined,
    now: Date
  ): Promise<void> {
    // Update expense_base record
    await this.getGateways().expenseBaseGw.update(
      { id: expense.id, accountId: expense.accountId },
      {
        whereDone: schedule.whereDone,
        subtototal: schedule.subtotal,
        tax: schedule.tax,
        fees: schedule.fees,
        totalPrice: schedule.totalPrice,
        totalPriceInHc: schedule.totalPrice, // Note: Now the user is responsible to enter amount in home currency based on bank statement
        comments: schedule.comments,
        updatedBy: userId,
        updatedAt: now,
      }
    );

    // Update expense record
    await this.getGateways().expenseGw.update(
      { id: expense.id },
      {
        kindId: schedule.kindId,
        costWork: schedule.costWork,
        costParts: schedule.costParts,
        costWorkHc: schedule.costParts, // Note: Now the user is responsible to enter amount in home currency based on bank statement
        costPartsHc: schedule.costParts,
        shortNote: schedule.shortNote,
      }
    );

    logger.debug(`[ExpenseScheduleCore] Updated expense ${expense.id} from schedule ${schedule.expenseScheduleId}`);
  }

  /**
   * Soft-delete an expense (set removed_at)
   */
  private async softDeleteExpense(expense: any, userId: string | undefined, now: Date): Promise<void> {
    await this.getGateways().expenseBaseGw.update(
      { id: expense.id, accountId: expense.accountId },
      {
        removedAt: now,
        removedBy: userId,
        updatedBy: userId,
        updatedAt: now,
      }
    );

    logger.debug(`[ExpenseScheduleCore] Soft-deleted expense ${expense.id}`);
  }

  // ===========================================================================
  // Batch Processing for Cron Jobs
  // ===========================================================================

  /**
   * Process all scheduled expenses that are due.
   * This method is designed to be called by a cron job or CLI multiple times per day.
   * It is idempotent - safe to run multiple times without creating duplicates.
   * 
   * Uses FOR UPDATE SKIP LOCKED to safely handle concurrent execution from multiple
   * cron instances or workers.
   * 
   * Only processes schedules with status = ACTIVE (100).
   * Schedules with status PAUSED (50) or COMPLETED (200) are skipped.
   * 
   * The method respects last_added_at to avoid backfilling paused periods.
   * When a schedule is resumed via resume(), last_added_at is set to yesterday,
   * so this processor will only create expenses going forward.
   * 
   * After processing all schedules, bulk recalculates car stats and service intervals
   * for all affected cars.
   * 
   * @param args.batchSize - Number of schedules to process per batch (default: 100)
   * @param args.maxSchedules - Maximum total schedules to process in one run (default: 10000)
   * @returns Summary of processed schedules and created expenses
   */
  public async processScheduledExpenses(args?: {
    batchSize?: number;
    maxSchedules?: number;
  }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: false, // System action, no user context required
      hasTransaction: false, // We manage transactions per-schedule
      doingWhat: 'processing scheduled expenses',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const batchSize = actionArgs?.batchSize ?? SCHEDULE_CONSTANTS.DEFAULT_BATCH_SIZE;
        const maxSchedules = actionArgs?.maxSchedules ?? SCHEDULE_CONSTANTS.DEFAULT_MAX_SCHEDULES;

        const now = this.now();
        const todayEnd = dayjs(now).utc().endOf('day').toDate();
        const todayStart = dayjs(now).utc().startOf('day').toDate();

        let processedSchedules = 0;
        let createdExpenses = 0;
        let skippedExpenses = 0;
        let updatedSchedules = 0;
        let completedSchedules = 0;
        let errorCount = 0;
        const errors: Array<{ scheduleId: string; accountId: string; error: string }> = [];

        // Track affected cars for bulk stats update
        // Map: carId -> Set<homeCurrency>
        const affectedCars = new Map<string, Set<string>>();

        // Track affected service intervals
        // Array of { carId, kindId } for service interval updates
        const affectedServiceIntervals: Array<{ carId: string; kindId: number }> = [];

        let lastProcessedId: string | null = null;
        let hasMore = true;

        logger.log(
          `[ExpenseScheduleCore] Starting scheduled expense processing at ${now.toISOString()}`
        );
        logger.log(
          `[ExpenseScheduleCore] Parameters: batchSize=${batchSize}, maxSchedules=${maxSchedules}`
        );

        while (hasMore && processedSchedules < maxSchedules) {
          // Start a transaction for fetching the batch with FOR UPDATE SKIP LOCKED
          const db = this.getDb();
          const batchTrx = await db.createTransaction(null) as any;

          let schedules: any[] = [];

          try {
            // Fetch batch with row-level locking
            schedules = await this.getSchedulesDueForProcessingWithTrx(
              batchTrx,
              todayEnd,
              todayStart,
              batchSize,
              lastProcessedId
            );

            // Commit immediately to release locks - each schedule will have its own transaction
            await batchTrx.commit();
          } catch (error) {
            try {
              await batchTrx.rollback();
            } catch (rollbackError) {
              logger.error(`[ExpenseScheduleCore] Failed to rollback batch transaction:`, rollbackError);
            }
            throw error;
          }

          if (schedules.length === 0) {
            hasMore = false;
            break;
          }

          logger.log(`[ExpenseScheduleCore] Processing batch of ${schedules.length} schedules`);

          // Process each schedule in its own isolated transaction
          for (const schedule of schedules) {
            try {
              const result = await this.processSingleSchedule(schedule, now);

              processedSchedules++;
              createdExpenses += result.createdCount;
              skippedExpenses += result.skippedCount;

              if (result.updated) {
                updatedSchedules++;
              }

              if (result.completed) {
                completedSchedules++;
                logger.log(`[ExpenseScheduleCore] Schedule ${schedule.id} marked as COMPLETED`);
              }

              // Track affected cars for stats update (only if expenses were created)
              if (result.createdCount > 0) {
                if (!affectedCars.has(result.carId)) {
                  affectedCars.set(result.carId, new Set());
                }
                affectedCars.get(result.carId)!.add(result.homeCurrency);

                // Track for service interval updates
                if (result.kindId) {
                  // Check if this car+kindId combo is already tracked
                  const alreadyTracked = affectedServiceIntervals.some(
                    (item) => item.carId === result.carId && item.kindId === result.kindId
                  );
                  if (!alreadyTracked) {
                    affectedServiceIntervals.push({
                      carId: result.carId,
                      kindId: result.kindId,
                    });
                  }
                }

                logger.log(
                  `[ExpenseScheduleCore] Schedule ${schedule.id}: created ${result.createdCount} expenses, ` +
                  `skipped ${result.skippedCount} (already existed)`
                );
              }
            } catch (error: any) {
              errorCount++;
              errors.push({
                scheduleId: schedule.id,
                accountId: schedule.accountId,
                error: error.message || 'Unknown error',
              });

              logger.error(
                `[ExpenseScheduleCore] Failed to process schedule ${schedule.id} ` +
                `(account: ${schedule.accountId}):`,
                error
              );
            }

            lastProcessedId = schedule.id;
          }

          // If we got fewer than batch size, no more records
          if (schedules.length < batchSize) {
            hasMore = false;
          }
        }

        const db = this.getDb();

        // ===========================================================================
        // Bulk Stats Update for All Affected Cars
        // ===========================================================================
        let statsUpdatedCars = 0;
        let statsErrors = 0;

        if (affectedCars.size > 0) {
          logger.log(
            `[ExpenseScheduleCore] Starting bulk stats update for ${affectedCars.size} affected cars`
          );

          const statsUpdater = new CarStatsUpdater(db, config.dbSchema);

          for (const [carId, currencies] of affectedCars) {
            for (const homeCurrency of currencies) {
              try {
                await statsUpdater.recalculateCarStats(carId, homeCurrency);
                statsUpdatedCars++;
              } catch (error: any) {
                statsErrors++;
                logger.error(
                  `[ExpenseScheduleCore] Failed to update stats for car ${carId} (currency: ${homeCurrency}):`,
                  error
                );
              }
            }
          }

          logger.log(
            `[ExpenseScheduleCore] Stats update complete: ${statsUpdatedCars} car/currency combinations updated, ${statsErrors} errors`
          );
        }

        // ===========================================================================
        // Bulk Service Interval Update
        // ===========================================================================
        let serviceIntervalsUpdated = 0;
        let serviceIntervalErrors = 0;

        if (affectedServiceIntervals.length > 0) {
          logger.log(
            `[ExpenseScheduleCore] Starting service interval update for ${affectedServiceIntervals.length} car/kind combinations`
          );

          const serviceIntervalUpdater = new ServiceIntervalNextUpdater(db, config.dbSchema);

          for (const { carId, kindId } of affectedServiceIntervals) {
            try {
              await serviceIntervalUpdater.recalculateForCarAndKind(carId, kindId);
              serviceIntervalsUpdated++;
            } catch (error: any) {
              serviceIntervalErrors++;
              logger.error(
                `[ExpenseScheduleCore] Failed to update service interval for car ${carId}, kind ${kindId}:`,
                error
              );
            }
          }

          logger.log(
            `[ExpenseScheduleCore] Service interval update complete: ${serviceIntervalsUpdated} updated, ${serviceIntervalErrors} errors`
          );
        }

        const summary = {
          processedAt: now.toISOString(),
          processedSchedules,
          createdExpenses,
          skippedExpenses,
          updatedSchedules,
          completedSchedules,
          errorCount,
          errors: errors.slice(0, SCHEDULE_CONSTANTS.MAX_ERRORS_IN_RESPONSE),
          hasMoreToProcess: processedSchedules >= maxSchedules,
          // Stats update summary
          statsUpdatedCars,
          statsErrors,
          serviceIntervalsUpdated,
          serviceIntervalErrors,
        };

        logger.log(`[ExpenseScheduleCore] Processing complete:`, {
          processedSchedules,
          createdExpenses,
          skippedExpenses,
          completedSchedules,
          errorCount,
          statsUpdatedCars,
          statsErrors,
        });

        return OpResult.ok([summary]);
      },
    });
  }

  /**
   * Fetch schedules that are due for processing with cursor-based pagination.
   * Uses FOR UPDATE SKIP LOCKED to prevent concurrent processing of the same schedule.
   * 
   * Only fetches schedules where:
   * - status = ACTIVE (100) - PAUSED and COMPLETED are skipped
   * - removed_at IS NULL
   * - start_at <= asOfDate
   * - end_at IS NULL OR end_at >= todayStart
   * - next_scheduled_at <= asOfDate OR next_scheduled_at IS NULL
   * - associated car is active and not removed
   * 
   * Orders by ID for consistent cursor-based pagination.
   */
  private async getSchedulesDueForProcessingWithTrx(
    trx: any,
    asOfDate: Date,
    todayStart: Date,
    limit: number,
    afterId: string | null
  ): Promise<any> {
    const bindings: any[] = [
      EXPENSE_SCHEDULE_STATUS.ACTIVE,
      asOfDate,
      todayStart,
      asOfDate,
      STATUSES.ACTIVE,
    ];

    let cursorClause = '';
    if (afterId) {
      cursorClause = 'AND es.id > ?';
      bindings.push(afterId);
    }

    bindings.push(limit);

    // Note: FOR UPDATE SKIP LOCKED requires PostgreSQL 9.5+
    // It locks selected rows and skips any rows already locked by other transactions
    // This prevents duplicate processing when multiple cron instances run concurrently
    const query = `
      SELECT es.* 
      FROM ${config.dbSchema}.${TABLES.EXPENSE_SCHEDULES} es
      INNER JOIN ${config.dbSchema}.${TABLES.CARS} c ON c.id = es.car_id
      WHERE es.removed_at IS NULL
        AND es.status = ?
        AND es.start_at <= ?
        AND (es.end_at IS NULL OR es.end_at >= ?)
        AND (es.next_scheduled_at <= ? OR es.next_scheduled_at IS NULL)
        AND c.removed_at IS NULL
        AND c.status = ?
        ${cursorClause}
      ORDER BY es.id ASC
      LIMIT ?
      FOR UPDATE OF es SKIP LOCKED
    `;

    const result = await trx.raw(query, bindings);
    const rows = result?.rows ?? [];

    return camelKeys(rows);
  }

  /**
 * Process a single schedule - create all due expenses.
 * Uses explicit transaction handling for isolation.
 * 
 * Uses last_added_at as the reference point to avoid backfilling paused periods.
 * Only creates expenses for dates AFTER last_added_at up to today.
 */
  private async processSingleSchedule(
    schedule: any,
    now: Date
  ): Promise<{
    createdCount: number;
    skippedCount: number;
    updated: boolean;
    completed: boolean;
    // Stats tracking data
    carId: string;
    homeCurrency: string;
    kindId: number | null;
  }> {
    const db = this.getDb();

    // Create an isolated transaction - don't use db.startTransaction()
    // which overwrites the instance-level trx
    const trx = await db.createTransaction(null) as any;

    // Prepare stats tracking data (always return these, even on error path)
    const statsData = {
      carId: schedule.carId,
      homeCurrency: schedule.paidInCurrency || 'USD',
      kindId: schedule.kindId || null,
    };

    try {
      let createdCount = 0;
      let skippedCount = 0;
      let completed = false;

      const today = dayjs(now).utc().startOf('day');
      const startAt = dayjs(schedule.startAt).utc().startOf('day');
      const endAt = schedule.endAt ? dayjs(schedule.endAt).utc().startOf('day') : null;

      // Determine effective end date for processing (earlier of endAt or today)
      const effectiveEndDate = endAt && endAt.isBefore(today) ? endAt : today;

      // IMPORTANT: Use last_added_at as reference to respect paused periods.
      const lastAddedAt = schedule.lastAddedAt
        ? dayjs(schedule.lastAddedAt).utc().startOf('day')
        : null;

      // Reference date for finding next occurrences
      const referenceDate = lastAddedAt
        ? lastAddedAt.toDate()
        : dayjs(startAt).subtract(1, 'day').toDate();

      // Get all scheduled dates that need processing
      const scheduledDates = this.calculateScheduledDatesInRange(
        schedule.scheduleType,
        schedule.scheduleDays,
        startAt.toDate(),
        effectiveEndDate.toDate(),
        referenceDate
      );

      if (scheduledDates.length === 0) {
        // No dates to process, but still need to update next_scheduled_at
        const nextScheduledAt = this.calculateNextScheduledAt(
          schedule.scheduleType,
          schedule.scheduleDays,
          startAt.toDate(),
          endAt?.toDate() || null,
          today.toDate()
        );

        // Check if schedule should be marked as COMPLETED
        if (schedule.scheduleType === SCHEDULE_TYPES.ONE_TIME && lastAddedAt) {
          completed = true;
        } else if (!nextScheduledAt && endAt && (endAt.isBefore(today) || endAt.isSame(today))) {
          completed = true;
        }

        // Update schedule if needed
        const currentNextScheduledAt = schedule.nextScheduledAt
          ? new Date(schedule.nextScheduledAt).getTime()
          : null;
        const newNextScheduledAt = nextScheduledAt ? nextScheduledAt.getTime() : null;

        const needsUpdate = currentNextScheduledAt !== newNextScheduledAt || completed;

        if (needsUpdate) {
          await this.updateScheduleAfterProcessingWithTrx(
            trx,
            schedule.id,
            schedule.accountId,
            schedule.lastAddedAt ? new Date(schedule.lastAddedAt) : null,
            nextScheduledAt,
            schedule.lastCreatedExpenseId,
            completed ? EXPENSE_SCHEDULE_STATUS.COMPLETED : undefined,
            now
          );
        }

        await trx.commit();
        return { createdCount: 0, skippedCount: 0, updated: needsUpdate, completed, ...statsData };
      }

      // Get existing expenses for this schedule to check for duplicates
      const existingExpenses = await this.getExistingExpenseDatesWithTrx(
        trx,
        schedule.id,
        schedule.accountId,
        scheduledDates
      );

      const existingDateSet = new Set(
        existingExpenses.map((e: any) => dayjs(e.whenDone).utc().format('YYYY-MM-DD'))
      );

      // Get currency info
      let paidInCurrency = schedule.paidInCurrency;
      let homeCurrency = paidInCurrency;

      if (!paidInCurrency) {
        const userProfile = await this.getUserProfile(schedule.userId);
        paidInCurrency = userProfile?.homeCurrency || 'USD';
        homeCurrency = paidInCurrency;
      }

      // Update statsData with resolved currency
      statsData.homeCurrency = homeCurrency;

      let lastCreatedExpenseId = schedule.lastCreatedExpenseId;
      let latestAddedAt = schedule.lastAddedAt ? new Date(schedule.lastAddedAt) : null;

      // Create expenses for each scheduled date
      for (const scheduledDate of scheduledDates) {
        const dateKey = dayjs(scheduledDate).utc().format('YYYY-MM-DD');

        if (existingDateSet.has(dateKey)) {
          skippedCount++;
          continue;
        }

        // Create expense with explicit transaction
        const expenseId = await this.createExpenseFromScheduleWithTrx(
          trx,
          schedule,
          scheduledDate,
          paidInCurrency,
          homeCurrency,
          now
        );

        if (expenseId) {
          createdCount++;
          lastCreatedExpenseId = expenseId;

          if (!latestAddedAt || dayjs(scheduledDate).isAfter(dayjs(latestAddedAt))) {
            latestAddedAt = scheduledDate;
          }
        }
      }

      // Calculate next scheduled date (after today)
      const nextScheduledAt = this.calculateNextScheduledAt(
        schedule.scheduleType,
        schedule.scheduleDays,
        startAt.toDate(),
        endAt?.toDate() || null,
        today.toDate()
      );

      // Check if schedule should be marked as COMPLETED
      if (schedule.scheduleType === SCHEDULE_TYPES.ONE_TIME) {
        completed = true;
      } else if (!nextScheduledAt && endAt && (endAt.isBefore(today) || endAt.isSame(today))) {
        completed = true;
      }

      // Update schedule with new state
      await this.updateScheduleAfterProcessingWithTrx(
        trx,
        schedule.id,
        schedule.accountId,
        latestAddedAt,
        nextScheduledAt,
        lastCreatedExpenseId,
        completed ? EXPENSE_SCHEDULE_STATUS.COMPLETED : undefined,
        now
      );

      await trx.commit();
      return { createdCount, skippedCount, updated: true, completed, ...statsData };

    } catch (error) {
      try {
        await trx.rollback();
      } catch (rollbackError) {
        logger.error(
          `[ExpenseScheduleCore] Failed to rollback transaction for schedule ${schedule.id}:`,
          rollbackError
        );
      }
      throw error;
    }
  }

  /**
   * Get existing expense dates with explicit transaction.
   * Used for duplicate checking to ensure idempotency.
   */
  private async getExistingExpenseDatesWithTrx(
    trx: any,
    scheduleId: string,
    accountId: string,
    scheduledDates: Date[]
  ): Promise<any> {
    if (scheduledDates.length === 0) {
      return [];
    }

    // Get min and max dates for efficient range query
    const sortedDates = [...scheduledDates].sort((a, b) => a.getTime() - b.getTime());
    const minDate = dayjs(sortedDates[0]).utc().startOf('day').toISOString();
    const maxDate = dayjs(sortedDates[sortedDates.length - 1]).utc().endOf('day').toISOString();

    const query = `
      SELECT id, when_done
      FROM ${config.dbSchema}.${TABLES.EXPENSE_BASES}
      WHERE expense_schedule_id = ?
        AND account_id = ?
        AND removed_at IS NULL
        AND when_done BETWEEN ? AND ?
    `;

    const result = await trx.raw(query, [scheduleId, accountId, minDate, maxDate]);
    const rows = result?.rows ?? [];

    return camelKeys(rows);
  }

  /**
   * Create expense from schedule with explicit transaction.
   * Includes defensive validation to ensure data integrity.
   */
  private async createExpenseFromScheduleWithTrx(
    trx: any,
    schedule: any,
    expenseDate: Date,
    paidInCurrency: string,
    homeCurrency: string,
    now: Date
  ): Promise<string | null> {
    // Defensive validation
    if (!schedule.accountId || !schedule.carId || !schedule.userId) {
      logger.error(
        `[ExpenseScheduleCore] Invalid schedule data for schedule ${schedule.id}: ` +
        `accountId=${schedule.accountId}, carId=${schedule.carId}, userId=${schedule.userId}`
      );
      return null;
    }

    // Generate UUID
    const expenseId = uuidv4();

    // Insert expense_base record
    const insertExpenseBaseQuery = `
      INSERT INTO ${config.dbSchema}.${TABLES.EXPENSE_BASES} (
        id, account_id, user_id, car_id, expense_type, expense_schedule_id,
        when_done, where_done, subtototal, tax, fees, total_price,
        paid_in_currency, home_currency, total_price_in_hc, comments,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;

    const expenseBaseBindings = [
      expenseId,
      schedule.accountId,
      schedule.userId,
      schedule.carId,
      EXPENSE_TYPES.EXPENSE,
      schedule.id,
      expenseDate,
      schedule.whereDone,
      schedule.subtotal,
      schedule.tax,
      schedule.fees,
      schedule.totalPrice,
      paidInCurrency,
      homeCurrency,
      schedule.totalPrice, // total_price_in_hc - Note: Now the user is responsible to enter amount in home currency based on bank statement
      schedule.comments,
      STATUSES.ACTIVE,
      schedule.userId,
      now,
      now,
    ];

    const expenseBaseResult = await trx.raw(insertExpenseBaseQuery, expenseBaseBindings);

    if (!expenseBaseResult?.rows?.[0]?.id) {
      logger.error(`[ExpenseScheduleCore] Failed to create expense_base for schedule ${schedule.id}`);
      return null;
    }

    // Insert expense record
    const insertExpenseQuery = `
      INSERT INTO ${config.dbSchema}.${TABLES.EXPENSES} (
        id, kind_id, cost_work, cost_parts, cost_work_hc, cost_parts_hc, short_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const expenseBindings = [
      expenseId,
      schedule.kindId,
      schedule.costWork,
      schedule.costParts,
      schedule.costWork, // cost_work_hc - Note: Now the user is responsible to enter amount in home currency based on bank statement
      schedule.costParts, // cost_parts_hc
      schedule.shortNote,
    ];

    await trx.raw(insertExpenseQuery, expenseBindings);

    logger.debug(
      `[ExpenseScheduleCore] Created expense ${expenseId} for schedule ${schedule.id} ` +
      `on ${expenseDate.toISOString()}`
    );

    return expenseId;
  }

  /**
   * Update schedule after processing with explicit transaction.
   */
  private async updateScheduleAfterProcessingWithTrx(
    trx: any,
    id: string,
    accountId: string,
    lastAddedAt: Date | null,
    nextScheduledAt: Date | null,
    lastCreatedExpenseId: string | null,
    newStatus: number | undefined,
    now: Date
  ): Promise<void> {
    const setClauses: string[] = [
      'next_scheduled_at = ?',
      'updated_at = ?',
    ];
    const bindings: any[] = [nextScheduledAt, now];

    if (lastAddedAt) {
      setClauses.push('last_added_at = ?');
      bindings.push(lastAddedAt);
    }

    if (lastCreatedExpenseId) {
      setClauses.push('last_created_expense_id = ?');
      bindings.push(lastCreatedExpenseId);
    }

    if (newStatus !== undefined) {
      setClauses.push('status = ?');
      bindings.push(newStatus);
    }

    // Add WHERE clause bindings
    bindings.push(id, accountId);

    const query = `
      UPDATE ${config.dbSchema}.${TABLES.EXPENSE_SCHEDULES}
      SET ${setClauses.join(', ')}
      WHERE id = ? AND account_id = ?
    `;

    await trx.raw(query, bindings);
  }

  // End of class
}

export { ExpenseScheduleCore };