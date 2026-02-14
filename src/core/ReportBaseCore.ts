// ./src/core/ReportBaseCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { CurrencyAmountRaw, CarOdometerRangeRaw } from '../boundary';
import { AppCore } from './AppCore';

dayjs.extend(utc);

/**
 * Base Report Core with shared utility methods used across all report cores.
 *
 * ReportCore and ReportProfitabilityCore (and future report cores) should
 * extend this class and gradually migrate their duplicated helpers here.
 */
class ReportBaseCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super(props);
  }

  // ===========================================================================
  // Rounding
  // ===========================================================================

  protected roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  protected roundToThreeDecimals(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  // ===========================================================================
  // Division & Percentage
  // ===========================================================================

  /**
   * Safe division returning 0 when divisor is 0 or value is null
   */
  protected safeDivide(value: number | null, divisor: number): number {
    if (value === null || divisor <= 0) {
      return 0;
    }
    return value / divisor;
  }

  /**
   * Calculate percentage, returns 0 if total is 0
   */
  protected calculatePercentage(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return (value / total) * 100;
  }

  // ===========================================================================
  // Period
  // ===========================================================================

  /**
   * Calculate number of days in the period (inclusive)
   */
  protected calculatePeriodDays(dateFrom: string, dateTo: string): number {
    const from = dayjs.utc(dateFrom);
    const to = dayjs.utc(dateTo);
    return to.diff(from, 'day') + 1;
  }

  // ===========================================================================
  // Currency Amounts
  // ===========================================================================

  /**
   * Transform currency amounts with rounding
   */
  protected transformCurrencyAmounts(amounts: CurrencyAmountRaw[]): any[] {
    return amounts.map((item) => ({
      currency: item.currency,
      amount: this.roundToTwoDecimals(item.amount),
      recordsCount: item.recordsCount,
    }));
  }

  /**
   * Sum records count from currency amounts array
   */
  protected sumRecordsCount(amounts: CurrencyAmountRaw[]): number {
    return amounts.reduce((sum, item) => sum + item.recordsCount, 0);
  }

  // ===========================================================================
  // Distance
  // ===========================================================================

  /**
   * Calculate total distance from odometer ranges (sum of max - min per car)
   */
  protected calculateTotalDistanceFromOdometers(ranges: CarOdometerRangeRaw[]): number {
    let totalKm = 0;
    for (const range of ranges) {
      if (range.minOdometerKm != null && range.maxOdometerKm != null) {
        totalKm += Math.max(0, range.maxOdometerKm - range.minOdometerKm);
      }
    }
    return totalKm;
  }
}

export { ReportBaseCore };