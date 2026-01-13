import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/reportValidators';
import { fromMetricDistanceRounded, fromMetricVolume, calculateConsumption } from '../utils/unitConversions';
import {
  ExpenseSummaryRawData,
  CurrencyAmountRaw,
  CategoryBreakdownRaw,
  KindBreakdownRaw,
  UserProfile,
  YearlyReportRawData,
  MonthlyBreakdownRaw,
} from '../boundary';

dayjs.extend(utc);

// =============================================================================
// Core Class
// =============================================================================

class ReportCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'reportExpenseSummary',
      name: 'Report',
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
  // Expense Summary Report
  // ===========================================================================

  /**
   * Generate Expense Summary Report
   */
  public async expenseSummary(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().expenseSummary,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { filter } = args || {};
        const { carId, tagId, dateFrom, dateTo } = filter || {};
        const { accountId } = this.getContext();

        // 1. Get user preferences
        const userProfile = await this.getCurrentUserProfile();
        const { distanceIn, volumeIn, consumptionIn, homeCurrency } = userProfile;

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
        const rawData: ExpenseSummaryRawData = await this.getGateways().reportExpenseSummaryGw.getData({
          accountId,
          carIds,
          tagIds: tagId || [],
          dateFrom,
          dateTo,
        });

        // 5. Build and return the report
        const report = this.buildReport(rawData, dateFrom, dateTo, userProfile);

        return this.success(report);
      },
      hasTransaction: false,
      doingWhat: this.config.doingWhat?.expenseSummary ?? 'generating expense summary report',
    });
  }

  // ===========================================================================
  // Yearly Report
  // ===========================================================================

  /**
   * Generate Yearly Report
   */
  public async yearly(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().yearly,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { filter } = args || {};
        const { carId, year } = filter || {};
        const { accountId } = this.getContext();

        // 1. Get user preferences
        const userProfile = await this.getCurrentUserProfile();
        const { distanceIn, volumeIn, homeCurrency } = userProfile;

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
          return this.success(this.buildEmptyYearlyReport(year, userProfile));
        }

        // 4. Fetch raw data from gateway
        const rawData: YearlyReportRawData = await this.getGateways().reportYearlyGw.getData({
          accountId,
          carIds,
          year,
        });

        // 5. Build and return the report
        const report = this.buildYearlyReport(rawData, userProfile);

        return this.success(report);
      },
      hasTransaction: false,
      doingWhat: 'generating yearly report',
    });
  }

  // ===========================================================================
  // Yearly Report Building Helpers
  // ===========================================================================

  /**
   * Build the complete yearly report
   */
  private buildYearlyReport(
    rawData: YearlyReportRawData,
    userProfile: { distanceIn: string; volumeIn: string; homeCurrency: string },
  ): any {
    const { distanceIn, volumeIn, homeCurrency } = userProfile;

    // Create a map of existing month data for quick lookup
    const monthDataMap = new Map<number, MonthlyBreakdownRaw>();
    for (const monthData of rawData.months) {
      monthDataMap.set(monthData.month, monthData);
    }

    // Build all 12 months and accumulate totals
    const months: any[] = [];

    // Annual HC totals
    let totalRefuelsCostHc = 0;
    let totalExpensesCostHc = 0;
    let totalRefuelsCountHc = 0;
    let totalExpensesCountHc = 0;

    // Annual fuel & mileage
    let totalFuelPurchasedLiters = 0;
    let totalMileageKm = 0;
    let hasMileageData = false;
    let hasFuelData = false;
    let totalRefuelsCount = 0;
    let totalExpensesCount = 0;

    // Annual foreign currency accumulators
    const annualForeignRefuelsMap = new Map<string, CurrencyAmountRaw>();
    const annualForeignExpensesMap = new Map<string, CurrencyAmountRaw>();

    for (let month = 1; month <= 12; month++) {
      const monthData = monthDataMap.get(month);

      if (monthData) {
        // Calculate mileage for this month
        const monthMileageKm = this.calculateMileageKm(monthData.startMileageKm, monthData.endMileageKm);
        const monthMileage = fromMetricDistanceRounded(monthMileageKm, distanceIn);

        // Convert fuel volume to user's unit
        const monthFuelPurchased = fromMetricVolume(monthData.refuelsVolumeLiters, volumeIn);

        // Transform foreign currency amounts
        const foreignRefuels = this.transformCurrencyAmounts(monthData.foreignRefuels);
        const foreignExpenses = this.transformCurrencyAmounts(monthData.foreignExpenses);
        const foreignCurrencyTotals = this.transformCurrencyAmounts(monthData.foreignCurrencyTotals);

        months.push({
          month,
          refuelsCostHc: this.roundToTwoDecimals(monthData.refuelsCostHc),
          expensesCostHc: this.roundToTwoDecimals(monthData.expensesCostHc),
          totalCostHc: this.roundToTwoDecimals(monthData.refuelsCostHc + monthData.expensesCostHc),
          refuelsCountHc: monthData.refuelsCountHc,
          expensesCountHc: monthData.expensesCountHc,
          foreignRefuels,
          foreignExpenses,
          foreignCurrencyTotals,
          totalForeignRecordsCount: monthData.totalForeignRecordsCount,
          fuelPurchased: monthFuelPurchased != null ? this.roundToTwoDecimals(monthFuelPurchased) : null,
          mileage: monthMileage,
          refuelsCount: monthData.refuelsCount,
          expensesCount: monthData.expensesCount,
        });

        // Accumulate HC totals
        totalRefuelsCostHc += monthData.refuelsCostHc;
        totalExpensesCostHc += monthData.expensesCostHc;
        totalRefuelsCountHc += monthData.refuelsCountHc;
        totalExpensesCountHc += monthData.expensesCountHc;

        // Accumulate total counts
        totalRefuelsCount += monthData.refuelsCount;
        totalExpensesCount += monthData.expensesCount;

        // Accumulate fuel
        if (monthData.refuelsVolumeLiters > 0) {
          totalFuelPurchasedLiters += monthData.refuelsVolumeLiters;
          hasFuelData = true;
        }

        // Accumulate mileage
        if (monthMileageKm != null && monthMileageKm > 0) {
          totalMileageKm += monthMileageKm;
          hasMileageData = true;
        }

        // Accumulate foreign refuels
        for (const item of monthData.foreignRefuels) {
          this.accumulateCurrencyAmount(annualForeignRefuelsMap, item);
        }

        // Accumulate foreign expenses
        for (const item of monthData.foreignExpenses) {
          this.accumulateCurrencyAmount(annualForeignExpensesMap, item);
        }
      } else {
        // Empty month
        months.push({
          month,
          refuelsCostHc: 0,
          expensesCostHc: 0,
          totalCostHc: 0,
          refuelsCountHc: 0,
          expensesCountHc: 0,
          foreignRefuels: [],
          foreignExpenses: [],
          foreignCurrencyTotals: [],
          totalForeignRecordsCount: 0,
          fuelPurchased: null,
          mileage: null,
          refuelsCount: 0,
          expensesCount: 0,
        });
      }
    }

    // Convert totals to user's units
    const totalFuelPurchased = hasFuelData ? fromMetricVolume(totalFuelPurchasedLiters, volumeIn) : null;
    const totalMileage = hasMileageData ? fromMetricDistanceRounded(totalMileageKm, distanceIn) : null;

    // Build annual foreign currency arrays
    const foreignRefuels = this.transformCurrencyAmounts(Array.from(annualForeignRefuelsMap.values()));
    const foreignExpenses = this.transformCurrencyAmounts(Array.from(annualForeignExpensesMap.values()));

    // Merge for annual totals
    const annualForeignTotalsMap = new Map<string, CurrencyAmountRaw>();
    for (const item of annualForeignRefuelsMap.values()) {
      this.accumulateCurrencyAmount(annualForeignTotalsMap, item);
    }
    for (const item of annualForeignExpensesMap.values()) {
      this.accumulateCurrencyAmount(annualForeignTotalsMap, item);
    }
    const foreignCurrencyTotals = this.transformCurrencyAmounts(Array.from(annualForeignTotalsMap.values()));

    // Calculate total foreign records count
    const totalForeignRecordsCount = foreignCurrencyTotals.reduce((sum, item) => sum + item.recordsCount, 0);

    return {
      year: rawData.year,

      // Annual HC totals
      totalRefuelsCostHc: this.roundToTwoDecimals(totalRefuelsCostHc),
      totalExpensesCostHc: this.roundToTwoDecimals(totalExpensesCostHc),
      totalCostHc: this.roundToTwoDecimals(totalRefuelsCostHc + totalExpensesCostHc),
      totalRefuelsCountHc,
      totalExpensesCountHc,

      // Annual foreign currency breakdowns
      foreignRefuels,
      foreignExpenses,
      foreignCurrencyTotals,
      totalForeignRecordsCount,

      // Annual fuel & mileage
      totalFuelPurchased: totalFuelPurchased != null ? this.roundToTwoDecimals(totalFuelPurchased) : null,
      totalMileage,
      totalRefuelsCount,
      totalExpensesCount,

      // Monthly breakdown
      months,

      // User preferences
      distanceUnit: distanceIn,
      volumeUnit: volumeIn,
      homeCurrency,
      vehiclesCount: rawData.vehiclesCount,
    };
  }

  /**
   * Build empty yearly report when user has no cars or no data
   */
  private buildEmptyYearlyReport(
    year: number,
    userProfile: { distanceIn: string; volumeIn: string; homeCurrency: string },
  ): any {
    // Build 12 empty months
    const months: any[] = [];
    for (let month = 1; month <= 12; month++) {
      months.push({
        month,
        refuelsCostHc: 0,
        expensesCostHc: 0,
        totalCostHc: 0,
        refuelsCountHc: 0,
        expensesCountHc: 0,
        foreignRefuels: [],
        foreignExpenses: [],
        foreignCurrencyTotals: [],
        totalForeignRecordsCount: 0,
        fuelPurchased: null,
        mileage: null,
        refuelsCount: 0,
        expensesCount: 0,
      });
    }

    return {
      year,

      totalRefuelsCostHc: 0,
      totalExpensesCostHc: 0,
      totalCostHc: 0,
      totalRefuelsCountHc: 0,
      totalExpensesCountHc: 0,

      foreignRefuels: [],
      foreignExpenses: [],
      foreignCurrencyTotals: [],
      totalForeignRecordsCount: 0,

      totalFuelPurchased: null,
      totalMileage: null,
      totalRefuelsCount: 0,
      totalExpensesCount: 0,

      months,

      distanceUnit: userProfile.distanceIn,
      volumeUnit: userProfile.volumeIn,
      homeCurrency: userProfile.homeCurrency,
      vehiclesCount: 0,
    };
  }

  /**
   * Accumulate currency amount into a map
   */
  private accumulateCurrencyAmount(map: Map<string, CurrencyAmountRaw>, item: CurrencyAmountRaw): void {
    if (map.has(item.currency)) {
      const existing = map.get(item.currency)!;
      existing.amount += item.amount;
      existing.recordsCount += item.recordsCount;
    } else {
      map.set(item.currency, {
        currency: item.currency,
        amount: item.amount,
        recordsCount: item.recordsCount,
      });
    }
  }

  // ===========================================================================
  // Report Building Helpers
  // ===========================================================================

  /**
   * Build the complete expense summary report
   */
  private buildReport(rawData: ExpenseSummaryRawData, dateFrom: string, dateTo: string, userProfile: UserProfile): any {
    const { distanceIn, volumeIn, consumptionIn, homeCurrency } = userProfile;

    // Calculate period days
    const periodDays = this.calculatePeriodDays(dateFrom, dateTo);

    // Calculate mileage in user's unit
    const mileageKm = this.calculateMileageKm(rawData.minOdometerKm, rawData.maxOdometerKm);
    const mileage = fromMetricDistanceRounded(mileageKm, distanceIn);

    // Calculate consumption
    const consumption = calculateConsumption(mileageKm, rawData.totalVolumeLiters, consumptionIn);

    // Calculate fuel volume in user's unit
    const fuelPurchased = fromMetricVolume(rawData.totalVolumeLiters, volumeIn);

    // Calculate average fuel price per volume (HC only)
    const avgPricePerVolumeHc = this.calculateAvgFuelPriceHc(
      rawData.refuelsCostHc,
      rawData.totalVolumeLiters,
      volumeIn,
    );

    // Calculate cost per distance (HC only)
    const costPerDistanceHc = this.calculateCostPerDistance(rawData.totalCostHc, mileage);

    // Calculate foreign records count
    const totalForeignRecordsCount = this.sumForeignRecordsCount(rawData.foreignCurrencyTotals);

    return {
      // Period info
      dateFrom,
      dateTo,
      periodDays,

      // HC Totals
      totalCostHc: this.roundToTwoDecimals(rawData.totalCostHc),
      refuelsCostHc: this.roundToTwoDecimals(rawData.refuelsCostHc),
      expensesCostHc: this.roundToTwoDecimals(rawData.expensesCostHc),

      // HC Daily averages
      avgTotalCostPerDayHc: this.roundToTwoDecimals(this.safeDivide(rawData.totalCostHc, periodDays)),
      avgRefuelsCostPerDayHc: this.roundToTwoDecimals(this.safeDivide(rawData.refuelsCostHc, periodDays)),
      avgExpensesCostPerDayHc: this.roundToTwoDecimals(this.safeDivide(rawData.expensesCostHc, periodDays)),

      // Foreign currency totals
      foreignCurrencyTotals: this.transformCurrencyAmounts(rawData.foreignCurrencyTotals),
      totalForeignRecordsCount,

      // Refuels detail
      refuels: {
        totalCostHc: this.roundToTwoDecimals(rawData.refuelsCostHc),
        recordsCountHc: rawData.refuelsCountHc,
        totalVolume: fuelPurchased != null ? this.roundToTwoDecimals(fuelPurchased) : null,
        avgPricePerVolumeHc: avgPricePerVolumeHc != null ? this.roundToThreeDecimals(avgPricePerVolumeHc) : null,
        foreignCurrencies: this.transformCurrencyAmounts(rawData.foreignRefuels),
        totalForeignRecordsCount: this.sumForeignRecordsCount(rawData.foreignRefuels),
      },

      // Expenses detail
      expenses: {
        totalCostHc: this.roundToTwoDecimals(rawData.expensesCostHc),
        recordsCountHc: rawData.expensesCountHc,
        foreignCurrencies: this.transformCurrencyAmounts(rawData.foreignExpenses),
        totalForeignRecordsCount: this.sumForeignRecordsCount(rawData.foreignExpenses),
      },

      // Fuel metrics
      fuelPurchased: fuelPurchased != null ? this.roundToTwoDecimals(fuelPurchased) : null,
      refuelsCount: rawData.refuelsCount,

      // Mileage metrics
      startOdometer: fromMetricDistanceRounded(rawData.minOdometerKm, distanceIn),
      endOdometer: fromMetricDistanceRounded(rawData.maxOdometerKm, distanceIn),
      mileage,
      avgMileagePerDay: this.roundToTwoDecimals(this.safeDivide(mileage, periodDays)),

      // Efficiency metrics
      consumption: consumption != null ? this.roundToTwoDecimals(consumption) : null,
      costPerDistanceHc: costPerDistanceHc != null ? this.roundToTwoDecimals(costPerDistanceHc) : null,

      // Counts
      totalRecordsCount: rawData.totalRecordsCount,
      vehiclesCount: rawData.vehiclesCount,

      // Breakdowns
      expensesByCategory: this.transformCategoryBreakdown(rawData.byCategory, rawData.expensesCostHc),
      expensesByKind: this.transformKindBreakdown(rawData.byKind, rawData.expensesCostHc),

      // User preferences
      distanceUnit: distanceIn,
      volumeUnit: volumeIn,
      consumptionUnit: consumptionIn,
      homeCurrency,
    };
  }

  /**
   * Build empty report when user has no cars or no data
   */
  private buildEmptyReport(
    dateFrom: string,
    dateTo: string,
    userProfile: { distanceIn: string; volumeIn: string; consumptionIn: string; homeCurrency: string },
  ): any {
    const periodDays = this.calculatePeriodDays(dateFrom, dateTo);

    return {
      dateFrom,
      dateTo,
      periodDays,

      totalCostHc: 0,
      refuelsCostHc: 0,
      expensesCostHc: 0,

      avgTotalCostPerDayHc: 0,
      avgRefuelsCostPerDayHc: 0,
      avgExpensesCostPerDayHc: 0,

      foreignCurrencyTotals: [],
      totalForeignRecordsCount: 0,

      refuels: {
        totalCostHc: 0,
        recordsCountHc: 0,
        totalVolume: null,
        avgPricePerVolumeHc: null,
        foreignCurrencies: [],
        totalForeignRecordsCount: 0,
      },

      expenses: {
        totalCostHc: 0,
        recordsCountHc: 0,
        foreignCurrencies: [],
        totalForeignRecordsCount: 0,
      },

      fuelPurchased: null,
      refuelsCount: 0,

      startOdometer: null,
      endOdometer: null,
      mileage: null,
      avgMileagePerDay: null,

      consumption: null,
      costPerDistanceHc: null,

      totalRecordsCount: 0,
      vehiclesCount: 0,

      expensesByCategory: [],
      expensesByKind: [],

      distanceUnit: userProfile.distanceIn,
      volumeUnit: userProfile.volumeIn,
      consumptionUnit: userProfile.consumptionIn,
      homeCurrency: userProfile.homeCurrency,
    };
  }

  // ===========================================================================
  // Transformation Helpers
  // ===========================================================================

  /**
   * Transform currency amounts with rounding
   */
  private transformCurrencyAmounts(amounts: CurrencyAmountRaw[]): any[] {
    return amounts.map((item) => ({
      currency: item.currency,
      amount: this.roundToTwoDecimals(item.amount),
      recordsCount: item.recordsCount,
    }));
  }

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
      totalForeignRecordsCount: this.sumForeignRecordsCount(row.foreignCurrencies),
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
      totalForeignRecordsCount: this.sumForeignRecordsCount(row.foreignCurrencies),
    }));
  }

  // ===========================================================================
  // Calculation Helpers
  // ===========================================================================

  /**
   * Calculate number of days in the period (inclusive)
   */
  private calculatePeriodDays(dateFrom: string, dateTo: string): number {
    const from = dayjs.utc(dateFrom);
    const to = dayjs.utc(dateTo);
    return to.diff(from, 'day') + 1;
  }

  /**
   * Calculate mileage from min/max odometer in km
   */
  private calculateMileageKm(minKm: number | null, maxKm: number | null): number | null {
    if (minKm === null || maxKm === null) {
      return null;
    }
    return maxKm - minKm;
  }

  /**
   * Calculate average fuel price per volume unit (based on HC cost)
   */
  private calculateAvgFuelPriceHc(refuelsCostHc: number, totalVolumeLiters: number, volumeUnit: string): number | null {
    if (totalVolumeLiters <= 0 || refuelsCostHc <= 0) {
      return null;
    }

    const volumeInUserUnit = fromMetricVolume(totalVolumeLiters, volumeUnit);
    if (!volumeInUserUnit || volumeInUserUnit <= 0) {
      return null;
    }

    return refuelsCostHc / volumeInUserUnit;
  }

  /**
   * Calculate cost per distance unit (in user's distance unit)
   */
  private calculateCostPerDistance(totalCostHc: number, mileage: number | null): number | null {
    if (mileage === null || mileage <= 0 || totalCostHc <= 0) {
      return null;
    }
    return totalCostHc / mileage;
  }

  /**
   * Calculate percentage
   */
  private calculatePercentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return (value / total) * 100;
  }

  /**
   * Sum foreign records count from currency amounts array
   */
  private sumForeignRecordsCount(amounts: CurrencyAmountRaw[]): number {
    return amounts.reduce((sum, item) => sum + item.recordsCount, 0);
  }

  /**
   * Safe division that returns 0 if divisor is 0 or value is null
   */
  private safeDivide(value: number | null, divisor: number): number {
    if (value === null || divisor <= 0) {
      return 0;
    }
    return value / divisor;
  }

  /**
   * Round to 2 decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Round to 3 decimal places (for fuel prices)
   */
  private roundToThreeDecimals(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}

export { ReportCore };
