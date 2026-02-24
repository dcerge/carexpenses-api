// ./src/core/DashboardCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/dashboardValidators';
import {
  fromMetricDistance,
  fromMetricVolume,
  deriveConsumptionUnit,
  calculateConsumption,
} from '../utils/unitConversions';
import { UserProfile, CAR_STATUSES } from '../boundary';

dayjs.extend(utc);

// =============================================================================
// Interfaces
// =============================================================================

interface StatsUnits {
  distanceUnit: string;
  volumeUnit: string;
  consumptionUnit: string;
  firstOdometer: number | null;
  lastOdometer: number | null;
  travelsDistance: number | null;
  firstRefuelOdometer: number | null;
  consumptionDistance: number | null;
  refuelsVolume: number | null;
  firstRefuelVolume: number | null;
  consumptionVolume: number | null;
  consumption: number | null;
}

interface CarStats {
  carId: string;
  year: number;
  month: number;
  refuelsCount: number;
  expensesCount: number;
  revenuesCount: number;
  maintenanceCount: number;
  checkpointsCount: number;
  travelsCount: number;
  latestRefuelId: string | null;
  latestExpenseId: string | null;
  latestTravelId: string | null;
  latestRevenueId: string | null;
  firstRefuelId: string | null;
  firstRecordAt: string | null;
  lastRecordAt: string | null;
  inCarUnits: StatsUnits | null;
  inUserUnits: StatsUnits | null;
}

interface StatsMonetary {
  carId: string;
  year: number;
  month: number;
  currency: string;
  refuelsCost: number | null;
  refuelsTaxes: number | null;
  expensesCost: number | null;
  expensesFees: number | null;
  expensesTaxes: number | null;
  maintenanceCost: number | null;
  revenuesAmount: number | null;
}

interface DashboardAverages {
  currency: string;
  monthsCount: number;
  monthlyExpense: number | null;
  monthlyRevenue: number | null;
  monthlyRefuelsVolume: number | null;
  monthlyMileageInCarUnits: number | null;
  monthlyMileageInUserUnits: number | null;
  monthlyConsumption: number | null;
}

interface DashboardItem {
  carId: string;
  car: any | null;
  totalStats: CarStats;
  totalMonetary: StatsMonetary[];
  currentMonthStats: CarStats;
  currentMonthMonetary: StatsMonetary[];
  previousMonthStats: CarStats;
  previousMonthMonetary: StatsMonetary[];
  averages: DashboardAverages;
  daysRemainingInMonth: number;
}

interface FleetSummary {
  year: number;
  month: number;
  currency: string;
  distanceUnit: string;
  volumeUnit: string;
  refuelsCost: number;
  maintenanceCost: number;
  otherExpensesCost: number;
  totalCost: number;
  revenuesAmount: number;
  refuelsCount: number;
  maintenanceCount: number;
  otherExpensesCount: number;
  revenuesCount: number;
  refuelsVolume: number;
  totalDistance: number;
  fuelCostPerDistance: number | null;
  runningCostPerDistance: number | null;
  minYear: number;
  minMonth: number;
}

interface MetricValues {
  firstOdometer: number | null;
  lastOdometer: number | null;
  travelsDistance: number | null;
  firstRefuelOdometer: number | null;
  consumptionDistance: number | null;
  refuelsVolume: number | null;
  firstRefuelVolume: number | null;
  consumptionVolume: number | null;
}

// =============================================================================
// Helper: safe numeric
// =============================================================================

function num(val: any): number {
  return val != null ? Number(val) || 0 : 0;
}

function numOrNull(val: any): number | null {
  return val != null ? Number(val) : null;
}

function maxDate(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

function minDate(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b || null;
  if (!b) return a;
  return a < b ? a : b;
}

function formatTimestamp(val: any): string | null {
  if (val == null) return null;
  return dayjs(val).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
}

const EMPTY_METRIC_VALUES: MetricValues = {
  firstOdometer: null,
  lastOdometer: null,
  travelsDistance: null,
  firstRefuelOdometer: null,
  consumptionDistance: null,
  refuelsVolume: null,
  firstRefuelVolume: null,
  consumptionVolume: null,
};

// =============================================================================
// DashboardCore
// =============================================================================

class DashboardCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      name: 'Dashboard',
      hasOrderNo: false,
      doAuth: true,
    });
  }

  // ===========================================================================
  // Unit Conversion Helpers
  // ===========================================================================

  /**
   * Create a StatsUnits object with values converted from metric
   */
  private createStatsUnits(
    metricValues: MetricValues,
    distanceUnit: string,
    volumeUnit: string,
    consumptionUnit: string,
  ): StatsUnits {
    return {
      distanceUnit,
      volumeUnit,
      consumptionUnit,
      firstOdometer: fromMetricDistance(metricValues.firstOdometer, distanceUnit),
      lastOdometer: fromMetricDistance(metricValues.lastOdometer, distanceUnit),
      travelsDistance: fromMetricDistance(metricValues.travelsDistance, distanceUnit),
      firstRefuelOdometer: fromMetricDistance(metricValues.firstRefuelOdometer, distanceUnit),
      consumptionDistance: fromMetricDistance(metricValues.consumptionDistance, distanceUnit),
      refuelsVolume: fromMetricVolume(metricValues.refuelsVolume, volumeUnit),
      firstRefuelVolume: fromMetricVolume(metricValues.firstRefuelVolume, volumeUnit),
      consumptionVolume: fromMetricVolume(metricValues.consumptionVolume, volumeUnit),
      consumption: calculateConsumption(metricValues.consumptionDistance, metricValues.consumptionVolume, consumptionUnit),
    };
  }

  /**
   * Add inCarUnits and inUserUnits to a CarStats object
   */
  private applyUnitConversions(
    stats: CarStats,
    metricValues: MetricValues,
    car: any,
    userProfile: UserProfile,
  ): void {
    const carDistanceUnit = car?.mileageIn || 'km';
    const carVolumeUnit = car?.mainTankVolumeEnteredIn || 'l';
    const carConsumptionUnit = deriveConsumptionUnit(carDistanceUnit, carVolumeUnit);

    stats.inCarUnits = this.createStatsUnits(metricValues, carDistanceUnit, carVolumeUnit, carConsumptionUnit);

    const userDistanceUnit = userProfile?.distanceIn || 'km';
    const userVolumeUnit = userProfile?.volumeIn || 'l';
    const userConsumptionUnit = userProfile?.consumptionIn || 'l100km';

    stats.inUserUnits = this.createStatsUnits(metricValues, userDistanceUnit, userVolumeUnit, userConsumptionUnit);
  }

  // ===========================================================================
  // Empty/Zeroed Object Builders
  // ===========================================================================

  private buildEmptyCarStats(carId: string, year: number, month: number): CarStats {
    return {
      carId,
      year,
      month,
      refuelsCount: 0,
      expensesCount: 0,
      revenuesCount: 0,
      maintenanceCount: 0,
      checkpointsCount: 0,
      travelsCount: 0,
      latestRefuelId: null,
      latestExpenseId: null,
      latestTravelId: null,
      latestRevenueId: null,
      firstRefuelId: null,
      firstRecordAt: null,
      lastRecordAt: null,
      inCarUnits: null,
      inUserUnits: null,
    };
  }

  private buildEmptyAverages(currency: string): DashboardAverages {
    return {
      currency,
      monthsCount: 0,
      monthlyExpense: null,
      monthlyRevenue: null,
      monthlyRefuelsVolume: null,
      monthlyMileageInCarUnits: null,
      monthlyMileageInUserUnits: null,
      monthlyConsumption: null,
    };
  }

  // ===========================================================================
  // Aggregation: Total Summaries
  // ===========================================================================

  /**
   * Aggregate total summary rows (multiple currency rows per car) into
   * a single CarStats (currency-independent) and StatsMonetary[] (per-currency).
   *
   * All rows are camelCase (from gateway list).
   */
  private aggregateTotalSummaries(
    rows: any[],
    carId: string,
  ): { stats: CarStats; monetary: StatsMonetary[]; metricValues: MetricValues } {
    const stats = this.buildEmptyCarStats(carId, 0, 0);
    const monetary: StatsMonetary[] = [];

    if (rows.length === 0) {
      return { stats, monetary, metricValues: { ...EMPTY_METRIC_VALUES } };
    }

    // Aggregate currency-independent values across all currency rows
    let lastOdometer = 0;
    let firstRefuelOdometer: number | null = null;
    let consumptionDistance = 0;
    let totalRefuelsVolume = 0;
    let firstRefuelVolume: number | null = null;
    let consumptionVolume = 0;
    let totalTravelsDistance = 0;
    let firstRecordAt: string | null = null;
    let lastRecordAt: string | null = null;

    // For reference IDs, pick from the row with the latest lastRecordAt
    let latestRow: any = null;

    for (const row of rows) {
      // SUM counts
      stats.refuelsCount += num(row.totalRefuelsCount);
      stats.expensesCount += num(row.totalExpensesCount);
      stats.revenuesCount += num(row.totalRevenuesCount);
      stats.maintenanceCount += num(row.totalMaintenanceCount);
      stats.checkpointsCount += num(row.totalCheckpointsCount);
      stats.travelsCount += num(row.totalTravelsCount);

      // MAX odometer
      lastOdometer = Math.max(lastOdometer, num(row.latestKnownMileage));

      // MIN first refuel odometer
      if (row.firstRefuelOdometer != null) {
        const val = num(row.firstRefuelOdometer);
        firstRefuelOdometer = firstRefuelOdometer == null ? val : Math.min(firstRefuelOdometer, val);
      }

      // MAX consumption distance (car-wide span)
      consumptionDistance = Math.max(consumptionDistance, num(row.consumptionDistance));

      // SUM volumes
      totalRefuelsVolume += num(row.totalRefuelsVolume);
      consumptionVolume += num(row.consumptionVolume);
      totalTravelsDistance += num(row.totalTravelsDistance);

      // SUM first refuel volume
      if (row.firstRefuelVolume != null) {
        firstRefuelVolume = (firstRefuelVolume || 0) + num(row.firstRefuelVolume);
      }

      // MIN/MAX dates
      firstRecordAt = minDate(firstRecordAt, row.firstRecordAt);
      lastRecordAt = maxDate(lastRecordAt, row.lastRecordAt);

      // Track latest row for reference IDs
      if (!latestRow || maxDate(row.lastRecordAt, latestRow.lastRecordAt) === row.lastRecordAt) {
        latestRow = row;
      }

      // Build monetary entry for this currency
      monetary.push({
        carId,
        year: 0,
        month: 0,
        currency: row.homeCurrency,
        refuelsCost: numOrNull(row.totalRefuelsCost),
        refuelsTaxes: numOrNull(row.refuelTaxes),
        expensesCost: numOrNull(row.totalExpensesCost),
        expensesFees: numOrNull(row.expensesFees),
        expensesTaxes: numOrNull(row.expensesTaxes),
        maintenanceCost: numOrNull(row.totalMaintenanceCost),
        revenuesAmount: numOrNull(row.totalRevenuesAmount),
      });
    }

    // Reference IDs from latest row
    if (latestRow) {
      stats.latestRefuelId = latestRow.latestRefuelId || null;
      stats.latestExpenseId = latestRow.latestExpenseId || null;
      stats.latestTravelId = latestRow.latestTravelId || null;
      stats.latestRevenueId = latestRow.latestRevenueId || null;
      stats.firstRefuelId = latestRow.firstRefuelId || null;
    }

    stats.firstRecordAt = formatTimestamp(firstRecordAt);
    stats.lastRecordAt = formatTimestamp(lastRecordAt);

    const metricValues: MetricValues = {
      firstOdometer: null, // Total summaries don't have a first odometer
      lastOdometer: lastOdometer || null,
      travelsDistance: totalTravelsDistance || null,
      firstRefuelOdometer,
      consumptionDistance: consumptionDistance || null,
      refuelsVolume: totalRefuelsVolume || null,
      firstRefuelVolume,
      consumptionVolume: consumptionVolume || null,
    };

    return { stats, monetary, metricValues };
  }

  // ===========================================================================
  // Aggregation: Monthly Summaries
  // ===========================================================================

  /**
   * Aggregate monthly summary rows for a specific car + year + month
   * (multiple currency rows) into a single CarStats and StatsMonetary[].
   *
   * All rows are camelCase (from gateway listByYearMonthPairs with camelKeys).
   */
  private aggregateMonthlySummaries(
    rows: any[],
    carId: string,
    year: number,
    month: number,
  ): { stats: CarStats; monetary: StatsMonetary[]; metricValues: MetricValues } {
    const stats = this.buildEmptyCarStats(carId, year, month);
    const monetary: StatsMonetary[] = [];

    if (rows.length === 0) {
      return { stats, monetary, metricValues: { ...EMPTY_METRIC_VALUES } };
    }

    let startMileage: number | null = null;
    let endMileage = 0;
    let totalRefuelsVolume = 0;
    let consumptionVolume = 0;
    let totalTravelsDistance = 0;
    let firstRecordAt: string | null = null;
    let lastRecordAt: string | null = null;

    for (const row of rows) {
      // SUM counts
      stats.refuelsCount += num(row.refuelsCount);
      stats.expensesCount += num(row.expensesCount);
      stats.revenuesCount += num(row.revenuesCount);
      stats.maintenanceCount += num(row.maintenanceCount);
      stats.checkpointsCount += num(row.checkpointsCount);
      stats.travelsCount += num(row.travelsCount);

      // MIN start mileage, MAX end mileage
      const startVal = num(row.startMileage);
      const endVal = num(row.endMileage);
      if (startVal > 0) {
        startMileage = startMileage == null ? startVal : Math.min(startMileage, startVal);
      }
      endMileage = Math.max(endMileage, endVal);

      // SUM volumes
      totalRefuelsVolume += num(row.refuelsVolume);
      consumptionVolume += num(row.consumptionVolume);
      totalTravelsDistance += num(row.travelsDistance);

      // MIN/MAX dates
      firstRecordAt = minDate(firstRecordAt, row.firstRecordAt);
      lastRecordAt = maxDate(lastRecordAt, row.lastRecordAt);

      // Build monetary entry for this currency
      monetary.push({
        carId,
        year,
        month,
        currency: row.homeCurrency,
        refuelsCost: numOrNull(row.refuelsCost),
        refuelsTaxes: numOrNull(row.refuelTaxes),
        expensesCost: numOrNull(row.expensesCost),
        expensesFees: numOrNull(row.expensesFees),
        expensesTaxes: numOrNull(row.expensesTaxes),
        maintenanceCost: numOrNull(row.maintenanceCost),
        revenuesAmount: numOrNull(row.revenuesAmount),
      });
    }

    stats.firstRecordAt = formatTimestamp(firstRecordAt);
    stats.lastRecordAt = formatTimestamp(lastRecordAt);

    // For monthly stats, consumption distance = end - start mileage
    const consumptionDistance = startMileage != null && endMileage > 0 ? endMileage - startMileage : null;

    const metricValues: MetricValues = {
      firstOdometer: startMileage,
      lastOdometer: endMileage || null,
      travelsDistance: totalTravelsDistance || null,
      firstRefuelOdometer: null, // Not tracked per month
      consumptionDistance,
      refuelsVolume: totalRefuelsVolume || null,
      firstRefuelVolume: null, // Not tracked per month
      consumptionVolume: consumptionVolume || null,
    };

    return { stats, monetary, metricValues };
  }

  // ===========================================================================
  // Averages Computation
  // ===========================================================================

  /**
   * Compute rolling averages from monthly summary rows for a single car.
   * Monetary values are filtered to home currency only.
   * Non-monetary values are aggregated across all currency rows.
   *
   * NOTE: Months with zero odometer distance (start_mileage == end_mileage)
   * are excluded from consumption calculations because they don't have
   * meaningful consumption data — they typically represent months with a
   * single refuel and no other records.
   */
  private computeAverages(
    monthlyRows: any[],
    carId: string,
    homeCurrency: string,
    avgMonths: number,
    car: any,
    userProfile: UserProfile,
  ): DashboardAverages {
    if (monthlyRows.length === 0) {
      return this.buildEmptyAverages(homeCurrency);
    }

    // Group rows by year-month to identify unique months
    const monthGroups = new Map<string, any[]>();

    for (const row of monthlyRows) {
      const key = `${row.year}-${row.month}`;
      if (!monthGroups.has(key)) {
        monthGroups.set(key, []);
      }
      monthGroups.get(key)!.push(row);
    }

    const monthsCount = monthGroups.size;

    if (monthsCount === 0) {
      return this.buildEmptyAverages(homeCurrency);
    }

    // Aggregate across months
    let totalExpense = 0;
    let totalRevenue = 0;
    let totalRefuelsVolume = 0;
    let totalMileageKm = 0;
    let totalConsumptionDistance = 0;
    let totalConsumptionVolume = 0;
    let consumptionMonthsCount = 0;
    let hasMonetaryData = false;

    for (const [, rows] of monthGroups) {
      // Non-monetary: aggregate across all currency rows for this month
      let monthStartMileage: number | null = null;
      let monthEndMileage = 0;
      // Use max to avoid double-counting physical values across currency rows
      let monthRefuelsVolume = 0;
      let monthConsumptionVolume = 0;

      for (const row of rows) {
        const startVal = num(row.startMileage);
        const endVal = num(row.endMileage);
        if (startVal > 0) {
          monthStartMileage = monthStartMileage == null ? startVal : Math.min(monthStartMileage, startVal);
        }
        monthEndMileage = Math.max(monthEndMileage, endVal);

        // Physical values are identical across currency rows — take max to avoid double-counting
        monthRefuelsVolume = Math.max(monthRefuelsVolume, num(row.refuelsVolume));
        monthConsumptionVolume = Math.max(monthConsumptionVolume, num(row.consumptionVolume));
      }

      totalRefuelsVolume += monthRefuelsVolume;

      if (monthStartMileage != null && monthEndMileage > 0) {
        const monthDistance = monthEndMileage - monthStartMileage;
        totalMileageKm += monthDistance;

        // Only include in consumption calc if there's actual distance driven.
        // Months with zero distance (e.g., single refuel, no other records)
        // would skew the consumption average with volume but no distance.
        if (monthDistance > 0) {
          totalConsumptionDistance += monthDistance;
          totalConsumptionVolume += monthConsumptionVolume;
          consumptionMonthsCount++;
        }
      }

      // Monetary: only home currency rows
      const homeCurrencyRows = rows.filter((r: any) => r.homeCurrency === homeCurrency);

      for (const row of homeCurrencyRows) {
        const expense = num(row.refuelsCost) + num(row.expensesCost);
        totalExpense += expense;
        totalRevenue += num(row.revenuesAmount);
        hasMonetaryData = true;
      }
    }

    // Unit preferences for conversions
    const carDistanceUnit = car?.mileageIn || 'km';
    const userDistanceUnit = userProfile?.distanceIn || 'km';
    const userVolumeUnit = userProfile?.volumeIn || 'l';
    const userConsumptionUnit = userProfile?.consumptionIn || 'l100km';

    const avgMileageKm = totalMileageKm / monthsCount;

    return {
      currency: homeCurrency,
      monthsCount,
      monthlyExpense: hasMonetaryData ? totalExpense / monthsCount : null,
      monthlyRevenue: hasMonetaryData ? totalRevenue / monthsCount : null,
      monthlyRefuelsVolume: totalRefuelsVolume > 0
        ? fromMetricVolume(totalRefuelsVolume / monthsCount, userVolumeUnit)
        : null,
      monthlyMileageInCarUnits: totalMileageKm > 0
        ? fromMetricDistance(avgMileageKm, carDistanceUnit)
        : null,
      monthlyMileageInUserUnits: totalMileageKm > 0
        ? fromMetricDistance(avgMileageKm, userDistanceUnit)
        : null,
      monthlyConsumption:
        totalConsumptionDistance > 0 && totalConsumptionVolume > 0
          ? calculateConsumption(
            totalConsumptionDistance / consumptionMonthsCount,
            totalConsumptionVolume / consumptionMonthsCount,
            userConsumptionUnit,
          )
          : null,
    };
  }

  // ===========================================================================
  // Year-Month Helpers
  // ===========================================================================

  /**
   * Generate an array of {year, month} pairs for the last N months before the given month.
   * Excludes the current month itself.
   */
  private getLastNMonthPairs(
    currentYear: number,
    currentMonth: number,
    count: number,
  ): Array<{ year: number; month: number }> {
    const pairs: Array<{ year: number; month: number }> = [];
    let y = currentYear;
    let m = currentMonth;

    for (let i = 0; i < count; i++) {
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
      pairs.push({ year: y, month: m });
    }

    return pairs;
  }

  /**
   * Get the previous month from a given year/month.
   */
  private getPreviousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  // ===========================================================================
  // Main Get Method
  // ===========================================================================

  public async get(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: validators.get,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const params = args?.params || {};
        const { accountId } = this.getContext();

        // =====================================================================
        // 1. Apply defaults
        // =====================================================================

        const timezoneOffset = params.timezoneOffset ?? 0;
        const avgMonths = params.avgMonths ?? 3;
        const includeCars = params.includeCars ?? true;
        // const includeBreakdowns = params.includeBreakdowns ?? false; // Reserved for future

        // =====================================================================
        // 2. Determine current/previous month from timezone offset
        // =====================================================================

        // JS getTimezoneOffset() returns positive for west of UTC, negative for east
        // e.g., EST (UTC-5) returns 300, IST (UTC+5:30) returns -330
        const userNow = dayjs.utc().subtract(timezoneOffset, 'minute');
        const currentYear = userNow.year();
        const currentMonth = userNow.month() + 1; // dayjs months are 0-based
        const daysInMonth = userNow.daysInMonth();
        const daysRemainingInMonth = daysInMonth - userNow.date();

        const { year: prevYear, month: prevMonth } = this.getPreviousMonth(currentYear, currentMonth);

        // =====================================================================
        // 3. Resolve accessible car IDs and fetch cars
        // =====================================================================

        const accessibleCarIds = await this.filterAccessibleCarIds(params.carIds);

        // Always fetch cars — needed for unit conversions even when includeCars=false
        const carFilter: any = { accountId, status: [CAR_STATUSES.ACTIVE] };
        if (accessibleCarIds) {
          carFilter.id = accessibleCarIds;
        }

        const carsResult = await this.getGateways().carGw.list({ filter: carFilter });
        const cars = carsResult.data || carsResult || [];

        if (cars.length === 0) {
          return this.success([]);
        }

        const carsMap = new Map<string, any>();
        const carIds: string[] = [];

        for (const car of cars) {
          carsMap.set(car.id, car);
          carIds.push(car.id);
        }

        // =====================================================================
        // 4. Fetch user profile
        // =====================================================================

        const userProfile = await this.getCurrentUserProfile();
        const homeCurrency = userProfile.homeCurrency || 'USD';

        // =====================================================================
        // 5. Batch fetch total summaries
        // =====================================================================

        const totalSummariesResult = await this.getGateways().carTotalSummaryGw.list({
          filter: { carId: carIds, accountId },
        });
        const totalRows: any[] = totalSummariesResult.data || totalSummariesResult || [];

        // Group total rows by carId
        const totalRowsByCarId = new Map<string, any[]>();
        for (const row of totalRows) {
          const cid = row.carId;
          if (!totalRowsByCarId.has(cid)) {
            totalRowsByCarId.set(cid, []);
          }
          totalRowsByCarId.get(cid)!.push(row);
        }

        // =====================================================================
        // 6. Batch fetch monthly summaries (current + previous + avg window)
        // =====================================================================

        // Build year-month pairs: current + previous + last N for averages
        const avgPairs = this.getLastNMonthPairs(currentYear, currentMonth, avgMonths);
        const allPairs = [
          { year: currentYear, month: currentMonth },
          { year: prevYear, month: prevMonth },
          ...avgPairs,
        ];

        // Deduplicate pairs (previous month is likely in avgPairs too)
        const pairSet = new Set<string>();
        const uniquePairs: Array<{ year: number; month: number }> = [];
        for (const pair of allPairs) {
          const key = `${pair.year}-${pair.month}`;
          if (!pairSet.has(key)) {
            pairSet.add(key);
            uniquePairs.push(pair);
          }
        }

        const monthlyRows: any[] = await this.getGateways().carMonthlySummaryGw.listByYearMonthPairs(
          carIds,
          accountId,
          uniquePairs,
        );

        // Group monthly rows by carId -> year-month key
        const monthlyByCarAndPeriod = new Map<string, Map<string, any[]>>();
        for (const row of monthlyRows) {
          const cid = row.carId;
          if (!monthlyByCarAndPeriod.has(cid)) {
            monthlyByCarAndPeriod.set(cid, new Map());
          }
          const periodMap = monthlyByCarAndPeriod.get(cid)!;
          const periodKey = `${row.year}-${row.month}`;
          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, []);
          }
          periodMap.get(periodKey)!.push(row);
        }

        // =====================================================================
        // 7. Assemble dashboard items per car
        // =====================================================================

        const dashboardItems: DashboardItem[] = [];

        for (const carId of carIds) {
          const car = carsMap.get(carId);

          // --- Total stats ---
          const carTotalRows = totalRowsByCarId.get(carId) || [];
          const { stats: totalStats, monetary: totalMonetary, metricValues: totalMetric } =
            this.aggregateTotalSummaries(carTotalRows, carId);
          this.applyUnitConversions(totalStats, totalMetric, car, userProfile);

          // --- Current month stats ---
          const currentMonthKey = `${currentYear}-${currentMonth}`;
          const carCurrentMonthRows = monthlyByCarAndPeriod.get(carId)?.get(currentMonthKey) || [];
          const { stats: currentMonthStats, monetary: currentMonthMonetary, metricValues: currentMetric } =
            this.aggregateMonthlySummaries(carCurrentMonthRows, carId, currentYear, currentMonth);
          this.applyUnitConversions(currentMonthStats, currentMetric, car, userProfile);

          // --- Previous month stats ---
          const prevMonthKey = `${prevYear}-${prevMonth}`;
          const carPrevMonthRows = monthlyByCarAndPeriod.get(carId)?.get(prevMonthKey) || [];
          const { stats: previousMonthStats, monetary: previousMonthMonetary, metricValues: prevMetric } =
            this.aggregateMonthlySummaries(carPrevMonthRows, carId, prevYear, prevMonth);
          this.applyUnitConversions(previousMonthStats, prevMetric, car, userProfile);

          // --- Averages ---
          // Collect all monthly rows for this car within the avg window (excludes current month)
          const avgMonthlyRows: any[] = [];
          for (const pair of avgPairs) {
            const pKey = `${pair.year}-${pair.month}`;
            const rows = monthlyByCarAndPeriod.get(carId)?.get(pKey) || [];
            avgMonthlyRows.push(...rows);
          }
          const averages = this.computeAverages(avgMonthlyRows, carId, homeCurrency, avgMonths, car, userProfile);

          // --- Build dashboard item ---
          dashboardItems.push({
            carId,
            car: includeCars ? car : null,
            totalStats,
            totalMonetary,
            currentMonthStats,
            currentMonthMonetary,
            previousMonthStats,
            previousMonthMonetary,
            averages,
            daysRemainingInMonth,
          });
        }

        return this.success(dashboardItems);
      },
      hasTransaction: false,
      doingWhat: 'getting dashboard data',
    });
  }

  // ===========================================================================
  // Fleet Summary — aggregated across all vehicles for a requested month
  // ===========================================================================

  public async getFleetSummary(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: validators.getFleetSummary,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const params = args?.params || {};
        const { accountId } = this.getContext();

        // =====================================================================
        // 1. Determine requested month
        // =====================================================================

        const timezoneOffset = params.timezoneOffset ?? 0;
        const userNow = dayjs.utc().subtract(timezoneOffset, 'minute');

        const year = params.year ?? userNow.year();
        const month = params.month ?? (userNow.month() + 1);

        // =====================================================================
        // 2. Fetch all active car IDs (no specific carIds filter for fleet)
        // =====================================================================

        const carFilter: any = { accountId, status: [CAR_STATUSES.ACTIVE] };
        const carsResult = await this.getGateways().carGw.list({ filter: carFilter });
        const cars = carsResult.data || carsResult || [];

        if (cars.length === 0) {
          return this.success(this.buildEmptyFleetSummary(year, month, 'USD', 'km', 'l'));
        }

        const carIds: string[] = cars.map((car: any) => car.id);

        // =====================================================================
        // 3. Fetch user profile
        // =====================================================================

        const userProfile = await this.getCurrentUserProfile();
        const homeCurrency = userProfile.homeCurrency || 'USD';
        const userDistanceUnit = userProfile?.distanceIn || 'km';
        const userVolumeUnit = userProfile?.volumeIn || 'l';

        // =====================================================================
        // 4. Fetch monthly summaries for the requested month
        // =====================================================================

        const monthlyRows: any[] = await this.getGateways().carMonthlySummaryGw.listByYearMonthPairs(
          carIds,
          accountId,
          [{ year, month }],
        );

        // =====================================================================
        // 5. Fetch min year/month for navigation bounds
        // =====================================================================

        const minPeriod = await this.getGateways().carMonthlySummaryGw.getMinYearMonth(
          carIds,
          accountId,
        );

        const minYear = minPeriod?.minYear ?? year;
        const minMonth = minPeriod?.minMonth ?? month;

        // =====================================================================
        // 6. Aggregate across all cars
        // =====================================================================

        let refuelsCost = 0;
        let maintenanceCost = 0;
        let otherExpensesCost = 0;
        let revenuesAmount = 0;
        let refuelsCount = 0;
        let maintenanceCount = 0;
        let otherExpensesCount = 0;
        let revenuesCount = 0;
        let totalRefuelsVolumeMetric = 0;
        let totalDistanceMetric = 0;

        // Group rows by carId to aggregate per-car odometer distances correctly
        const rowsByCarId = new Map<string, any[]>();
        for (const row of monthlyRows) {
          const cid = row.carId;
          if (!rowsByCarId.has(cid)) {
            rowsByCarId.set(cid, []);
          }
          rowsByCarId.get(cid)!.push(row);
        }

        for (const [, carRows] of rowsByCarId) {
          // Per-car: find min start / max end mileage across currency rows
          let carStartMileage: number | null = null;
          let carEndMileage = 0;

          // Physical values are identical across currency rows for the same car.
          // Use max to avoid double-counting when multiple currency rows exist.
          let carRefuelsCount = 0;
          let carMaintenanceCount = 0;
          let carExpensesCount = 0;
          let carRevenuesCount = 0;
          let carRefuelsVolume = 0;

          for (const row of carRows) {
            // Counts: take max across currency rows (they're duplicated)
            carRefuelsCount = Math.max(carRefuelsCount, num(row.refuelsCount));
            carMaintenanceCount = Math.max(carMaintenanceCount, num(row.maintenanceCount));
            carExpensesCount = Math.max(carExpensesCount, num(row.expensesCount));
            carRevenuesCount = Math.max(carRevenuesCount, num(row.revenuesCount));

            // Physical values: take max across currency rows
            carRefuelsVolume = Math.max(carRefuelsVolume, num(row.refuelsVolume));

            const startVal = num(row.startMileage);
            const endVal = num(row.endMileage);
            if (startVal > 0) {
              carStartMileage = carStartMileage == null ? startVal : Math.min(carStartMileage, startVal);
            }
            carEndMileage = Math.max(carEndMileage, endVal);

            // Monetary (sum all — already in home currency from the view)
            refuelsCost += num(row.refuelsCost) + num(row.refuelTaxes);
            maintenanceCost += num(row.maintenanceCost);
            otherExpensesCost += num(row.expensesCost) + num(row.expensesFees) + num(row.expensesTaxes);
            revenuesAmount += num(row.revenuesAmount);
          }

          // Accumulate deduplicated counts
          refuelsCount += carRefuelsCount;
          maintenanceCount += carMaintenanceCount;
          otherExpensesCount += carExpensesCount;
          revenuesCount += carRevenuesCount;
          totalRefuelsVolumeMetric += carRefuelsVolume;

          // Add this car's distance
          if (carStartMileage != null && carEndMileage > 0 && carEndMileage > carStartMileage) {
            totalDistanceMetric += carEndMileage - carStartMileage;
          }
        }

        // =====================================================================
        // 7. Convert physical values to user units
        // =====================================================================

        const refuelsVolume = fromMetricVolume(totalRefuelsVolumeMetric, userVolumeUnit) || 0;
        const totalDistance = fromMetricDistance(totalDistanceMetric, userDistanceUnit) || 0;

        const totalCost = refuelsCost + maintenanceCost + otherExpensesCost;

        const fuelCostPerDistance = totalDistance > 0 ? refuelsCost / totalDistance : null;
        const runningCostPerDistance = totalDistance > 0 ? totalCost / totalDistance : null;

        // =====================================================================
        // 8. Build result
        // =====================================================================

        const result: FleetSummary = {
          year,
          month,
          currency: homeCurrency,
          distanceUnit: userDistanceUnit,
          volumeUnit: userVolumeUnit,
          refuelsCost,
          maintenanceCost,
          otherExpensesCost,
          totalCost,
          revenuesAmount,
          refuelsCount,
          maintenanceCount,
          otherExpensesCount,
          revenuesCount,
          refuelsVolume,
          totalDistance,
          fuelCostPerDistance,
          runningCostPerDistance,
          minYear,
          minMonth,
        };

        return this.success(result);
      },
      hasTransaction: false,
      doingWhat: 'getting fleet summary',
    });
  }

  // ===========================================================================
  // Empty Fleet Summary Builder
  // ===========================================================================

  private buildEmptyFleetSummary(
    year: number,
    month: number,
    currency: string,
    distanceUnit: string,
    volumeUnit: string,
  ): FleetSummary {
    return {
      year,
      month,
      currency,
      distanceUnit,
      volumeUnit,
      refuelsCost: 0,
      maintenanceCost: 0,
      otherExpensesCost: 0,
      totalCost: 0,
      revenuesAmount: 0,
      refuelsCount: 0,
      maintenanceCount: 0,
      otherExpensesCount: 0,
      revenuesCount: 0,
      refuelsVolume: 0,
      totalDistance: 0,
      fuelCostPerDistance: null,
      runningCostPerDistance: null,
      minYear: year,
      minMonth: month,
    };
  }
}

export { DashboardCore };