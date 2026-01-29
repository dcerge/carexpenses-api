// ./src/boundary/travelReportTypes.ts
// Type definitions for the Travel Report feature
// Used by gateway, core, and GraphQL layers

// =============================================================================
// Filter Input
// =============================================================================

/**
 * Filter input for the travel report
 * Supports multiple selections for vehicles, tags, and travel types
 */
export interface TravelReportFilter {
  carId?: string[];                    // Filter by specific vehicles (empty = all)
  tagId?: string[];                    // Filter by specific tags (empty = all)
  travelType?: string[];               // Filter by travel types: business, personal, medical, charity, commute
  dateFrom: string;                    // Start date (UTC, ISO 8601)
  dateTo: string;                      // End date (UTC, ISO 8601)
}

// =============================================================================
// Raw Data from Gateway (Database Results)
// =============================================================================

/**
 * Raw travel record from database
 */
export interface TravelRaw {
  id: string;
  carId: string;
  accountId: string;
  userId: string;
  isActive: boolean;
  firstOdometerKm: number | null;      // Stored in km (metric)
  lastOdometerKm: number | null;       // Stored in km (metric)
  firstDttm: Date | null;
  lastDttm: Date | null;
  labelId: string | null;
  purpose: string;
  destination: string | null;
  travelType: string;                  // business, personal, medical, charity, commute
  distanceKm: number | null;           // Calculated or manually entered, stored in km
  isRoundTrip: boolean;
  reimbursementRate: number | null;
  reimbursementRateCurrency: string | null;
  calculatedReimbursement: number | null;
  activeMinutes: number | null;
  totalMinutes: number | null;
  lastRecordId: string | null;         // For destination fallback
  comments: string | null;
  status: number;
}

/**
 * Tag info for a travel
 */
export interface TravelTagRaw {
  travelId: string;
  tagId: string;
  tagName: string;
  tagColor: string | null;
  orderNo: number;
}

/**
 * Linked expense totals grouped by travel_id and expense_type
 */
export interface LinkedExpenseTotalRaw {
  travelId: string;
  expenseType: number;                 // 1=Refuel, 2=Expense, 5=Revenue
  totalPriceHc: number;
  totalVolumeLiters: number | null;    // Only for refuels (expense_type=1)
  recordsCount: number;
}

/**
 * Destination fallback from expense_bases for travels with empty destination
 */
export interface DestinationFallbackRaw {
  travelId: string;
  lastRecordId: string;
  whereDone: string | null;
  location: string | null;
}

/**
 * Min/max odometer per car for calculating total distance in period
 */
export interface CarOdometerRangeRaw {
  carId: string;
  minOdometerKm: number | null;
  maxOdometerKm: number | null;
  recordsCount: number;
}

/**
 * All expenses in period breakdown (for actual expense method)
 * Includes ALL expense_bases records for selected cars, regardless of travel_id
 */
export interface PeriodExpenseBreakdownRaw {
  // Refuels (expense_type = 1)
  refuelsTotalHc: number;
  refuelsVolumeLiters: number;
  refuelsCount: number;

  // Maintenance expenses (expense_type = 2 AND expense_kinds.is_it_maintenance = true)
  maintenanceTotalHc: number;
  maintenanceCount: number;

  // Other expenses (expense_type = 2 AND expense_kinds.is_it_maintenance = false)
  otherExpensesTotalHc: number;
  otherExpensesCount: number;

  // Revenues (expense_type = 5)
  revenuesTotalHc: number;
  revenuesCount: number;
}

/**
 * Summary by travel type
 */
export interface TravelTypeSummaryRaw {
  travelType: string;
  tripsCount: number;
  totalDistanceKm: number;
}

/**
 * Complete raw data structure returned by gateway
 */
export interface TravelReportRawData {
  // Filtered travels
  travels: TravelRaw[];

  // Tags for filtered travels
  travelTags: TravelTagRaw[];

  // Linked expense totals (grouped by travel_id, expense_type)
  linkedExpenseTotals: LinkedExpenseTotalRaw[];

  // Destination fallbacks for travels with empty destination
  destinationFallbacks: DestinationFallbackRaw[];

  // Odometer ranges per car (for total distance calculation)
  carOdometerRanges: CarOdometerRangeRaw[];

  // All expenses in period (for actual expense method)
  periodExpenseBreakdown: PeriodExpenseBreakdownRaw;

  // Summary by travel type
  travelTypeSummaries: TravelTypeSummaryRaw[];

  // Cars included in report
  carIds: string[];
}

// =============================================================================
// Output Types (API Response)
// =============================================================================

/**
 * Tag attached to a trip
 */
export interface TripTag {
  id: string;
  tagName: string;
  tagColor: string | null;
}

/**
 * Single trip detail for the report table
 */
export interface TripDetail {
  id: string;
  carId: string;
  date: string;                        // first_dttm formatted (ISO 8601)
  endDate: string | null;              // last_dttm formatted (ISO 8601)
  purpose: string;
  destination: string;                 // travels.destination OR fallback from last_record
  travelType: string;
  distance: number | null;             // In user's distance unit
  isRoundTrip: boolean;

  // Time tracking (for gig workers)
  activeMinutes: number | null;
  totalMinutes: number | null;

  // Linked expenses (in home currency)
  refuelsTotal: number;
  refuelsVolume: number | null;        // In user's volume unit
  expensesTotal: number;
  revenuesTotal: number;

  // Reimbursement
  reimbursementRate: number | null;
  reimbursementRateCurrency: string | null;
  calculatedReimbursement: number | null;

  // Tags
  tags: TripTag[];
}

/**
 * Trips totals for table footer
 */
export interface TripsTotals {
  totalTrips: number;
  totalDistance: number | null;
  totalActiveMinutes: number | null;
  totalTotalMinutes: number | null;
  totalRefuelsCost: number;
  totalRefuelsVolume: number | null;
  totalExpensesCost: number;
  totalRevenuesCost: number;
  totalCalculatedReimbursement: number;
}

/**
 * Breakdown by travel type
 */
export interface TravelTypeBreakdown {
  travelType: string;                  // business, personal, medical, charity, commute
  tripsCount: number;
  totalDistance: number | null;        // In user's distance unit
  percentageOfFiltered: number;        // % of filtered trips distance
}

/**
 * Standard mileage deduction breakdown by travel type
 */
export interface StandardMileageByType {
  travelType: string;
  distance: number;                    // In rate's distance unit
  rate: number;
  rateCurrency: string;
  deduction: number;
  // For tiered rates (CRA style)
  tierBreakdown?: Array<{
    tierIndex: number;
    distanceInTier: number;
    rate: number;
    amount: number;
  }>;
}

/**
 * Standard mileage deduction section (IRS method)
 */
export interface StandardMileageDeduction {
  eligibleDistance: number;            // Business + medical + charity distance
  distanceUnit: string;
  byType: StandardMileageByType[];
  totalDeduction: number;
  currency: string;
}

/**
 * Actual expense method section (CRA/IRS alternative)
 */
export interface ActualExpenseMethod {
  // Total expenses in period (ALL records for selected cars)
  totalRefuelsCostHc: number;
  totalRefuelsVolume: number | null;   // In user's volume unit
  totalMaintenanceCostHc: number;      // Where expense_kinds.is_it_maintenance = true
  totalOtherExpensesCostHc: number;    // expense_type=2 where is_it_maintenance = false
  totalAllExpensesCostHc: number;      // Sum of refuels + maintenance + other

  // Deductible portion (× businessUsePercentage)
  deductibleRefuelsCostHc: number;
  deductibleMaintenanceCostHc: number;
  deductibleOtherExpensesCostHc: number;
  totalDeductibleCostHc: number;

  volumeUnit: string;
}

/**
 * Linked totals section (expenses directly linked to filtered trips)
 */
export interface LinkedTotals {
  refuelsCostHc: number;
  refuelsVolume: number | null;        // In user's volume unit
  expensesCostHc: number;
  revenuesCostHc: number;
  refuelsCount: number;
  expensesCount: number;
  revenuesCount: number;
}

/**
 * Complete Travel Report output
 */
export interface TravelReport {
  // =========================================================================
  // Period Info
  // =========================================================================
  dateFrom: string;
  dateTo: string;
  periodDays: number;

  // =========================================================================
  // Vehicles in Report
  // =========================================================================
  carIds: string[];
  vehiclesCount: number;

  // =========================================================================
  // Distance Summary
  // =========================================================================
  totalDistanceInPeriod: number | null;   // Total car odometer change (from ALL expense_bases)
  filteredTripsDistance: number | null;   // Sum of filtered trips' distance
  businessUsePercentage: number | null;   // (filtered / total) × 100
  distanceUnit: string;

  // =========================================================================
  // Trip Counts by Type
  // =========================================================================
  tripsByType: TravelTypeBreakdown[];

  // =========================================================================
  // IRS Standard Mileage Method
  // =========================================================================
  standardMileageDeduction: StandardMileageDeduction | null;

  // =========================================================================
  // CRA/IRS Actual Expense Method
  // =========================================================================
  actualExpenseMethod: ActualExpenseMethod;

  // =========================================================================
  // Direct Trip-Linked Totals
  // =========================================================================
  linkedTotals: LinkedTotals;

  // =========================================================================
  // Trip Details Table
  // =========================================================================
  trips: TripDetail[];

  // =========================================================================
  // Totals Row (for table footer)
  // =========================================================================
  tripsTotals: TripsTotals;

  // =========================================================================
  // User Preferences
  // =========================================================================
  homeCurrency: string;
  volumeUnit: string;
}