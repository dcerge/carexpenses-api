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
import {
  computeFinancingCostBreakdown,
  estimateMonthlyPayment,
} from '../utils/financingCalculations';

dayjs.extend(utc);

// Expense kind ID for financing/leasing payments (from seed data)
const FINANCING_LEASING_KIND_ID = 309;

// Mileage pace tolerance: ±5% around linear allowance schedule
const MILEAGE_PACE_TOLERANCE = 0.05;

// Kilometers per mile conversion factor
const KM_PER_MILE = 1.609344;

/** Mileage pace status values */
const MILEAGE_PACE = {
  UNDER: 'under_pace',
  ON: 'on_pace',
  OVER: 'over_pace',
} as const;

/** Raw odometer stats from the aggregate query */
interface OdometerStats {
  carId: string;
  firstOdometer: number;       // km (metric)
  latestOdometer: number;      // km (metric)
  firstReadingDate: string;
  latestReadingDate: string;
  dataPoints: number;
}

/** Data stored between beforeCreate and afterCreate */
interface CreateStageData {
  expenseSchedule: any;
  financingParams: {
    carId: string;
    financingType: string;
    financingCurrency: string | null;
    lenderName: string | null;
    agreementNumber: string | null;
    startDate: string;
  };
  resolvedEndDate: string | undefined;
}

/** Data stored between beforeUpdate and afterUpdate */
interface UpdateStageData {
  existingFinancing: any;
  expenseSchedule: any | undefined;
  financingParams: any;
  resolvedEndDate: string | undefined;
}

class VehicleFinancingCore extends AppCore {
  private createStageData: Map<string, CreateStageData> = new Map();
  private updateStageData: Map<string, UpdateStageData> = new Map();
  private removeStageData: Map<string, any> = new Map();

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

    // Compute cost breakdown and estimated monthly payment
    this.computeCostFields(item);

    // Compute mileage tracking fields (lease only)
    this.computeMileageFields(item);

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
  // Cost Breakdown & Estimated Payment (computed from financing terms + schedule)
  // ===========================================================================

  /**
   * Compute cost breakdown and estimated monthly payment fields on a financing item.
   *
   * Reads the `_linkedSchedule` property (attached by afterList/afterGet/afterGetMany)
   * for actual payment data. If not present, falls back to formula-only calculation.
   */
  private computeCostFields(item: any): void {
    const isLease = item.financingType === FINANCING_TYPES.LEASE;
    const totalAmount = parseFloat(item.totalAmount) || 0;
    const downPayment = parseFloat(item.downPayment) || 0;
    const termMonths = item.termMonths || 0;
    const interestRate = item.interestRate != null ? parseFloat(item.interestRate) : null;
    const residualValue = item.residualValue != null ? parseFloat(item.residualValue) : null;

    // Linked schedule data (attached by batch-fetch in after* hooks)
    const schedule = item._linkedSchedule || null;
    const actualMonthlyPayment = schedule?.totalPrice != null
      ? parseFloat(schedule.totalPrice)
      : null;
    const scheduleType = schedule?.scheduleType || null;

    // Cost breakdown
    const breakdown = computeFinancingCostBreakdown({
      isLease,
      totalAmount,
      downPayment,
      termMonths,
      interestRate,
      residualValue,
      actualMonthlyPayment: actualMonthlyPayment && actualMonthlyPayment > 0
        ? actualMonthlyPayment
        : null,
      scheduleType,
    });

    if (breakdown) {
      item.costPrincipal = breakdown.principal;
      item.costTotalInterest = breakdown.totalInterest;
      item.costTotal = breakdown.totalCost;
      item.costInterestPercent = breakdown.interestPercent;
      item.costDownPaymentBarPercent = breakdown.downPaymentBarPercent;
      item.costPrincipalBarPercent = breakdown.principalBarPercent;
      item.costInterestBarPercent = breakdown.interestBarPercent;
    } else {
      item.costPrincipal = null;
      item.costTotalInterest = null;
      item.costTotal = null;
      item.costInterestPercent = null;
      item.costDownPaymentBarPercent = null;
      item.costPrincipalBarPercent = null;
      item.costInterestBarPercent = null;
    }

    // Estimated monthly payment (formula-based, independent of schedule)
    item.estimatedMonthlyPayment = estimateMonthlyPayment({
      isLease,
      totalAmount,
      downPayment,
      interestRate: interestRate ?? 0,
      termMonths,
      residualValue: residualValue ?? 0,
    }) ?? null;

    // Clean up internal property — not a GraphQL field
    delete item._linkedSchedule;
  }

  // ===========================================================================
  // Mileage Tracking (lease only, derived from odometer data)
  // ===========================================================================

  /**
   * Compute mileage tracking fields for a lease financing item.
   *
   * Reads `_odometerStats` (attached by afterList/afterGet/afterGetMany)
   * containing aggregate odometer data from expense_bases.
   *
   * All distance calculations use the financing record's mileageAllowanceUnit
   * for consistency — "you drove X mi of your Y mi allowance".
   */
  private computeMileageFields(item: any): void {
    // Initialize all fields to null
    item.mileageDriven = null;
    item.mileageUsedPercent = null;
    item.annualMileageRate = null;
    item.projectedTotalMileage = null;
    item.projectedOverage = null;
    item.projectedOverageCost = null;
    item.mileagePaceStatus = null;
    item.mileageDataPoints = null;

    // Only applicable for leases with mileage allowance
    if (item.financingType !== FINANCING_TYPES.LEASE) {
      delete item._odometerStats;
      return;
    }

    const stats: OdometerStats | null = item._odometerStats || null;
    delete item._odometerStats;

    if (!stats || stats.dataPoints < 1) {
      return;
    }

    item.mileageDataPoints = stats.dataPoints;

    const allowanceUnit = item.mileageAllowanceUnit || 'km';
    const conversionFactor = allowanceUnit === 'mi' ? (1 / KM_PER_MILE) : 1;

    // Mileage driven (convert from metric km to allowance unit)
    const drivenKm = stats.latestOdometer - stats.firstOdometer;
    if (drivenKm <= 0) {
      return;
    }

    const mileageDriven = drivenKm * conversionFactor;
    item.mileageDriven = Math.round(mileageDriven * 100) / 100;

    // Mileage used percent (requires totalMileageAllowance)
    const totalAllowance = item.totalMileageAllowance;
    if (totalAllowance && totalAllowance > 0) {
      item.mileageUsedPercent = Math.round((mileageDriven / totalAllowance) * 10000) / 100;
    }

    // Projections require at least 2 data points and elapsed time
    if (stats.dataPoints < 2) {
      return;
    }

    const firstDate = dayjs(stats.firstReadingDate).utc();
    const latestDate = dayjs(stats.latestReadingDate).utc();
    const elapsedDays = latestDate.diff(firstDate, 'day');

    if (elapsedDays <= 0) {
      return;
    }

    // Annual mileage rate
    const dailyRate = mileageDriven / elapsedDays;
    const annualRate = dailyRate * 365.25;
    item.annualMileageRate = Math.round(annualRate);

    // Projected total mileage at end of term
    const termMonths = item.termMonths;
    if (termMonths && termMonths > 0) {
      const startDate = item.startDate ? dayjs(item.startDate).utc() : firstDate;
      const endDate = item.endDate
        ? dayjs(item.endDate).utc()
        : startDate.add(termMonths, 'month');

      const totalTermDays = endDate.diff(startDate, 'day');
      if (totalTermDays > 0) {
        const projectedTotal = dailyRate * totalTermDays;
        item.projectedTotalMileage = Math.round(projectedTotal);

        // Projected overage
        if (totalAllowance && totalAllowance > 0) {
          const overage = projectedTotal - totalAllowance;
          item.projectedOverage = overage > 0 ? Math.round(overage) : 0;

          // Projected overage cost
          const overageCostRate = item.mileageOverageCost != null
            ? parseFloat(item.mileageOverageCost)
            : 0;
          if (item.projectedOverage > 0 && overageCostRate > 0) {
            item.projectedOverageCost = Math.round(item.projectedOverage * overageCostRate * 100) / 100;
          }

          // Mileage pace status
          // Compare actual driven vs expected linear pace at this point in time
          const now = dayjs().utc();
          const elapsedTermDays = Math.max(0, now.diff(startDate, 'day'));
          const termProgress = elapsedTermDays / totalTermDays;
          const expectedAtThisPoint = totalAllowance * termProgress;

          if (expectedAtThisPoint > 0) {
            const ratio = mileageDriven / expectedAtThisPoint;
            if (ratio < (1 - MILEAGE_PACE_TOLERANCE)) {
              item.mileagePaceStatus = MILEAGE_PACE.UNDER;
            } else if (ratio > (1 + MILEAGE_PACE_TOLERANCE)) {
              item.mileagePaceStatus = MILEAGE_PACE.OVER;
            } else {
              item.mileagePaceStatus = MILEAGE_PACE.ON;
            }
          }
        }
      }
    }
  }

  // ===========================================================================
  // Odometer Stats Fetching
  // ===========================================================================

  /**
   * Batch-fetch odometer statistics from expense_bases for multiple cars.
   * Delegates to expenseBaseGw.getOdometerStatsByCarIds() for the aggregate query.
   *
   * Only fetches for lease financing items that have mileageAllowance configured.
   * Attaches results as `_odometerStats` on each item for use by computeMileageFields.
   */
  private async attachOdometerStats(items: any[]): Promise<void> {
    // Collect lease items that need odometer data
    const leaseItems = items.filter(
      (item) =>
        item.financingType === FINANCING_TYPES.LEASE &&
        item.mileageAllowance &&
        item.carId &&
        item.startDate
    );

    if (leaseItems.length === 0) {
      this.logger.debug('No lease items with mileage allowance found, skipping odometer stats fetch');
      for (const item of items) {
        item._odometerStats = null;
      }
      return;
    }

    // Build car-specific filters: each lease may have a different startDate
    // Group by carId — if multiple leases for same car, use earliest startDate
    const carStartDates = new Map<string, string>();
    for (const item of leaseItems) {
      const existing = carStartDates.get(item.carId);
      if (!existing || dayjs(item.startDate).isBefore(dayjs(existing))) {
        carStartDates.set(item.carId, item.startDate);
      }
    }

    const { accountId } = this.getContext();

    this.logger.debug(
      `Fetching odometer stats for ${carStartDates.size} car(s) in account ${accountId}`,
    );

    try {
      const rows = await this.getGateways().expenseBaseGw.getOdometerStatsByCarIds({
        accountId,
        carStartDates,
      });

      // Build lookup map
      const statsMap = new Map<string, OdometerStats>();
      for (const row of rows) {
        statsMap.set(row.carId, row);
      }

      this.logger.debug(
        `Received odometer stats for ${statsMap.size} car(s)`,
      );

      // Attach to items
      for (const item of items) {
        item._odometerStats = statsMap.get(item.carId) || null;
      }
    } catch (error) {
      this.logger.error('Failed to fetch odometer stats for lease mileage tracking', error);
      // Graceful degradation — mileage fields will be null
      for (const item of items) {
        item._odometerStats = null;
      }
    }
  }

  /**
   * Fetch odometer statistics for a single financing item.
   * Used by afterGet where we have a single item.
   */
  private async attachOdometerStat(item: any): Promise<void> {
    // Wrap in array and reuse batch method (single-element array is fine)
    await this.attachOdometerStats([item]);
  }

  // ===========================================================================
  // Expense Schedule Batch Fetching
  // ===========================================================================

  /**
   * Batch-fetch linked expense schedules for an array of financing items
   * and attach them as `_linkedSchedule` for use by processItemOnOut.
   *
   * Prevents N+1 queries when computing cost breakdown fields.
   */
  private async attachLinkedSchedules(items: any[]): Promise<void> {
    const scheduleIds = items
      .map((item) => item.expenseScheduleId)
      .filter(Boolean);

    if (scheduleIds.length === 0) {
      this.logger.debug('None of the financing records have a linked expense schedule, skipping batch fetch');
      for (const item of items) {
        item._linkedSchedule = null;
      }
      return;
    }

    // Deduplicate IDs
    const uniqueIds = [...new Set(scheduleIds)];

    this.logger.debug(
      `Fetching ${uniqueIds.length} linked expense schedule(s) for cost breakdown computation`,
    );

    try {
      const schedules = await this.getGateways().expenseScheduleGw.getMany(uniqueIds);
      const schedulesMap: Record<string, any> = {};

      if (Array.isArray(schedules)) {
        for (const schedule of schedules) {
          if (schedule?.id) {
            schedulesMap[schedule.id] = schedule;
          }
        }
      }

      this.logger.debug(
        `Successfully resolved ${Object.keys(schedulesMap).length} expense schedule(s) from the database`,
      );

      for (const item of items) {
        item._linkedSchedule = item.expenseScheduleId
          ? schedulesMap[item.expenseScheduleId] || null
          : null;
      }
    } catch (error) {
      this.logger.error('Failed to batch-fetch linked expense schedules, falling back to formula-only cost breakdown', error);
      // Graceful degradation — cost breakdown will use formula-only
      for (const item of items) {
        item._linkedSchedule = null;
      }
    }
  }

  /**
   * Fetch a single linked expense schedule for one financing item.
   * Used by afterGet where we have a single item.
   */
  private async attachLinkedSchedule(item: any): Promise<void> {
    if (!item.expenseScheduleId) {
      this.logger.debug(
        `Financing ${item.id} does not have a linked expense schedule, skipping schedule fetch`,
      );
      item._linkedSchedule = null;
      return;
    }

    this.logger.debug(
      `Fetching expense schedule ${item.expenseScheduleId} linked to financing ${item.id}`,
    );

    try {
      const schedule = await this.getGateways().expenseScheduleGw.get(item.expenseScheduleId);
      item._linkedSchedule = schedule || null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch expense schedule ${item.expenseScheduleId} for financing ${item.id}`,
        error,
      );
      item._linkedSchedule = null;
    }
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
      const computed = dayjs(params.startDate).add(params.termMonths, 'month').utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      this.logger.debug(
        `Computed end date ${computed} from start date ${params.startDate} plus ${params.termMonths} month(s)`,
      );
      return computed;
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
      this.logger.debug(
        `No expense schedule input provided for financing ${financingId}, skipping schedule creation`,
      );
      return null;
    }

    const totalPrice = expenseSchedule.totalPrice ?? 0;
    if (totalPrice <= 0 && !expenseSchedule.costWork && !expenseSchedule.costParts) {
      this.logger.log(
        `Skipping expense schedule creation for financing ${financingId} because no payment amounts were provided`,
      );
      return null;
    }

    this.logger.debug(
      `Building expense schedule for financing ${financingId} with total price ${totalPrice}`,
    );

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
      this.logger.debug(
        `Expense schedule ${scheduleId} was created and linked to financing ${financingId}`,
      );
    } else {
      this.logger.log(
        `Expense schedule gateway did not return an ID after creating schedule for financing ${financingId}`,
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
      this.logger.debug(
        `Financing ${existingFinancing.id} does not have a linked expense schedule, nothing to update`,
      );
      return;
    }

    const schedule = await this.getGateways().expenseScheduleGw.get(expenseScheduleId);

    if (!schedule) {
      this.logger.log(
        `Linked expense schedule ${expenseScheduleId} was not found for financing ${existingFinancing.id}, cannot update`,
      );
      return;
    }

    this.logger.debug(
      `Updating expense schedule ${expenseScheduleId} to reflect changes in financing ${existingFinancing.id}`,
    );

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

      this.logger.debug(
        `Recalculated next scheduled payment date for expense schedule ${expenseScheduleId}`,
      );
    }

    await this.getGateways().expenseScheduleGw.update(
      { id: expenseScheduleId, accountId: existingFinancing.accountId },
      updateData,
    );

    this.logger.debug(
      `Successfully updated expense schedule ${expenseScheduleId} with new financing terms`,
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
      this.logger.debug('No expense schedule ID was provided, nothing to disable');
      return;
    }

    const schedule = await this.getGateways().expenseScheduleGw.get(expenseScheduleId);

    if (!schedule) {
      this.logger.log(
        `Expense schedule ${expenseScheduleId} was not found in the database, nothing to disable`,
      );
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

    this.logger.debug(
      `Marked expense schedule ${expenseScheduleId} as completed after financing removal`,
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
    if (!Array.isArray(items) || items.length === 0) {
      this.logger.debug('No financing records were returned from the list query, skipping enrichment');
      return items;
    }

    this.logger.debug(`Enriching ${items.length} financing record(s) with schedules and odometer data`);

    // Batch-fetch linked expense schedules to avoid N+1
    await this.attachLinkedSchedules(items);

    // Batch-fetch odometer stats for lease mileage tracking
    await this.attachOdometerStats(items);

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      this.logger.debug('Financing record was not found, returning null');
      return item;
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: item.carId, accountId: item.accountId });

    if (!hasAccess) {
      this.logger.log(
        `User does not have access to vehicle ${item.carId} referenced by financing ${item.id}`,
      );
      return null;
    }

    this.logger.debug(`Enriching financing record ${item.id} with schedule and odometer data`);

    // Fetch linked expense schedule for cost breakdown
    await this.attachLinkedSchedule(item);

    // Fetch odometer stats for lease mileage tracking
    await this.attachOdometerStat(item);

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      this.logger.debug('No financing records were returned from the getMany query, skipping enrichment');
      return items;
    }

    const { accountId } = this.getContext();

    // Filter to only items in this account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    if (filteredItems.length < items.length) {
      this.logger.debug(
        `Excluded ${items.length - filteredItems.length} financing record(s) that belong to other accounts`,
      );
    }

    // Get accessible car IDs
    const carIds = [...new Set(filteredItems.map((item) => item.carId))];
    const accessibleCarIds = await this.filterAccessibleCarIds(carIds);
    const accessibleSet = new Set(accessibleCarIds);

    // Filter to only accessible cars
    const accessibleItems = filteredItems.filter((item) => accessibleSet.has(item.carId));

    if (accessibleItems.length < filteredItems.length) {
      this.logger.debug(
        `Excluded ${filteredItems.length - accessibleItems.length} financing record(s) for vehicles the user cannot access`,
      );
    }

    this.logger.debug(`Enriching ${accessibleItems.length} accessible financing record(s) with schedules and odometer data`);

    // Batch-fetch linked expense schedules to avoid N+1
    await this.attachLinkedSchedules(accessibleItems);

    // Batch-fetch odometer stats for lease mileage tracking
    await this.attachOdometerStats(accessibleItems);

    return accessibleItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with VIEWER role is not allowed to create financing records`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create financing records');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${params.carId}, cannot create financing record`,
      );
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
    const stageKey = `create-${requestId}`;

    this.createStageData.set(stageKey, {
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

    this.logger.debug(
      `Vehicle financing data prepared for creation: carId=${params.carId}, type=${params.financingType}, stageKey=${stageKey}`,
    );

    return newFinancing;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();
    const stageKey = `create-${requestId}`;
    const stored = this.createStageData.get(stageKey);

    for (const item of items) {
      if (!item.id) {
        this.logger.log('Created financing item has no ID, skipping expense schedule creation');
        continue;
      }

      // Create linked expense schedule if expenseSchedule input was provided
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

            this.logger.debug(
              `Linked expense schedule ${scheduleId} to newly created financing ${item.id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to create expense schedule for newly created financing ${item.id}`,
            error,
          );
          // Don't fail the create — financing record is still valid without a schedule
        }
      }
    }

    // Clean up stage data
    this.createStageData.delete(stageKey);

    // Attach schedules for cost breakdown computation in processItemOnOut
    await this.attachLinkedSchedules(items);

    // Attach odometer stats for lease mileage tracking
    await this.attachOdometerStats(items);

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
      this.logger.log(`User ${userId} with VIEWER role is not allowed to update financing records`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update financing records');
    }

    // Check if financing record exists and user has access
    const financing = await this.getGateways().vehicleFinancingGw.get(id);

    if (!financing || financing.accountId !== accountId) {
      this.logger.log(
        `Financing record ${id} was not found or does not belong to account ${accountId}`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle financing record not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: financing.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${financing.carId} referenced by financing ${id}`,
      );
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
    const stageKey = `update-${requestId}-${id}`;

    this.updateStageData.set(stageKey, {
      existingFinancing: financing,
      expenseSchedule,
      financingParams: restParams,
      resolvedEndDate,
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(
      `Vehicle financing ${id} update data prepared with stageKey=${stageKey}`,
    );

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        this.logger.log('Updated financing item has no ID, skipping expense schedule sync');
        continue;
      }

      const stageKey = `update-${requestId}-${item.id}`;
      const updateInfo = this.updateStageData.get(stageKey);

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
            this.logger.debug(
              `Financing ${item.id} had no expense schedule before, creating one now`,
            );

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

              this.logger.debug(
                `Linked newly created expense schedule ${scheduleId} to financing ${item.id}`,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to sync expense schedule while updating financing ${item.id}`,
            error,
          );
        }

        // Clean up stage data
        this.updateStageData.delete(stageKey);
      } else {
        this.logger.debug(
          `No staged update data found for financing ${item.id} with stageKey=${stageKey}`,
        );
      }
    }

    // Attach schedules for cost breakdown computation in processItemOnOut
    await this.attachLinkedSchedules(items);

    // Attach odometer stats for lease mileage tracking
    await this.attachOdometerStats(items);

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, userId, roleId } = this.getContext();

    if (!id) {
      this.logger.log('Cannot remove financing record because no ID was provided in the request');
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Financing record ID is required');
    }

    if (this.isDriverOrViewerRole()) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to remove financing records`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, {}, 'You do not have permission to remove financing records');
    }

    // Check if financing record exists and user has access
    const financing = await this.getGateways().vehicleFinancingGw.get(id);

    if (!financing || financing.accountId !== accountId) {
      this.logger.log(
        `Financing record ${id} was not found or does not belong to account ${accountId}, cannot remove`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle financing record not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: financing.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${financing.carId} referenced by financing ${id}, cannot remove`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to remove this financing record');
    }

    // Store for afterRemove to disable the schedule
    const requestId = this.getRequestId();
    const stageKey = `remove-${requestId}-${id}`;

    this.removeStageData.set(stageKey, financing);

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(`Financing record ${id} is ready for removal with stageKey=${stageKey}`);

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        this.logger.log('Removed financing item has no ID, skipping expense schedule disable');
        continue;
      }

      const stageKey = `remove-${requestId}-${item.id}`;
      const financing = this.removeStageData.get(stageKey);

      if (financing?.expenseScheduleId) {
        try {
          await this.disableLinkedExpenseSchedule(financing.expenseScheduleId, accountId, userId);
        } catch (error) {
          this.logger.error(
            `Failed to disable expense schedule ${financing.expenseScheduleId} after removing financing ${item.id}`,
            error,
          );
        }
      }

      // Clean up stage data
      this.removeStageData.delete(stageKey);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId, userId, roleId } = this.getContext();

    if (this.isDriverOrViewerRole()) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to remove financing records in bulk`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, {}, 'You do not have permission to remove financing records');
    }

    const allowedWhere: any[] = [];
    const requestId = this.getRequestId();

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        this.logger.debug('Skipping a bulk removal item that has no ID');
        continue;
      }

      const financing = await this.getGateways().vehicleFinancingGw.get(id);

      if (!financing || financing.accountId !== accountId) {
        this.logger.debug(
          `Financing record ${id} was not found or belongs to another account, skipping bulk removal`,
        );
        continue;
      }

      const hasAccess = await this.validateCarAccess({ id: financing.carId, accountId });

      if (hasAccess) {
        const stageKey = `remove-${requestId}-${id}`;
        allowedWhere.push({ ...item, accountId });
        this.removeStageData.set(stageKey, financing);
      } else {
        this.logger.debug(
          `User does not have access to vehicle ${financing.carId} for financing ${id}, skipping bulk removal`,
        );
      }
    }

    this.logger.debug(
      `Bulk removal approved for ${allowedWhere.length} out of ${where.length} financing record(s)`,
    );

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        this.logger.log('A bulk-removed financing item has no ID, skipping expense schedule disable');
        continue;
      }

      const stageKey = `remove-${requestId}-${item.id}`;
      const financing = this.removeStageData.get(stageKey);

      if (financing?.expenseScheduleId) {
        try {
          await this.disableLinkedExpenseSchedule(financing.expenseScheduleId, accountId, userId);
        } catch (error) {
          this.logger.error(
            `Failed to disable expense schedule ${financing.expenseScheduleId} after bulk removing financing ${item.id}`,
            error,
          );
        }
      }

      // Clean up stage data
      this.removeStageData.delete(stageKey);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { VehicleFinancingCore };