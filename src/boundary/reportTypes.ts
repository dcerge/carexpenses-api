// ./src/boundary/reportTypes.ts
export interface CurrencyAmountRaw {
  currency: string;
  amount: number;
  recordsCount: number;
}

export interface CategoryBreakdownRaw {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  totalAmountHc: number;
  recordsCountHc: number;
  foreignCurrencies: CurrencyAmountRaw[];
}

export interface KindBreakdownRaw {
  kindId: number;
  kindCode: string;
  kindName: string;
  categoryId: number;
  categoryCode: string;
  totalAmountHc: number;
  recordsCountHc: number;
  foreignCurrencies: CurrencyAmountRaw[];
}

export interface ExpenseSummaryRawData {
  // HC totals
  totalCostHc: number;
  refuelsCostHc: number;
  expensesCostHc: number;
  refuelsCountHc: number;
  expensesCountHc: number;

  // Foreign totals
  foreignCurrencyTotals: CurrencyAmountRaw[];
  foreignRefuels: CurrencyAmountRaw[];
  foreignExpenses: CurrencyAmountRaw[];

  // Fuel (all refuels)
  totalVolumeLiters: number;
  consumableVolumeLiters: number;
  refuelsCount: number;

  // Mileage (all records)
  minOdometerKm: number | null;
  maxOdometerKm: number | null;

  // Counts
  expensesCount: number;
  totalRecordsCount: number;
  vehiclesCount: number;

  // Breakdowns
  byCategory: CategoryBreakdownRaw[];
  byKind: KindBreakdownRaw[];
}

export interface GetDataParams {
  accountId: string;
  carIds: string[];
  tagIds: string[];
  dateFrom: string;
  dateTo: string;
  lang?: string; // ISO 639-1 language code, defaults to 'en'
}

// =============================================================================
// Yearly Report Types
// =============================================================================

/**
 * Parameters for yearly report gateway
 */
export interface GetYearlyDataParams {
  accountId: string;
  carIds: string[];
  year: number;
}

/**
 * Raw monthly breakdown data from gateway (in metric units, HC currency + foreign)
 */
export interface MonthlyBreakdownRaw {
  month: number;

  // HC totals
  refuelsCostHc: number;
  expensesCostHc: number;
  refuelsCountHc: number;
  expensesCountHc: number;

  // Fuel & mileage (tracked regardless of currency)
  refuelsVolumeLiters: number;
  startMileageKm: number | null;
  endMileageKm: number | null;

  // Foreign currency breakdowns
  foreignRefuels: CurrencyAmountRaw[];
  foreignExpenses: CurrencyAmountRaw[];
  foreignCurrencyTotals: CurrencyAmountRaw[];
  totalForeignRecordsCount: number;

  // Total counts (HC + foreign)
  refuelsCount: number;
  expensesCount: number;
}

/**
 * Complete raw data returned by yearly report gateway
 */
export interface YearlyReportRawData {
  year: number;
  months: MonthlyBreakdownRaw[];
  vehiclesCount: number;
}
