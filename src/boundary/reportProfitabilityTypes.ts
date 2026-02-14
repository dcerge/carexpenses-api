// ./src/boundary/reports/reportProfitabilityTypes.ts

import { CategoryBreakdownRaw, CurrencyAmountRaw, KindBreakdownRaw } from "./reportTypes";
import { CarOdometerRangeRaw, TripTag } from "./travelReportTypes";

// =============================================================================
// Gateway Raw Types (returned by ReportProfitabilityGw)
// =============================================================================

/**
 * Per-vehicle revenue and expense totals from gateway
 */
export interface ProfitabilityVehicleRaw {
  carId: string;
  revenueHc: number;
  revenueCount: number;
  refuelsCostHc: number;
  refuelsCount: number;
  maintenanceCostHc: number;
  maintenanceCount: number;
  otherExpensesCostHc: number;
  otherExpensesCount: number;
}

/**
 * Monthly revenue/expense data point from gateway
 */
export interface ProfitabilityMonthlyRaw {
  year: number;
  month: number;
  revenueHc: number;
  revenueCount: number;
  refuelsCostHc: number;
  maintenanceCostHc: number;
  otherExpensesCostHc: number;
  /** Distance in km (calculated from odometer ranges) */
  distanceKm: number;
}

/**
 * Revenue breakdown by category from gateway
 */
export interface RevenueCategoryBreakdownRaw {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  totalAmountHc: number;
  recordsCountHc: number;
  foreignCurrencies: CurrencyAmountRaw[];
}

/**
 * Revenue breakdown by kind from gateway
 */
export interface RevenueKindBreakdownRaw {
  kindId: number;
  kindCode: string;
  kindName: string;
  categoryId: number;
  categoryCode: string;
  totalAmountHc: number;
  recordsCountHc: number;
  foreignCurrencies: CurrencyAmountRaw[];
}

/**
 * Trip with linked revenue data from gateway
 */
export interface TripProfitabilityRaw {
  tripId: string;
  carId: string;
  date: Date | null;
  purpose: string;
  destination: string;
  travelType: string;
  distanceKm: number | null;
  isRoundTrip: boolean;
  revenueHc: number;
  revenueCount: number;
  linkedRefuelsHc: number;
  linkedExpensesHc: number;
  tags: TripProfitabilityTagRaw[];
}

export interface TripProfitabilityTagRaw {
  tagId: string;
  tagName: string;
  tagColor: string;
}

/**
 * Complete raw data returned by ReportProfitabilityGw.getData()
 */
export interface ProfitabilityReportRawData {
  vehicleProfitability: ProfitabilityVehicleRaw[];
  monthlyTrend: ProfitabilityMonthlyRaw[];
  revenueByCategory: RevenueCategoryBreakdownRaw[];
  revenueByKind: RevenueKindBreakdownRaw[];
  expensesByCategory: CategoryBreakdownRaw[];
  expensesByKind: KindBreakdownRaw[];
  foreignRevenueTotals: CurrencyAmountRaw[];
  foreignExpenseTotals: CurrencyAmountRaw[];
  carOdometerRanges: CarOdometerRangeRaw[];
  tripsWithRevenue: TripProfitabilityRaw[];
  carIds: string[];
}

// =============================================================================
// Core Output Types (returned by ReportProfitabilityCore to GraphQL)
// =============================================================================

/**
 * Per-vehicle profitability (after unit conversion)
 */
export interface VehicleProfitability {
  carId: string;
  revenueHc: number;
  revenueCount: number;
  refuelsCostHc: number;
  maintenanceCostHc: number;
  otherExpensesCostHc: number;
  totalExpensesHc: number;
  expensesCount: number;
  netProfitHc: number;
  profitMarginPct: number | null;
  distance: number | null;
  profitPerDistance: number | null;
  revenuePerDistance: number | null;
  expensesPerDistance: number | null;
}

/**
 * Monthly trend data point (after unit conversion)
 */
export interface ProfitabilityMonthlyTrend {
  month: number;
  year: number;
  revenueHc: number;
  revenueCount: number;
  refuelsCostHc: number;
  maintenanceCostHc: number;
  otherExpensesCostHc: number;
  totalExpensesHc: number;
  expensesCount: number;
  netProfitHc: number;
  distance: number | null;
  profitPerDistance: number | null;
}

/**
 * Per-trip profitability (after unit conversion)
 */
export interface TripProfitability {
  tripId: string;
  carId: string;
  date: string;
  purpose: string;
  destination: string;
  travelType: string;
  distance: number | null;
  revenueHc: number;
  revenueCount: number;
  linkedRefuelsHc: number;
  linkedExpensesHc: number;
  totalLinkedExpensesHc: number;
  netProfitHc: number;
  profitPerDistance: number | null;
  tags: TripTag[];
}

/**
 * Totals for the per-trip profitability table
 */
export interface TripProfitabilityTotals {
  totalTrips: number;
  totalDistance: number | null;
  totalRevenueHc: number;
  totalLinkedRefuelsHc: number;
  totalLinkedExpensesHc: number;
  totalLinkedAllExpensesHc: number;
  totalNetProfitHc: number;
}

/**
 * Revenue category breakdown (after percentage calculation)
 */
export interface RevenueCategoryBreakdown {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  totalAmountHc: number;
  recordsCount: number;
  percentageOfTotal: number;
  foreignCurrencies: CurrencyAmountRaw[];
  totalForeignRecordsCount: number;
}

/**
 * Revenue kind breakdown (after percentage calculation)
 */
export interface RevenueKindBreakdown {
  kindId: number;
  kindCode: string;
  kindName: string;
  categoryId: number;
  categoryCode: string;
  totalAmountHc: number;
  recordsCount: number;
  percentageOfTotal: number;
  foreignCurrencies: CurrencyAmountRaw[];
  totalForeignRecordsCount: number;
}

/**
 * Break-even analysis
 */
export interface BreakEvenAnalysis {
  avgDailyRevenueHc: number;
  avgDailyExpensesHc: number;
  avgDailyNetProfitHc: number;
  daysToBreakEven: number | null;
  breakEvenDayInPeriod: number | null;
  isProfitable: boolean;
}

/**
 * Complete profitability report (returned to GraphQL)
 */
export interface ProfitabilityReport {
  dateFrom: string;
  dateTo: string;
  periodDays: number;

  // Summary KPIs
  totalRevenueHc: number;
  totalRevenueCount: number;
  totalRefuelsCostHc: number;
  totalMaintenanceCostHc: number;
  totalOtherExpensesCostHc: number;
  totalExpensesHc: number;
  totalExpensesCount: number;
  netProfitHc: number;
  profitMarginPct: number | null;
  avgDailyRevenueHc: number;
  avgDailyExpensesHc: number;
  avgDailyNetProfitHc: number;
  totalDistance: number | null;
  profitPerDistance: number | null;

  // Foreign currency
  foreignRevenueTotals: CurrencyAmountRaw[];
  foreignExpenseTotals: CurrencyAmountRaw[];
  totalForeignRevenueRecordsCount: number;
  totalForeignExpenseRecordsCount: number;

  // Breakdowns
  revenueByCategory: RevenueCategoryBreakdown[];
  revenueByKind: RevenueKindBreakdown[];
  expensesByCategory: any[]; // Reuses ExpenseSummaryByCategory pattern
  expensesByKind: any[]; // Reuses ExpenseSummaryByKind pattern

  // Per-vehicle
  byVehicle: VehicleProfitability[];

  // Monthly trend
  monthlyTrend: ProfitabilityMonthlyTrend[];

  // Per-trip
  profitableTrips: TripProfitability[];
  profitableTripsTotals: TripProfitabilityTotals;

  // Break-even
  breakEven: BreakEvenAnalysis;

  // User preferences
  distanceUnit: string;
  volumeUnit: string;
  homeCurrency: string;
  vehiclesCount: number;
}