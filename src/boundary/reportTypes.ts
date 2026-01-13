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
