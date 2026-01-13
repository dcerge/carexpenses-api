import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/reportValidators';
import {
  fromMetricDistance,
  fromMetricDistanceRounded,
  fromMetricVolume,
  calculateConsumption,
} from '../utils/unitConversions';
import {
  ExpenseSummaryRawData,
  CurrencyAmountRaw,
  CategoryBreakdownRaw,
  KindBreakdownRaw,
  UserProfile,
} from '../boundary';

dayjs.extend(utc);

// =============================================================================
// Types
// =============================================================================

interface CurrencyAmount {
  currency: string;
  amount: number;
  recordsCount: number;
}

interface ExpenseSummaryByCategory {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  totalAmountHc: number;
  recordsCountHc: number;
  percentageHc: number;
  foreignCurrencies: CurrencyAmount[];
  totalForeignRecordsCount: number;
}

interface ExpenseSummaryByKind {
  kindId: number;
  kindCode: string;
  kindName: string;
  categoryId: number;
  categoryCode: string;
  totalAmountHc: number;
  recordsCountHc: number;
  percentageHc: number;
  foreignCurrencies: CurrencyAmount[];
  totalForeignRecordsCount: number;
}

interface RefuelsSummary {
  totalCostHc: number;
  recordsCountHc: number;
  totalVolume: number | null;
  avgPricePerVolumeHc: number | null;
  foreignCurrencies: CurrencyAmount[];
  totalForeignRecordsCount: number;
}

interface ExpensesSummary {
  totalCostHc: number;
  recordsCountHc: number;
  foreignCurrencies: CurrencyAmount[];
  totalForeignRecordsCount: number;
}

interface ExpenseSummaryReport {
  dateFrom: string;
  dateTo: string;
  periodDays: number;

  // HC Totals
  totalCostHc: number;
  refuelsCostHc: number;
  expensesCostHc: number;

  // HC Daily averages
  avgTotalCostPerDayHc: number;
  avgRefuelsCostPerDayHc: number;
  avgExpensesCostPerDayHc: number;

  // Foreign currency totals
  foreignCurrencyTotals: CurrencyAmount[];
  totalForeignRecordsCount: number;

  // Refuels detail
  refuels: RefuelsSummary;

  // Expenses detail
  expenses: ExpensesSummary;

  // Fuel metrics
  fuelPurchased: number | null;
  refuelsCount: number;

  // Mileage metrics
  startOdometer: number | null;
  endOdometer: number | null;
  mileage: number | null;
  avgMileagePerDay: number | null;

  // Efficiency metrics
  consumption: number | null;
  costPerDistanceHc: number | null;

  // Counts
  totalRecordsCount: number;
  vehiclesCount: number;

  // Breakdowns
  expensesByCategory: ExpenseSummaryByCategory[];
  expensesByKind: ExpenseSummaryByKind[];

  // User preferences
  distanceUnit: string;
  volumeUnit: string;
  consumptionUnit: string;
  homeCurrency: string;
}

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
      // doingWhat: {
      //   expenseSummary: 'generating expense summary report',
      //   // Future reports:
      //   // monthlyTrend: 'generating monthly trend report',
      //   // fuelEfficiency: 'generating fuel efficiency report',
      // },
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

        this.logger.log('== CP1 = carIds', carIds);

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

        this.logger.log('== CP2 = rawData', rawData);

        // 5. Build and return the report
        const report = this.buildReport(rawData, dateFrom, dateTo, userProfile);

        this.logger.log('== CP3 Report', JSON.stringify(report, null, 2));

        return this.success(report);
      },
      hasTransaction: false,
      doingWhat: this.config.doingWhat?.expenseSummary ?? 'generating expense summary report',
    });
  }

  // ===========================================================================
  // Report Building Helpers
  // ===========================================================================

  /**
   * Build the complete expense summary report
   */
  private buildReport(
    rawData: ExpenseSummaryRawData,
    dateFrom: string,
    dateTo: string,
    userProfile: UserProfile,
  ): ExpenseSummaryReport {
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
  ): ExpenseSummaryReport {
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
  private transformCurrencyAmounts(amounts: CurrencyAmountRaw[]): CurrencyAmount[] {
    return amounts.map((item) => ({
      currency: item.currency,
      amount: this.roundToTwoDecimals(item.amount),
      recordsCount: item.recordsCount,
    }));
  }

  /**
   * Transform category breakdown with percentage calculation
   */
  private transformCategoryBreakdown(
    rows: CategoryBreakdownRaw[],
    totalExpensesHc: number,
  ): ExpenseSummaryByCategory[] {
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
  private transformKindBreakdown(rows: KindBreakdownRaw[], totalExpensesHc: number): ExpenseSummaryByKind[] {
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

  // ===========================================================================
  // Future Report Methods
  // ===========================================================================

  // public async monthlyTrend(args: any) {
  //   return this.runAction({
  //     args,
  //     doAuth: true,
  //     validate: this.getValidators().monthlyTrend,
  //     action: async (args: any, opt: BaseCoreActionsInterface) => {
  //       // Implementation for monthly trend report
  //     },
  //     hasTransaction: false,
  //     doingWhat: this.config.doingWhat?.monthlyTrend ?? 'generating monthly trend report',
  //   });
  // }

  // public async fuelEfficiency(args: any) {
  //   return this.runAction({
  //     args,
  //     doAuth: true,
  //     validate: this.getValidators().fuelEfficiency,
  //     action: async (args: any, opt: BaseCoreActionsInterface) => {
  //       // Implementation for fuel efficiency report
  //     },
  //     hasTransaction: false,
  //     doingWhat: this.config.doingWhat?.fuelEfficiency ?? 'generating fuel efficiency report',
  //   });
  // }
}

export { ReportCore };
