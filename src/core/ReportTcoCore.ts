// ./src/core/ReportTcoCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/reportTcoValidators';
import { fromMetricDistance } from '../utils/unitConversions';
import { UserProfile, CAR_STATUSES } from '../boundary';

dayjs.extend(utc);

// =============================================================================
// Interfaces
// =============================================================================

interface TcoCategoryBreakdown {
  categoryCode: string;
  categoryName: string | null;
  totalCost: number | null;
  recordsCount: number;
  sharePercent: number | null;
  perMonth: number | null;
  perDistance: number | null;
}

interface TcoMonthlyPoint {
  year: number;
  month: number;
  totalCost: number | null;
  refuelsCost: number | null;
  expensesCost: number | null;
}

interface TcoReport {
  carId: string;
  ownershipStartAt: string | null;
  monthsOwned: number;
  totalCost: number | null;
  perMonth: number | null;
  perDistance: number | null;
  categories: TcoCategoryBreakdown[];
  monthlyTrend: TcoMonthlyPoint[];
}

// =============================================================================
// Helpers
// =============================================================================

function num(val: any): number {
  return val != null ? Number(val) || 0 : 0;
}

function formatTimestamp(val: any): string | null {
  if (val == null) return null;
  return dayjs(val).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
}

// =============================================================================
// ReportTcoCore
// =============================================================================

class ReportTcoCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      name: 'ReportTco',
      hasOrderNo: false,
      doAuth: true,
    });
  }

  // ===========================================================================
  // Ownership Start & Months Owned
  // ===========================================================================

  /**
   * Resolve the ownership start date for a car using the priority:
   *   1. car.whenBought  (user-entered purchase date)
   *   2. firstRecordAt   (earliest expense/refuel from total summaries)
   *   3. car.createdAt   (fallback: when the car was added)
   */
  private resolveOwnershipStart(car: any, firstRecordAt: string | null): string | null {
    return car?.whenBought || firstRecordAt || car?.createdAt || null;
  }

  /**
   * Calculate full calendar months elapsed from ownershipStart to now.
   * Minimum 1 to avoid division-by-zero on perMonth calculations.
   */
  private calcMonthsOwned(ownershipStartRaw: any, nowUtc: dayjs.Dayjs): number {
    if (!ownershipStartRaw) return 1;
    const startDay = dayjs(ownershipStartRaw).utc();
    const diff = nowUtc.diff(startDay, 'month');
    return Math.max(1, diff);
  }

  // ===========================================================================
  // Per-distance helper
  // ===========================================================================

  /**
   * Calculate cost per distance unit driven.
   * Driven distance = latestKnownMileage (metric km) - initialMileage converted to km.
   * Result is in the user's distanceIn unit.
   */
  private calcPerDistance(
    totalCost: number,
    car: any,
    latestKnownMileageKm: number,
    userDistanceUnit: string,
  ): number | null {
    const carDistanceUnit = car?.mileageIn || 'km';
    const initialMileageKm =
      carDistanceUnit === 'mi'
        ? num(car?.initialMileage) * 1.60934
        : num(car?.initialMileage);

    const drivenKm = latestKnownMileageKm - initialMileageKm;
    if (drivenKm <= 0) return null;

    const drivenInUserUnit = fromMetricDistance(drivenKm, userDistanceUnit);
    if (!drivenInUserUnit || drivenInUserUnit <= 0) return null;

    return totalCost / drivenInUserUnit;
  }

  // ===========================================================================
  // Year-Month Pair Generation
  // ===========================================================================

  /**
   * Generate the last N month pairs ending at (currentYear, currentMonth),
   * inclusive of the current month, ordered oldest-first.
   */
  private buildTrendMonthPairs(
    currentYear: number,
    currentMonth: number,
    count: number,
  ): Array<{ year: number; month: number }> {
    const pairs: Array<{ year: number; month: number }> = [];
    let y = currentYear;
    let m = currentMonth;

    // Build from current month backwards, then reverse for oldest-first order
    for (let i = 0; i < count; i++) {
      pairs.push({ year: y, month: m });
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
    }

    return pairs.reverse();
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
        const lang = params.lang || 'en';
        const trendMonths = Math.max(1, params.trendMonths ?? 24);

        // =====================================================================
        // 2. Determine current month from timezone offset
        // =====================================================================

        const userNow = dayjs.utc().subtract(timezoneOffset, 'minute');
        const currentYear = userNow.year();
        const currentMonth = userNow.month() + 1;

        // =====================================================================
        // 3. Resolve accessible car IDs and fetch cars
        // =====================================================================

        const accessibleCarIds = await this.filterAccessibleCarIds(params.carIds);

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
        const userDistanceUnit = userProfile.distanceIn || 'km';

        // =====================================================================
        // 5. Batch fetch total summaries (for lifetime totals + odometer)
        // =====================================================================

        const totalSummariesResult = await this.getGateways().carTotalSummaryGw.list({
          filter: { carId: carIds, accountId },
        });
        const totalRows: any[] = totalSummariesResult.data || totalSummariesResult || [];

        // Group by carId
        const totalRowsByCarId = new Map<string, any[]>();
        for (const row of totalRows) {
          const cid = row.carId;
          if (!totalRowsByCarId.has(cid)) totalRowsByCarId.set(cid, []);
          totalRowsByCarId.get(cid)!.push(row);
        }

        // =====================================================================
        // 6. Batch fetch category breakdowns for all cars
        // =====================================================================

        const categoryRows = await this.getGateways().carTotalExpenseGw.listByCategoryForCars(
          carIds,
          accountId,
          lang,
        );

        // Group by carId
        const categoryRowsByCarId = new Map<string, typeof categoryRows>();
        for (const row of categoryRows) {
          if (!categoryRowsByCarId.has(row.carId)) categoryRowsByCarId.set(row.carId, []);
          categoryRowsByCarId.get(row.carId)!.push(row);
        }

        // =====================================================================
        // 7. Batch fetch monthly summaries for the trend window
        // =====================================================================

        const trendPairs = this.buildTrendMonthPairs(currentYear, currentMonth, trendMonths);

        const monthlyRows: any[] = await this.getGateways().carMonthlySummaryGw.listByYearMonthPairs(
          carIds,
          accountId,
          trendPairs,
        );

        // Group by carId → year-month key
        const monthlyByCarAndPeriod = new Map<string, Map<string, any[]>>();
        for (const row of monthlyRows) {
          const cid = row.carId;
          if (!monthlyByCarAndPeriod.has(cid)) monthlyByCarAndPeriod.set(cid, new Map());
          const periodMap = monthlyByCarAndPeriod.get(cid)!;
          const key = `${row.year}-${row.month}`;
          if (!periodMap.has(key)) periodMap.set(key, []);
          periodMap.get(key)!.push(row);
        }

        // =====================================================================
        // 8. Assemble TcoReport per car
        // =====================================================================

        const reports: TcoReport[] = [];

        for (const carId of carIds) {
          const car = carsMap.get(carId);
          const carTotalRows = totalRowsByCarId.get(carId) || [];

          // -------------------------------------------------------------------
          // 8a. Lifetime monetary totals (home currency rows only)
          // -------------------------------------------------------------------

          let totalRefuelsCost = 0;
          let totalExpensesCost = 0;
          let totalRefuelsCount = 0;
          let latestKnownMileageKm = 0;
          let firstRecordAt: string | null = null;
          let hasMonetaryData = false;

          for (const row of carTotalRows) {
            // Latest known mileage: max across all currency rows
            latestKnownMileageKm = Math.max(latestKnownMileageKm, num(row.latestKnownMileage));

            // First record date: min across all currency rows
            if (row.firstRecordAt) {
              firstRecordAt = firstRecordAt == null
                ? row.firstRecordAt
                : (row.firstRecordAt < firstRecordAt ? row.firstRecordAt : firstRecordAt);
            }

            // Monetary: sum all — values are already expressed in home currency
            const rc = num(row.totalRefuelsCost);
            const ec = num(row.totalExpensesCost);
            if (rc > 0 || ec > 0) hasMonetaryData = true;
            totalRefuelsCost += rc;
            totalExpensesCost += ec;
            totalRefuelsCount += num(row.totalRefuelsCount);
          }

          const totalCost = hasMonetaryData ? totalRefuelsCost + totalExpensesCost : null;

          // -------------------------------------------------------------------
          // 8b. Ownership timeline
          // -------------------------------------------------------------------

          const ownershipStartRaw = this.resolveOwnershipStart(car, firstRecordAt);
          const ownershipStartAt = formatTimestamp(ownershipStartRaw);
          const monthsOwned = this.calcMonthsOwned(ownershipStartRaw, userNow);

          // -------------------------------------------------------------------
          // 8c. Top-level per-month and per-distance
          // -------------------------------------------------------------------

          const perMonth = totalCost != null ? totalCost / monthsOwned : null;
          const perDistance = totalCost != null
            ? this.calcPerDistance(totalCost, car, latestKnownMileageKm, userDistanceUnit)
            : null;

          // -------------------------------------------------------------------
          // 8d. Category breakdowns
          // -------------------------------------------------------------------

          const carCategoryRows = categoryRowsByCarId.get(carId) || [];

          // Aggregate across currency rows: for each category, sum amount and
          // records_count across all home_currency rows (already in home currency).
          // Use a Map keyed by categoryCode to merge currency rows.
          const categoryMap = new Map<string, {
            categoryCode: string;
            categoryName: string | null;
            totalAmount: number;
            totalRecordsCount: number;
          }>();

          for (const row of carCategoryRows) {
            const existing = categoryMap.get(row.categoryCode);
            if (existing) {
              existing.totalAmount += row.totalAmount;
              existing.totalRecordsCount += row.totalRecordsCount;
            } else {
              categoryMap.set(row.categoryCode, {
                categoryCode: row.categoryCode,
                categoryName: row.categoryName,
                totalAmount: row.totalAmount,
                totalRecordsCount: row.totalRecordsCount,
              });
            }
          }

          // Also add a synthetic FUEL category from total_refuels_cost if
          // refuels are not represented in car_total_expenses (refuels are
          // stored separately from expenses in the summary tables).
          // Only add if there is no existing FUEL category row from expenses.
          if (totalRefuelsCost > 0 && !categoryMap.has('FUEL')) {
            categoryMap.set('FUEL', {
              categoryCode: 'FUEL',
              categoryName: lang === 'fr' ? 'Carburant'
                : lang === 'ru' ? 'Топливо'
                  : lang === 'es' ? 'Combustible'
                    : 'Fuel',
              totalAmount: totalRefuelsCost,
              totalRecordsCount: totalRefuelsCount, // count not available from total summaries
            });
          } else if (totalRefuelsCost > 0 && categoryMap.has('FUEL')) {
            // Merge refuels cost into the existing FUEL category
            const fuelEntry = categoryMap.get('FUEL')!;
            fuelEntry.totalAmount += totalRefuelsCost;
            fuelEntry.totalRecordsCount += totalRefuelsCount;
          }

          // Build breakdown objects with share and per-* values
          const categories: TcoCategoryBreakdown[] = Array.from(categoryMap.values()).map((entry) => {
            const catCost = entry.totalAmount > 0 ? entry.totalAmount : null;
            const sharePercent = totalCost && totalCost > 0 && catCost != null
              ? (catCost / totalCost) * 100
              : null;
            const catPerMonth = catCost != null ? catCost / monthsOwned : null;
            const catPerDistance = catCost != null
              ? this.calcPerDistance(catCost, car, latestKnownMileageKm, userDistanceUnit)
              : null;

            return {
              categoryCode: entry.categoryCode,
              categoryName: entry.categoryName,
              totalCost: catCost,
              recordsCount: entry.totalRecordsCount,
              sharePercent,
              perMonth: catPerMonth,
              perDistance: catPerDistance,
            };
          });

          // Sort by share descending (highest cost category first)
          categories.sort((a, b) => (b.sharePercent ?? 0) - (a.sharePercent ?? 0));

          // -------------------------------------------------------------------
          // 8e. Monthly trend
          // -------------------------------------------------------------------

          const monthlyTrend: TcoMonthlyPoint[] = [];
          const carPeriodMap = monthlyByCarAndPeriod.get(carId);

          for (const pair of trendPairs) {
            const periodKey = `${pair.year}-${pair.month}`;
            const periodRows = carPeriodMap?.get(periodKey) || [];

            if (periodRows.length === 0) {
              // Include zero point so the trend chart has a continuous x-axis
              monthlyTrend.push({
                year: pair.year,
                month: pair.month,
                totalCost: null,
                refuelsCost: null,
                expensesCost: null,
              });
              continue;
            }

            // Aggregate across currency rows for this month.
            // Monetary values are already in home currency — sum them.
            let monthRefuelsCost = 0;
            let monthExpensesCost = 0;
            let monthHasData = false;

            for (const row of periodRows) {
              const rc = num(row.refuelsCost);
              const ec = num(row.expensesCost);
              if (rc > 0 || ec > 0) monthHasData = true;
              monthRefuelsCost += rc;
              monthExpensesCost += ec;
            }

            monthlyTrend.push({
              year: pair.year,
              month: pair.month,
              totalCost: monthHasData ? monthRefuelsCost + monthExpensesCost : null,
              refuelsCost: monthHasData ? monthRefuelsCost : null,
              expensesCost: monthHasData ? monthExpensesCost : null,
            });
          }

          // -------------------------------------------------------------------
          // 8f. Push report
          // -------------------------------------------------------------------

          reports.push({
            carId,
            ownershipStartAt,
            monthsOwned,
            totalCost,
            perMonth,
            perDistance,
            categories,
            monthlyTrend,
          });
        }

        return this.success(reports);
      },
      hasTransaction: false,
      doingWhat: 'getting TCO report',
    });
  }
}

export { ReportTcoCore };