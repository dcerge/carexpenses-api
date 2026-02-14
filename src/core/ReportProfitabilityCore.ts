// ./src/core/ReportProfitabilityCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { ReportBaseCore } from './ReportBaseCore';
import { validators } from './validators/reportProfitabilityValidators';
import { fromMetricDistanceRounded } from '../utils';

import {
  ProfitabilityReportRawData,
  ProfitabilityVehicleRaw,
  ProfitabilityMonthlyRaw,
  RevenueCategoryBreakdownRaw,
  RevenueKindBreakdownRaw,
  CategoryBreakdownRaw,
  KindBreakdownRaw,
  CurrencyAmountRaw,
  TripProfitabilityRaw,
  CarOdometerRangeRaw,
  UserProfile,
  VehicleProfitability,
  ProfitabilityMonthlyTrend,
  TripProfitability,
  TripProfitabilityTotals,
  RevenueCategoryBreakdown,
  RevenueKindBreakdown,
  BreakEvenAnalysis,
  ProfitabilityReport,
} from '../boundary';

dayjs.extend(utc);

// =============================================================================
// Core Class
// =============================================================================

class ReportProfitabilityCore extends ReportBaseCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'reportProfitabilityGw',
      name: 'ReportProfitability',
      hasOrderNo: false,
      doAuth: true,
    });
  }

  public getValidators(): any {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  // ===========================================================================
  // Main Report Entry Point
  // ===========================================================================

  /**
   * Generate Profitability Report
   */
  public async buildReport(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().profitabilityReport,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { filter } = args || {};
        const { carId, tagId, dateFrom, dateTo } = filter || {};
        const { accountId } = this.getContext();

        // 1. Get user preferences
        const userProfile = await this.getCurrentUserProfile();

        // 2. Resolve car IDs (all if not specified)
        let carIds: string[] = [];
        if (carId && carId.length > 0) {
          carIds = carId;
        } else {
          const cars = await this.getGateways().carGw.list({ filter: { accountId } });
          carIds = (cars || []).map((c: any) => c.id);
        }

        // 3. Handle case when user has no cars
        if (carIds.length === 0) {
          return this.success(this.buildEmptyReport(dateFrom, dateTo, userProfile));
        }

        // 4. Fetch raw data from gateway
        const rawData: ProfitabilityReportRawData = await this.getGateways().reportProfitabilityGw.getData({
          accountId,
          carIds,
          tagIds: tagId || [],
          dateFrom,
          dateTo,
        });

        // 5. Build and return the report
        const report = this.buildProfitabilityReport(rawData, dateFrom, dateTo, userProfile);

        return this.success(report);
      },
      hasTransaction: false,
      doingWhat: 'generating profitability report',
    });
  }

  // ===========================================================================
  // Report Builder
  // ===========================================================================

  /**
   * Build the complete profitability report from raw data
   */
  private buildProfitabilityReport(
    rawData: ProfitabilityReportRawData,
    dateFrom: string,
    dateTo: string,
    userProfile: UserProfile,
  ): ProfitabilityReport {
    const { distanceIn, volumeIn, homeCurrency } = userProfile;

    const periodDays = this.calculatePeriodDays(dateFrom, dateTo);

    // --- Aggregate totals from per-vehicle data ---
    const totals = this.aggregateVehicleTotals(rawData.vehicleProfitability);

    // --- Total distance from odometer ranges ---
    const totalDistanceKm = this.calculateTotalDistanceFromOdometers(rawData.carOdometerRanges);
    const totalDistance = fromMetricDistanceRounded(totalDistanceKm, distanceIn);

    // --- Summary KPIs ---
    const netProfitHc = totals.totalRevenueHc - totals.totalExpensesHc;
    const profitMarginPct = totals.totalRevenueHc > 0
      ? this.roundToTwoDecimals((netProfitHc / totals.totalRevenueHc) * 100)
      : null;
    const profitPerDistance = this.safePerDistance(netProfitHc, totalDistance);

    // --- Daily averages ---
    const avgDailyRevenueHc = this.roundToTwoDecimals(this.safeDivide(totals.totalRevenueHc, periodDays));
    const avgDailyExpensesHc = this.roundToTwoDecimals(this.safeDivide(totals.totalExpensesHc, periodDays));
    const avgDailyNetProfitHc = this.roundToTwoDecimals(this.safeDivide(netProfitHc, periodDays));

    // --- Foreign currency ---
    const foreignRevenueTotals = this.transformCurrencyAmounts(rawData.foreignRevenueTotals);
    const foreignExpenseTotals = this.transformCurrencyAmounts(rawData.foreignExpenseTotals);

    // --- Revenue breakdowns ---
    const revenueByCategory = this.buildRevenueCategoryBreakdown(
      rawData.revenueByCategory,
      totals.totalRevenueHc,
    );
    const revenueByKind = this.buildRevenueKindBreakdown(
      rawData.revenueByKind,
      totals.totalRevenueHc,
    );

    // --- Expense breakdowns ---
    const expensesByCategory = this.transformCategoryBreakdown(
      rawData.expensesByCategory,
      totals.totalExpensesHc,
    );
    const expensesByKind = this.transformKindBreakdown(
      rawData.expensesByKind,
      totals.totalExpensesHc,
    );

    // --- Per-vehicle ---
    const byVehicle = this.buildVehicleProfitability(
      rawData.vehicleProfitability,
      rawData.carOdometerRanges,
      distanceIn,
    );

    // --- Monthly trend ---
    const monthlyTrend = this.buildMonthlyTrend(rawData.monthlyTrend, distanceIn);

    // --- Per-trip profitability ---
    const profitableTrips = this.buildTripProfitability(rawData.tripsWithRevenue, userProfile);
    const profitableTripsTotals = this.buildTripProfitabilityTotals(profitableTrips);

    // --- Break-even ---
    const breakEven = this.buildBreakEven(
      totals.totalRevenueHc,
      totals.totalExpensesHc,
      periodDays,
      rawData.monthlyTrend,
    );

    return {
      dateFrom,
      dateTo,
      periodDays,

      // Summary KPIs
      totalRevenueHc: this.roundToTwoDecimals(totals.totalRevenueHc),
      totalRevenueCount: totals.totalRevenueCount,
      totalRefuelsCostHc: this.roundToTwoDecimals(totals.totalRefuelsCostHc),
      totalMaintenanceCostHc: this.roundToTwoDecimals(totals.totalMaintenanceCostHc),
      totalOtherExpensesCostHc: this.roundToTwoDecimals(totals.totalOtherExpensesCostHc),
      totalExpensesHc: this.roundToTwoDecimals(totals.totalExpensesHc),
      totalExpensesCount: totals.totalExpensesCount,
      netProfitHc: this.roundToTwoDecimals(netProfitHc),
      profitMarginPct,
      avgDailyRevenueHc,
      avgDailyExpensesHc,
      avgDailyNetProfitHc,
      totalDistance,
      profitPerDistance: profitPerDistance != null ? this.roundToTwoDecimals(profitPerDistance) : null,

      // Foreign currency
      foreignRevenueTotals,
      foreignExpenseTotals,
      totalForeignRevenueRecordsCount: this.sumRecordsCount(rawData.foreignRevenueTotals),
      totalForeignExpenseRecordsCount: this.sumRecordsCount(rawData.foreignExpenseTotals),

      // Breakdowns
      revenueByCategory,
      revenueByKind,
      expensesByCategory,
      expensesByKind,

      // Per-vehicle
      byVehicle,

      // Monthly trend
      monthlyTrend,

      // Per-trip
      profitableTrips,
      profitableTripsTotals,

      // Break-even
      breakEven,

      // User preferences
      distanceUnit: distanceIn,
      volumeUnit: volumeIn,
      homeCurrency,
      vehiclesCount: rawData.carIds.length,
    };
  }

  // ===========================================================================
  // Aggregation
  // ===========================================================================

  /**
   * Aggregate totals from per-vehicle raw data
   */
  private aggregateVehicleTotals(vehicles: ProfitabilityVehicleRaw[]): {
    totalRevenueHc: number;
    totalRevenueCount: number;
    totalRefuelsCostHc: number;
    totalMaintenanceCostHc: number;
    totalOtherExpensesCostHc: number;
    totalExpensesHc: number;
    totalExpensesCount: number;
  } {
    let totalRevenueHc = 0;
    let totalRevenueCount = 0;
    let totalRefuelsCostHc = 0;
    let totalMaintenanceCostHc = 0;
    let totalOtherExpensesCostHc = 0;
    let totalExpensesCount = 0;

    for (const v of vehicles) {
      totalRevenueHc += v.revenueHc;
      totalRevenueCount += v.revenueCount;
      totalRefuelsCostHc += v.refuelsCostHc;
      totalMaintenanceCostHc += v.maintenanceCostHc;
      totalOtherExpensesCostHc += v.otherExpensesCostHc;
      totalExpensesCount += v.refuelsCount + v.maintenanceCount + v.otherExpensesCount;
    }

    const totalExpensesHc = totalRefuelsCostHc + totalMaintenanceCostHc + totalOtherExpensesCostHc;

    return {
      totalRevenueHc,
      totalRevenueCount,
      totalRefuelsCostHc,
      totalMaintenanceCostHc,
      totalOtherExpensesCostHc,
      totalExpensesHc,
      totalExpensesCount,
    };
  }

  // ===========================================================================
  // Per-Vehicle Profitability
  // ===========================================================================

  /**
   * Build per-vehicle profitability with distance metrics
   */
  private buildVehicleProfitability(
    vehicles: ProfitabilityVehicleRaw[],
    odometerRanges: CarOdometerRangeRaw[],
    distanceIn: string,
  ): VehicleProfitability[] {
    // Build odometer lookup by carId
    const odometerMap = new Map<string, CarOdometerRangeRaw>();
    for (const range of odometerRanges) {
      odometerMap.set(range.carId, range);
    }

    return vehicles.map((v) => {
      const totalExpensesHc = v.refuelsCostHc + v.maintenanceCostHc + v.otherExpensesCostHc;
      const expensesCount = v.refuelsCount + v.maintenanceCount + v.otherExpensesCount;
      const netProfitHc = v.revenueHc - totalExpensesHc;
      const profitMarginPct = v.revenueHc > 0
        ? this.roundToTwoDecimals((netProfitHc / v.revenueHc) * 100)
        : null;

      // Distance for this car
      const range = odometerMap.get(v.carId);
      const distanceKm = range && range.minOdometerKm != null && range.maxOdometerKm != null
        ? range.maxOdometerKm - range.minOdometerKm
        : null;
      const distance = distanceKm != null ? fromMetricDistanceRounded(distanceKm, distanceIn) : null;

      return {
        carId: v.carId,
        revenueHc: this.roundToTwoDecimals(v.revenueHc),
        revenueCount: v.revenueCount,
        refuelsCostHc: this.roundToTwoDecimals(v.refuelsCostHc),
        maintenanceCostHc: this.roundToTwoDecimals(v.maintenanceCostHc),
        otherExpensesCostHc: this.roundToTwoDecimals(v.otherExpensesCostHc),
        totalExpensesHc: this.roundToTwoDecimals(totalExpensesHc),
        expensesCount,
        netProfitHc: this.roundToTwoDecimals(netProfitHc),
        profitMarginPct,
        distance,
        profitPerDistance: this.safePerDistance(netProfitHc, distance),
        revenuePerDistance: this.safePerDistance(v.revenueHc, distance),
        expensesPerDistance: this.safePerDistance(totalExpensesHc, distance),
      };
    });
  }

  // ===========================================================================
  // Monthly Trend
  // ===========================================================================

  /**
   * Build monthly trend with unit conversions
   */
  private buildMonthlyTrend(
    monthlyRaw: ProfitabilityMonthlyRaw[],
    distanceIn: string,
  ): ProfitabilityMonthlyTrend[] {
    return monthlyRaw.map((m) => {
      const totalExpensesHc = m.refuelsCostHc + m.maintenanceCostHc + m.otherExpensesCostHc;
      const netProfitHc = m.revenueHc - totalExpensesHc;
      const distance = m.distanceKm > 0 ? fromMetricDistanceRounded(m.distanceKm, distanceIn) : null;

      return {
        month: m.month,
        year: m.year,
        revenueHc: this.roundToTwoDecimals(m.revenueHc),
        revenueCount: m.revenueCount,
        refuelsCostHc: this.roundToTwoDecimals(m.refuelsCostHc),
        maintenanceCostHc: this.roundToTwoDecimals(m.maintenanceCostHc),
        otherExpensesCostHc: this.roundToTwoDecimals(m.otherExpensesCostHc),
        totalExpensesHc: this.roundToTwoDecimals(totalExpensesHc),
        expensesCount: 0, // Not tracked at monthly level in gateway
        netProfitHc: this.roundToTwoDecimals(netProfitHc),
        distance,
        profitPerDistance: this.safePerDistance(netProfitHc, distance),
      };
    });
  }

  // ===========================================================================
  // Revenue Breakdowns
  // ===========================================================================

  /**
   * Build revenue category breakdown with percentages
   */
  private buildRevenueCategoryBreakdown(
    rows: RevenueCategoryBreakdownRaw[],
    totalRevenueHc: number,
  ): RevenueCategoryBreakdown[] {
    return rows.map((row) => ({
      categoryId: row.categoryId,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      totalAmountHc: this.roundToTwoDecimals(row.totalAmountHc),
      recordsCount: row.recordsCountHc,
      percentageOfTotal: this.roundToTwoDecimals(this.calculatePercentage(row.totalAmountHc, totalRevenueHc)),
      foreignCurrencies: this.transformCurrencyAmounts(row.foreignCurrencies),
      totalForeignRecordsCount: this.sumRecordsCount(row.foreignCurrencies),
    }));
  }

  /**
   * Build revenue kind breakdown with percentages
   */
  private buildRevenueKindBreakdown(
    rows: RevenueKindBreakdownRaw[],
    totalRevenueHc: number,
  ): RevenueKindBreakdown[] {
    return rows.map((row) => ({
      kindId: row.kindId,
      kindCode: row.kindCode,
      kindName: row.kindName,
      categoryId: row.categoryId,
      categoryCode: row.categoryCode,
      totalAmountHc: this.roundToTwoDecimals(row.totalAmountHc),
      recordsCount: row.recordsCountHc,
      percentageOfTotal: this.roundToTwoDecimals(this.calculatePercentage(row.totalAmountHc, totalRevenueHc)),
      foreignCurrencies: this.transformCurrencyAmounts(row.foreignCurrencies),
      totalForeignRecordsCount: this.sumRecordsCount(row.foreignCurrencies),
    }));
  }

  // ===========================================================================
  // Expense Breakdowns (reuse pattern from ReportCore)
  // ===========================================================================

  /**
   * Transform category breakdown with percentage calculation
   */
  private transformCategoryBreakdown(rows: CategoryBreakdownRaw[], totalExpensesHc: number): any[] {
    return rows.map((row) => ({
      categoryId: row.categoryId,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      totalAmountHc: this.roundToTwoDecimals(row.totalAmountHc),
      recordsCountHc: row.recordsCountHc,
      percentageHc: this.roundToTwoDecimals(this.calculatePercentage(row.totalAmountHc, totalExpensesHc)),
      foreignCurrencies: this.transformCurrencyAmounts(row.foreignCurrencies),
      totalForeignRecordsCount: this.sumRecordsCount(row.foreignCurrencies),
    }));
  }

  /**
   * Transform kind breakdown with percentage calculation
   */
  private transformKindBreakdown(rows: KindBreakdownRaw[], totalExpensesHc: number): any[] {
    return rows.map((row) => ({
      kindId: row.kindId,
      kindCode: row.kindCode,
      kindName: row.kindName,
      categoryId: row.categoryId,
      categoryCode: row.categoryCode,
      totalAmountHc: this.roundToTwoDecimals(row.totalAmountHc),
      recordsCountHc: row.recordsCountHc,
      percentageHc: this.roundToTwoDecimals(this.calculatePercentage(row.totalAmountHc, totalExpensesHc)),
      foreignCurrencies: this.transformCurrencyAmounts(row.foreignCurrencies),
      totalForeignRecordsCount: this.sumRecordsCount(row.foreignCurrencies),
    }));
  }

  // ===========================================================================
  // Per-Trip Profitability
  // ===========================================================================

  /**
   * Build per-trip profitability from raw data
   */
  private buildTripProfitability(
    trips: TripProfitabilityRaw[],
    userProfile: UserProfile,
  ): TripProfitability[] {
    const { distanceIn } = userProfile;

    return trips.map((trip) => {
      const distance = trip.distanceKm != null
        ? fromMetricDistanceRounded(trip.distanceKm, distanceIn)
        : null;

      const totalLinkedExpensesHc = trip.linkedRefuelsHc + trip.linkedExpensesHc;
      const netProfitHc = trip.revenueHc - totalLinkedExpensesHc;

      return {
        tripId: trip.tripId,
        carId: trip.carId,
        date: trip.date ? dayjs.utc(trip.date).toISOString() : '',
        purpose: trip.purpose,
        destination: trip.destination,
        travelType: trip.travelType,
        distance,
        revenueHc: this.roundToTwoDecimals(trip.revenueHc),
        revenueCount: trip.revenueCount,
        linkedRefuelsHc: this.roundToTwoDecimals(trip.linkedRefuelsHc),
        linkedExpensesHc: this.roundToTwoDecimals(trip.linkedExpensesHc),
        totalLinkedExpensesHc: this.roundToTwoDecimals(totalLinkedExpensesHc),
        netProfitHc: this.roundToTwoDecimals(netProfitHc),
        profitPerDistance: this.safePerDistance(netProfitHc, distance),
        tags: trip.tags.map((t) => ({
          id: t.tagId,
          tagName: t.tagName,
          tagColor: t.tagColor,
        })),
      };
    });
  }

  /**
   * Build trip profitability totals
   */
  private buildTripProfitabilityTotals(trips: TripProfitability[]): TripProfitabilityTotals {
    let totalDistance = 0;
    let hasDistance = false;
    let totalRevenueHc = 0;
    let totalLinkedRefuelsHc = 0;
    let totalLinkedExpensesHc = 0;
    let totalNetProfitHc = 0;

    for (const trip of trips) {
      if (trip.distance != null) {
        totalDistance += trip.distance;
        hasDistance = true;
      }
      totalRevenueHc += trip.revenueHc;
      totalLinkedRefuelsHc += trip.linkedRefuelsHc;
      totalLinkedExpensesHc += trip.linkedExpensesHc;
      totalNetProfitHc += trip.netProfitHc;
    }

    const totalLinkedAllExpensesHc = totalLinkedRefuelsHc + totalLinkedExpensesHc;

    return {
      totalTrips: trips.length,
      totalDistance: hasDistance ? this.roundToTwoDecimals(totalDistance) : null,
      totalRevenueHc: this.roundToTwoDecimals(totalRevenueHc),
      totalLinkedRefuelsHc: this.roundToTwoDecimals(totalLinkedRefuelsHc),
      totalLinkedExpensesHc: this.roundToTwoDecimals(totalLinkedExpensesHc),
      totalLinkedAllExpensesHc: this.roundToTwoDecimals(totalLinkedAllExpensesHc),
      totalNetProfitHc: this.roundToTwoDecimals(totalNetProfitHc),
    };
  }

  // ===========================================================================
  // Break-Even Analysis
  // ===========================================================================

  /**
   * Build break-even analysis
   */
  private buildBreakEven(
    totalRevenueHc: number,
    totalExpensesHc: number,
    periodDays: number,
    monthlyTrend: ProfitabilityMonthlyRaw[],
  ): BreakEvenAnalysis {
    const netProfitHc = totalRevenueHc - totalExpensesHc;
    const isProfitable = netProfitHc >= 0;

    const avgDailyRevenueHc = this.roundToTwoDecimals(this.safeDivide(totalRevenueHc, periodDays));
    const avgDailyExpensesHc = this.roundToTwoDecimals(this.safeDivide(totalExpensesHc, periodDays));
    const avgDailyNetProfitHc = this.roundToTwoDecimals(this.safeDivide(netProfitHc, periodDays));

    // Days to break even (forward-looking): if unprofitable and has revenue
    let daysToBreakEven: number | null = null;
    if (!isProfitable && avgDailyRevenueHc > 0) {
      // At current daily revenue, how many days to cover total expenses?
      daysToBreakEven = Math.ceil(totalExpensesHc / avgDailyRevenueHc);
    }

    // Break-even day in period (retrospective): walk through monthly data
    let breakEvenDayInPeriod: number | null = null;
    if (isProfitable && monthlyTrend.length > 0) {
      breakEvenDayInPeriod = this.findBreakEvenDay(monthlyTrend);
    }

    return {
      avgDailyRevenueHc,
      avgDailyExpensesHc,
      avgDailyNetProfitHc,
      daysToBreakEven,
      breakEvenDayInPeriod,
      isProfitable,
    };
  }

  /**
   * Find the approximate day in the period when cumulative revenue
   * first exceeded cumulative expenses.
   * Uses monthly data to approximate — returns day number within the period.
   */
  private findBreakEvenDay(monthlyTrend: ProfitabilityMonthlyRaw[]): number | null {
    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;
    let daysSoFar = 0;

    for (const m of monthlyTrend) {
      const monthExpenses = m.refuelsCostHc + m.maintenanceCostHc + m.otherExpensesCostHc;
      const daysInMonth = dayjs.utc(`${m.year}-${String(m.month).padStart(2, '0')}-01`).daysInMonth();

      const prevRevenue = cumulativeRevenue;
      const prevExpenses = cumulativeExpenses;

      cumulativeRevenue += m.revenueHc;
      cumulativeExpenses += monthExpenses;

      // Check if break-even happened within this month
      if (prevRevenue < prevExpenses && cumulativeRevenue >= cumulativeExpenses) {
        // Linear interpolation within the month
        const revenueGap = prevExpenses - prevRevenue; // deficit at start of month
        const monthNetGain = m.revenueHc - monthExpenses; // net gain during month

        if (monthNetGain > 0) {
          const fractionOfMonth = revenueGap / monthNetGain;
          const breakEvenDayInMonth = Math.ceil(fractionOfMonth * daysInMonth);
          return daysSoFar + Math.min(breakEvenDayInMonth, daysInMonth);
        }

        return daysSoFar + daysInMonth;
      }

      daysSoFar += daysInMonth;
    }

    // If cumulative revenue was always >= expenses (profitable from day 1)
    if (cumulativeRevenue >= cumulativeExpenses && monthlyTrend.length > 0) {
      return 1;
    }

    return null;
  }

  // ===========================================================================
  // Empty Report
  // ===========================================================================

  /**
   * Build empty report when user has no cars
   */
  private buildEmptyReport(
    dateFrom: string,
    dateTo: string,
    userProfile: UserProfile,
  ): ProfitabilityReport {
    const periodDays = this.calculatePeriodDays(dateFrom, dateTo);

    return {
      dateFrom,
      dateTo,
      periodDays,

      totalRevenueHc: 0,
      totalRevenueCount: 0,
      totalRefuelsCostHc: 0,
      totalMaintenanceCostHc: 0,
      totalOtherExpensesCostHc: 0,
      totalExpensesHc: 0,
      totalExpensesCount: 0,
      netProfitHc: 0,
      profitMarginPct: null,
      avgDailyRevenueHc: 0,
      avgDailyExpensesHc: 0,
      avgDailyNetProfitHc: 0,
      totalDistance: null,
      profitPerDistance: null,

      foreignRevenueTotals: [],
      foreignExpenseTotals: [],
      totalForeignRevenueRecordsCount: 0,
      totalForeignExpenseRecordsCount: 0,

      revenueByCategory: [],
      revenueByKind: [],
      expensesByCategory: [],
      expensesByKind: [],

      byVehicle: [],
      monthlyTrend: [],

      profitableTrips: [],
      profitableTripsTotals: {
        totalTrips: 0,
        totalDistance: null,
        totalRevenueHc: 0,
        totalLinkedRefuelsHc: 0,
        totalLinkedExpensesHc: 0,
        totalLinkedAllExpensesHc: 0,
        totalNetProfitHc: 0,
      },

      breakEven: {
        avgDailyRevenueHc: 0,
        avgDailyExpensesHc: 0,
        avgDailyNetProfitHc: 0,
        daysToBreakEven: null,
        breakEvenDayInPeriod: null,
        isProfitable: false,
      },

      distanceUnit: userProfile.distanceIn,
      volumeUnit: userProfile.volumeIn,
      homeCurrency: userProfile.homeCurrency,
      vehiclesCount: 0,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Safe per-distance calculation returning null when no distance
   */
  private safePerDistance(value: number, distance: number | null): number | null {
    if (distance === null || distance <= 0) return null;
    return this.roundToTwoDecimals(value / distance);
  }
}

export { ReportProfitabilityCore };