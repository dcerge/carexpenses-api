import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/vehicleFinancingValidators';
import {
  FINANCING_TYPES,
  VEHICLE_FINANCING_STATUS,
  SCHEDULE_TYPES,
  EXPENSE_SCHEDULE_STATUS,
} from '../database';
import { USER_ROLES } from '../boundary';
import { logger } from '../logger';

dayjs.extend(utc);

// Expense kind ID for financing/leasing payments (from seed data)
const FINANCING_LEASING_KIND_ID = 309;

class VehicleFinancingCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'vehicleFinancingGw',
      name: 'VehicleFinancing',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing vehicle financing records',
        get: 'getting a vehicle financing record',
        getMany: 'getting multiple vehicle financing records',
        create: 'creating a vehicle financing record',
        createMany: '',
        update: 'updating a vehicle financing record',
        updateMany: '',
        set: '',
        remove: 'removing a vehicle financing record',
        removeMany: 'removing multiple vehicle financing records',
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
  // Date/Time Formatting
  // ===========================================================================

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    const dateFields = ['startDate', 'endDate', 'createdAt', 'updatedAt', 'removedAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    // Compute derived fields
    item.paymentsRemaining = this.calculatePaymentsRemaining(item);
    item.remainingBalance = this.calculateRemainingBalance(item);
    item.percentComplete = this.calculatePercentComplete(item);
    item.totalMileageAllowance = this.calculateTotalMileageAllowance(item);

    return item;
  }

  // ===========================================================================
  // Computed Fields
  // ===========================================================================

  /**
   * Calculate number of payments remaining based on end date and current date.
   */
  private calculatePaymentsRemaining(item: any): number | null {
    if (!item.endDate || !item.startDate) {
      return null;
    }

    const now = dayjs().utc();
    const endDate = dayjs(item.endDate).utc();

    if (now.isAfter(endDate)) {
      return 0;
    }

    // Months remaining (rounded up to include partial months)
    const monthsRemaining = endDate.diff(now, 'month', true);
    return Math.max(0, Math.ceil(monthsRemaining));
  }

  /**
   * Calculate estimated remaining balance for loans using simple amortization.
   * For leases, returns null (residualValue is the relevant figure).
   */
  private calculateRemainingBalance(item: any): number | null {
    if (item.financingType !== FINANCING_TYPES.LOAN) {
      return null;
    }

    if (!item.totalAmount || !item.termMonths || !item.startDate) {
      return null;
    }

    const now = dayjs().utc();
    const startDate = dayjs(item.startDate).utc();
    const elapsedMonths = Math.max(0, now.diff(startDate, 'month'));

    const principal = parseFloat(item.totalAmount) - parseFloat(item.downPayment || 0);
    const interestRate = parseFloat(item.interestRate || 0) / 100;
    const termMonths = item.termMonths;

    if (principal <= 0 || termMonths <= 0) {
      return 0;
    }

    if (elapsedMonths >= termMonths) {
      return 0;
    }

    // If no interest, simple linear payoff
    if (interestRate === 0) {
      const monthlyPayment = principal / termMonths;
      return Math.max(0, principal - monthlyPayment * elapsedMonths);
    }

    // Standard amortization remaining balance formula:
    // B = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
    // where P = principal, r = monthly rate, n = total months, p = elapsed months
    const monthlyRate = interestRate / 12;
    const compoundTotal = Math.pow(1 + monthlyRate, termMonths);
    const compoundElapsed = Math.pow(1 + monthlyRate, elapsedMonths);

    const remainingBalance = principal * (compoundTotal - compoundElapsed) / (compoundTotal - 1);

    return Math.max(0, Math.round(remainingBalance * 100) / 100);
  }

  /**
   * Calculate percentage of term completed (0-100).
   */
  private calculatePercentComplete(item: any): number | null {
    if (!item.startDate || !item.endDate) {
      return null;
    }

    const now = dayjs().utc();
    const startDate = dayjs(item.startDate).utc();
    const endDate = dayjs(item.endDate).utc();

    const totalDays = endDate.diff(startDate, 'day');
    if (totalDays <= 0) {
      return 100;
    }

    const elapsedDays = now.diff(startDate, 'day');
    const percent = (elapsedDays / totalDays) * 100;

    return Math.round(Math.min(100, Math.max(0, percent)) * 100) / 100;
  }

  /**
   * Calculate total mileage allowance for the full lease term.
   * Annual allowance × (term months / 12).
   */
  private calculateTotalMileageAllowance(item: any): number | null {
    if (item.financingType !== FINANCING_TYPES.LEASE) {
      return null;
    }

    if (!item.mileageAllowance || !item.termMonths) {
      return null;
    }

    const annualAllowance = parseFloat(item.mileageAllowance);
    const termYears = item.termMonths / 12;

    return Math.round(annualAllowance * termYears);
  }

  // ===========================================================================
  // End Date Calculation
  // ===========================================================================

  /**
   * Auto-calculate endDate from startDate + termMonths when endDate is not provided.
   * If endDate is explicitly provided, it takes precedence.
   */
  private resolveEndDate(params: any): string | undefined {
    // Explicit endDate takes precedence
    if (params.endDate) {
      return params.endDate;
    }

    // Auto-calculate from startDate + termMonths
    if (params.startDate && params.termMonths && params.termMonths > 0) {
      return dayjs(params.startDate).add(params.termMonths, 'month').utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return undefined;
  }

  // ===========================================================================
  // Expense Schedule Helpers
  // ===========================================================================

  /**
   * Build expense schedule params from the nested expenseSchedule input
   * and financing context fields (carId, dates, lender, etc.).
   */
  private buildScheduleParams(
    expenseSchedule: any,
    financingParams: any,
    accountId: string | undefined,
    userId: string | undefined,
    endDate: string | undefined,
  ): any {
    const scheduleType = expenseSchedule.scheduleType || SCHEDULE_TYPES.MONTHLY;
    const scheduleDays = expenseSchedule.scheduleDays || '1';
    const currency = expenseSchedule.paidInCurrency || financingParams.financingCurrency || null;

    return {
      accountId,
      userId,
      carId: financingParams.carId,
      kindId: FINANCING_LEASING_KIND_ID,
      scheduleType,
      scheduleDays,
      startAt: financingParams.startDate,
      endAt: endDate || null,
      whereDone: expenseSchedule.whereDone || financingParams.lenderName || null,
      costWork: expenseSchedule.costWork ?? 0,
      costParts: expenseSchedule.costParts ?? 0,
      tax: expenseSchedule.tax ?? 0,
      fees: expenseSchedule.fees ?? 0,
      subtotal: expenseSchedule.subtotal ?? expenseSchedule.totalPrice ?? 0,
      totalPrice: expenseSchedule.totalPrice ?? 0,
      paidInCurrency: currency,
      shortNote: expenseSchedule.shortNote || (
        financingParams.financingType === FINANCING_TYPES.LOAN ? 'Loan payment' : 'Lease payment'
      ),
      comments: expenseSchedule.comments || (
        financingParams.agreementNumber ? `Agreement #${financingParams.agreementNumber}` : null
      ),
      status: EXPENSE_SCHEDULE_STATUS.ACTIVE,
      createdBy: userId,
      createdAt: this.now(),
    };
  }

  /**
   * Create an expense schedule for recurring financing payments.
   * Returns the created schedule ID or null if payment info was not provided.
   */
  private async createLinkedExpenseSchedule(
    expenseSchedule: any,
    financingParams: any,
    financingId: string,
    accountId: string | undefined,
    userId: string | undefined,
    endDate: string | undefined,
  ): Promise<string | null> {
    if (!expenseSchedule) {
      return null;
    }

    const totalPrice = expenseSchedule.totalPrice ?? 0;
    if (totalPrice <= 0 && !expenseSchedule.costWork && !expenseSchedule.costParts) {
      return null;
    }

    const scheduleParams = this.buildScheduleParams(
      expenseSchedule,
      financingParams,
      accountId,
      userId,
      endDate,
    );

    // Calculate initial next_scheduled_at
    const startAtDate = new Date(financingParams.startDate);
    const endAtDate = endDate ? new Date(endDate) : null;
    const referenceDate = dayjs(startAtDate).subtract(1, 'day').toDate();

    const nextScheduledAt = this.getContext().cores.expenseScheduleCore.calculateNextScheduledAt(
      scheduleParams.scheduleType,
      scheduleParams.scheduleDays,
      startAtDate,
      endAtDate,
      referenceDate,
    );

    const result = await this.getGateways().expenseScheduleGw.create({
      ...scheduleParams,
      nextScheduledAt,
    });

    const scheduleId = Array.isArray(result) ? result[0]?.id : result?.id;

    if (scheduleId) {
      logger.debug(
        `[VehicleFinancingCore] Created expense schedule ${scheduleId} for financing ${financingId}`,
      );
    }

    return scheduleId || null;
  }

  /**
   * Update the linked expense schedule when financing terms change.
   */
  private async updateLinkedExpenseSchedule(
    existingFinancing: any,
    expenseSchedule: any | undefined,
    financingParams: any,
    userId: string | undefined,
    resolvedEndDate: string | undefined,
  ): Promise<void> {
    const { expenseScheduleId } = existingFinancing;

    if (!expenseScheduleId) {
      return;
    }

    const schedule = await this.getGateways().expenseScheduleGw.get(expenseScheduleId);

    if (!schedule) {
      logger.warn(
        `[VehicleFinancingCore] Linked expense schedule ${expenseScheduleId} not found for financing ${existingFinancing.id}`,
      );
      return;
    }

    const updateData: any = {
      updatedBy: userId,
      updatedAt: this.now(),
    };

    // If expenseSchedule input is provided, apply its fields to the schedule
    if (expenseSchedule) {
      if (expenseSchedule.scheduleType !== undefined) {
        updateData.scheduleType = expenseSchedule.scheduleType;
      }
      if (expenseSchedule.scheduleDays !== undefined) {
        updateData.scheduleDays = expenseSchedule.scheduleDays;
      }
      if (expenseSchedule.totalPrice !== undefined) {
        updateData.subtotal = expenseSchedule.totalPrice;
        updateData.totalPrice = expenseSchedule.totalPrice;
      }
      if (expenseSchedule.paidInCurrency !== undefined) {
        updateData.paidInCurrency = expenseSchedule.paidInCurrency;
      }
      if (expenseSchedule.costWork !== undefined) {
        updateData.costWork = expenseSchedule.costWork;
      }
      if (expenseSchedule.costParts !== undefined) {
        updateData.costParts = expenseSchedule.costParts;
      }
      if (expenseSchedule.tax !== undefined) {
        updateData.tax = expenseSchedule.tax;
      }
      if (expenseSchedule.fees !== undefined) {
        updateData.fees = expenseSchedule.fees;
      }
      if (expenseSchedule.subtotal !== undefined) {
        updateData.subtotal = expenseSchedule.subtotal;
      }
      if (expenseSchedule.shortNote !== undefined) {
        updateData.shortNote = expenseSchedule.shortNote;
      }
      if (expenseSchedule.whereDone !== undefined) {
        updateData.whereDone = expenseSchedule.whereDone;
      }
      if (expenseSchedule.comments !== undefined) {
        updateData.comments = expenseSchedule.comments;
      }
    }

    // Sync financing-level fields that affect the schedule
    if (financingParams.lenderName !== undefined && !expenseSchedule?.whereDone) {
      updateData.whereDone = financingParams.lenderName;
    }

    if (financingParams.financingCurrency !== undefined && !expenseSchedule?.paidInCurrency) {
      updateData.paidInCurrency = financingParams.financingCurrency;
    }

    if (financingParams.startDate !== undefined) {
      updateData.startAt = financingParams.startDate;
    }

    if (resolvedEndDate !== undefined) {
      updateData.endAt = resolvedEndDate;
    }

    // Update short note if financing type changed and no explicit shortNote in schedule input
    if (financingParams.financingType !== undefined && !expenseSchedule?.shortNote) {
      updateData.shortNote = financingParams.financingType === FINANCING_TYPES.LOAN ? 'Loan payment' : 'Lease payment';
    }

    // Update agreement number in comments if changed and no explicit comments in schedule input
    if (financingParams.agreementNumber !== undefined && !expenseSchedule?.comments) {
      updateData.comments = financingParams.agreementNumber ? `Agreement #${financingParams.agreementNumber}` : null;
    }

    // Update carId if vehicle changed
    if (financingParams.carId !== undefined) {
      updateData.carId = financingParams.carId;
    }

    // Recalculate next_scheduled_at if schedule config changed
    const scheduleTypeChanged = expenseSchedule?.scheduleType !== undefined;
    const scheduleDaysChanged = expenseSchedule?.scheduleDays !== undefined;
    const startDateChanged = financingParams.startDate !== undefined;
    const endDateChanged = resolvedEndDate !== undefined;

    if (scheduleTypeChanged || scheduleDaysChanged || startDateChanged || endDateChanged) {
      const scheduleType = expenseSchedule?.scheduleType ?? schedule.scheduleType;
      const scheduleDays = expenseSchedule?.scheduleDays ?? schedule.scheduleDays;
      const startAt = financingParams.startDate ? new Date(financingParams.startDate) : new Date(schedule.startAt);
      const endAt = resolvedEndDate !== undefined
        ? resolvedEndDate ? new Date(resolvedEndDate) : null
        : schedule.endAt ? new Date(schedule.endAt) : null;

      const referenceDate = schedule.lastAddedAt
        ? new Date(schedule.lastAddedAt)
        : dayjs(startAt).subtract(1, 'day').toDate();

      updateData.nextScheduledAt = this.getContext().cores.expenseScheduleCore.calculateNextScheduledAt(
        scheduleType,
        scheduleDays,
        startAt,
        endAt,
        referenceDate,
      );
    }

    await this.getGateways().expenseScheduleGw.update(
      { id: expenseScheduleId, accountId: existingFinancing.accountId },
      updateData,
    );

    logger.debug(
      `[VehicleFinancingCore] Updated expense schedule ${expenseScheduleId} for financing ${existingFinancing.id}`,
    );
  }

  /**
   * Disable the linked expense schedule when financing is removed or completed.
   */
  private async disableLinkedExpenseSchedule(
    expenseScheduleId: string,
    accountId: string | undefined,
    userId: string | undefined,
  ): Promise<void> {
    if (!expenseScheduleId) {
      return;
    }

    const schedule = await this.getGateways().expenseScheduleGw.get(expenseScheduleId);

    if (!schedule) {
      return;
    }

    await this.getGateways().expenseScheduleGw.update(
      { id: expenseScheduleId, accountId },
      {
        status: EXPENSE_SCHEDULE_STATUS.COMPLETED,
        updatedBy: userId,
        updatedAt: this.now(),
      },
    );

    logger.debug(
      `[VehicleFinancingCore] Disabled expense schedule ${expenseScheduleId}`,
    );
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
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create financing records');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to create financing for this vehicle');
    }

    // Extract nested expenseSchedule input (not stored on vehicle_financing table)
    const { expenseSchedule, ...financingParams } = params;

    // Auto-calculate endDate from startDate + termMonths if not explicitly provided
    const resolvedEndDate = this.resolveEndDate(financingParams);

    const newFinancing = {
      ...financingParams,
      endDate: resolvedEndDate,
      accountId,
      userId,
      status: params.status ?? VEHICLE_FINANCING_STATUS.ACTIVE,
      createdBy: userId,
      createdAt: this.now(),
    };

    // Store schedule input and resolved end date for afterCreate
    const requestId = this.getRequestId();
    this['_scheduleParams'] = this['_scheduleParams'] || new Map();
    this['_scheduleParams'].set(`create-${requestId}`, {
      expenseSchedule,
      financingParams: {
        carId: params.carId,
        financingType: params.financingType,
        financingCurrency: params.financingCurrency,
        lenderName: params.lenderName,
        agreementNumber: params.agreementNumber,
        startDate: params.startDate,
      },
      resolvedEndDate,
    });

    return newFinancing;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        continue;
      }

      // Create linked expense schedule if expenseSchedule input was provided
      const stored = this['_scheduleParams']?.get(`create-${requestId}`);

      if (stored?.expenseSchedule) {
        try {
          const scheduleId = await this.createLinkedExpenseSchedule(
            stored.expenseSchedule,
            stored.financingParams,
            item.id,
            accountId,
            userId,
            stored.resolvedEndDate,
          );

          if (scheduleId) {
            // Update the financing record with the schedule ID
            await this.getGateways().vehicleFinancingGw.update(
              { id: item.id, accountId },
              { expenseScheduleId: scheduleId },
            );
            item.expenseScheduleId = scheduleId;
          }
        } catch (error) {
          logger.error(
            `[VehicleFinancingCore] Failed to create expense schedule for financing ${item.id}:`,
            error,
          );
          // Don't fail the create — financing record is still valid without a schedule
        }
      }

      this['_scheduleParams']?.delete(`create-${requestId}`);
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

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update financing records');
    }

    // Check if financing record exists and user has access
    const financing = await this.getGateways().vehicleFinancingGw.get(id);

    if (!financing || financing.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle financing record not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: financing.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to update this financing record');
    }

    // Extract nested expenseSchedule input and system fields
    const { accountId: _, userId: __, expenseSchedule, ...restParams } = params;

    // Auto-calculate endDate from startDate + termMonths if not explicitly provided
    // Merge with existing values for calculation when only some fields are updated
    const mergedForEndDate = {
      startDate: restParams.startDate ?? financing.startDate,
      endDate: restParams.endDate,
      termMonths: restParams.termMonths ?? financing.termMonths,
    };
    const resolvedEndDate = this.resolveEndDate(mergedForEndDate);

    if (resolvedEndDate) {
      restParams.endDate = resolvedEndDate;
    }

    // Store existing financing, schedule input, and resolved end date for afterUpdate
    const requestId = this.getRequestId();
    this['_updateData'] = this['_updateData'] || new Map();
    this['_updateData'].set(`update-${requestId}-${id}`, {
      existingFinancing: financing,
      expenseSchedule,
      financingParams: restParams,
      resolvedEndDate,
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        continue;
      }

      const updateInfo = this['_updateData']?.get(`update-${requestId}-${item.id}`);

      if (updateInfo) {
        const { existingFinancing, expenseSchedule, financingParams, resolvedEndDate } = updateInfo;

        try {
          if (existingFinancing.expenseScheduleId) {
            // Existing schedule — update it with any changed fields
            await this.updateLinkedExpenseSchedule(
              existingFinancing,
              expenseSchedule,
              financingParams,
              userId,
              resolvedEndDate,
            );
          } else if (expenseSchedule) {
            // No schedule exists yet but expenseSchedule input was provided — create one
            const scheduleId = await this.createLinkedExpenseSchedule(
              expenseSchedule,
              { ...existingFinancing, ...financingParams },
              item.id,
              accountId,
              userId,
              resolvedEndDate ?? existingFinancing.endDate,
            );

            if (scheduleId) {
              await this.getGateways().vehicleFinancingGw.update(
                { id: item.id, accountId: existingFinancing.accountId },
                { expenseScheduleId: scheduleId },
              );
              item.expenseScheduleId = scheduleId;
            }
          }
        } catch (error) {
          logger.error(
            `[VehicleFinancingCore] Failed to update expense schedule for financing ${item.id}:`,
            error,
          );
        }

        this['_updateData'].delete(`update-${requestId}-${item.id}`);
      }
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, roleId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Financing record ID is required');
    }

    if (this.isDriverOrViewerRole()) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, {}, 'You do not have permission to remove financing records');
    }

    // Check if financing record exists and user has access
    const financing = await this.getGateways().vehicleFinancingGw.get(id);

    if (!financing || financing.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle financing record not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: financing.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to remove this financing record');
    }

    // Store for afterRemove to disable the schedule
    const requestId = this.getRequestId();
    this['_removeData'] = this['_removeData'] || new Map();
    this['_removeData'].set(`remove-${requestId}-${id}`, financing);

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        continue;
      }

      const financing = this['_removeData']?.get(`remove-${requestId}-${item.id}`);

      if (financing?.expenseScheduleId) {
        try {
          await this.disableLinkedExpenseSchedule(financing.expenseScheduleId, accountId, userId);
        } catch (error) {
          logger.error(
            `[VehicleFinancingCore] Failed to disable expense schedule for financing ${item.id}:`,
            error,
          );
        }
      }

      this['_removeData']?.delete(`remove-${requestId}-${item.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId, roleId } = this.getContext();

    if (this.isDriverOrViewerRole()) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, {}, 'You do not have permission to remove financing records');
    }

    const allowedWhere: any[] = [];
    const requestId = this.getRequestId();
    this['_removeData'] = this['_removeData'] || new Map();

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const financing = await this.getGateways().vehicleFinancingGw.get(id);

      if (!financing || financing.accountId !== accountId) {
        continue;
      }

      const hasAccess = await this.validateCarAccess({ id: financing.carId, accountId });

      if (hasAccess) {
        allowedWhere.push({ ...item, accountId });
        this['_removeData'].set(`remove-${requestId}-${id}`, financing);
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        continue;
      }

      const financing = this['_removeData']?.get(`remove-${requestId}-${item.id}`);

      if (financing?.expenseScheduleId) {
        try {
          await this.disableLinkedExpenseSchedule(financing.expenseScheduleId, accountId, userId);
        } catch (error) {
          logger.error(
            `[VehicleFinancingCore] Failed to disable expense schedule for financing ${item.id}:`,
            error,
          );
        }
      }

      this['_removeData']?.delete(`remove-${requestId}-${item.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { VehicleFinancingCore };