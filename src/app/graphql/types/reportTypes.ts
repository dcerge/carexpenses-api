const typeDefs = `#graphql
  # =============================================================================
  # Filter Inputs
  # =============================================================================

  input ExpenseSummaryReportFilter {
    carId: [ID]
    tagId: [ID]
    dateFrom: String
    dateTo: String
  }

  input YearlyReportFilter {
    carId: [ID]
    tagId: [ID]
    year: Int
  }

  input TravelReportFilter {
    "Filter by specific vehicles (empty = all vehicles)"
    carId: [ID]
    "Filter by specific tags (empty = all)"
    tagId: [ID]
    "Filter by travel types: business, personal, medical, charity, commute"
    travelType: [String]
    "Start date (UTC, ISO 8601) - required"
    dateFrom: String!
    "End date (UTC, ISO 8601) - required"
    dateTo: String!
  }

  # =============================================================================
  # Currency Amount (reusable for foreign currency breakdowns)
  # =============================================================================

  type CurrencyAmount {
    currency: String
    amount: Float
    recordsCount: Int
  }

  # =============================================================================
  # Consumption Types
  # =============================================================================

  """
  Consumption data for a specific fuel type.
  Supports gasoline, diesel, electric (kWh), hydrogen (kg), and other fuel types.
  """
  type FuelTypeConsumption {
    "Fuel type: gasoline, diesel, electric, lpg, cng, e85, biodiesel, hydrogen"
    fuelType: String

    "Consumption value in user's preferred unit (e.g., 8.5 for L/100km or 28 for MPG)"
    consumption: Float

    "Consumption unit label: l100km, mpg-us, mpg-uk, kWh/100km, mi/kWh, kg/100km, etc."
    consumptionUnit: String

    "Total fuel/energy used in this period"
    fuelUsed: Float

    "Unit for fuelUsed: l, gal-us, gal-uk, kWh, kg"
    fuelUnit: String

    "Distance traveled with this fuel type"
    distance: Float

    "Distance unit: km or mi"
    distanceUnit: String

    "Confidence level of the consumption calculation"
    confidence: String

    "Reasons explaining the confidence level"
    confidenceReasons: [String]

    "Number of vehicles contributing to this fuel type data"
    vehiclesCount: Int

    "Number of refuel records used in calculation"
    refuelsCount: Int

    "Total data points (refuels + checkpoints + expenses with odometer) used"
    dataPointsCount: Int
  }

  """
  Complete consumption data with breakdown by fuel type.
  Allows tracking consumption for vehicles with different fuel types
  (e.g., gasoline car + electric car, or dual-fuel vehicles).
  """
  type ConsumptionData {
    "Consumption breakdown by fuel type"
    byFuelType: [FuelTypeConsumption]

    "Total distance across all fuel types"
    totalDistance: Float

    "Distance unit: km or mi"
    distanceUnit: String

    "Total number of vehicles included in consumption calculation"
    totalVehiclesCount: Int
  }

  # =============================================================================
  # Category Breakdown
  # =============================================================================

  type ExpenseSummaryByCategory {
    categoryId: Int
    categoryCode: String
    categoryName: String

    totalAmountHc: Float
    recordsCountHc: Int
    percentageHc: Float

    foreignCurrencies: [CurrencyAmount]
    totalForeignRecordsCount: Int
  }

  # =============================================================================
  # Kind Breakdown
  # =============================================================================

  type ExpenseSummaryByKind {
    kindId: Int
    kindCode: String
    kindName: String
    categoryId: Int
    categoryCode: String

    totalAmountHc: Float
    recordsCountHc: Int
    percentageHc: Float

    foreignCurrencies: [CurrencyAmount]
    totalForeignRecordsCount: Int
  }

  # =============================================================================
  # Refuels Summary
  # =============================================================================

  type RefuelsSummary {
    totalCostHc: Float
    recordsCountHc: Int
    totalVolume: Float
    avgPricePerVolumeHc: Float

    foreignCurrencies: [CurrencyAmount]
    totalForeignRecordsCount: Int
  }

  # =============================================================================
  # Expenses Summary (non-refuel expenses)
  # =============================================================================

  type ExpensesSummary {
    totalCostHc: Float
    recordsCountHc: Int

    foreignCurrencies: [CurrencyAmount]
    totalForeignRecordsCount: Int
  }

  # =============================================================================
  # Expense Summary Report Type
  # =============================================================================

  type ExpenseSummaryReport {
    # Period info
    dateFrom: String
    dateTo: String
    periodDays: Int

    # =========================================================================
    # Totals (Home Currency)
    # =========================================================================
    totalCostHc: Float
    refuelsCostHc: Float
    expensesCostHc: Float

    # Daily averages (Home Currency)
    avgTotalCostPerDayHc: Float
    avgRefuelsCostPerDayHc: Float
    avgExpensesCostPerDayHc: Float

    # =========================================================================
    # Totals (Foreign Currencies - unconverted)
    # =========================================================================
    foreignCurrencyTotals: [CurrencyAmount]
    totalForeignRecordsCount: Int

    # =========================================================================
    # Refuels Detail
    # =========================================================================
    refuels: RefuelsSummary

    # =========================================================================
    # Expenses Detail (non-refuel)
    # =========================================================================
    expenses: ExpensesSummary

    # =========================================================================
    # Fuel Metrics (volume tracked regardless of currency)
    # =========================================================================
    fuelPurchased: Float
    refuelsCount: Int

    # =========================================================================
    # Mileage Metrics (in user's distance unit)
    # =========================================================================
    startOdometer: Float
    endOdometer: Float
    mileage: Float
    avgMileagePerDay: Float

    # =========================================================================
    # Consumption Metrics (NEW - with fuel type breakdown)
    # =========================================================================
    """
    Detailed consumption data grouped by fuel type.
    Includes confidence levels and supporting statistics.
    """
    consumption: ConsumptionData

    """
    @deprecated Use consumption.byFuelType[0].consumption instead.
    Legacy field for backward compatibility - returns first fuel type's consumption.
    """
    consumptionValue: Float

    """
    @deprecated Use consumption.byFuelType[0].confidence instead.
    Legacy field for backward compatibility - returns first fuel type's confidence.
    """
    consumptionConfidence: String

    # =========================================================================
    # Efficiency Metrics (based on HC costs)
    # =========================================================================
    costPerDistanceHc: Float

    # =========================================================================
    # Record Counts
    # =========================================================================
    totalRecordsCount: Int
    vehiclesCount: Int

    # =========================================================================
    # Breakdowns
    # =========================================================================
    expensesByCategory: [ExpenseSummaryByCategory]
    expensesByKind: [ExpenseSummaryByKind]

    # =========================================================================
    # User Preferences (for frontend display)
    # =========================================================================
    distanceUnit: String
    volumeUnit: String
    consumptionUnit: String
    homeCurrency: String
  }

  type ExpenseSummaryReportResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseSummaryReport]
  }

  # =============================================================================
  # Yearly Report Types
  # =============================================================================

  type MonthlyBreakdown {
    month: Int

    # =========================================================================
    # Totals (Home Currency)
    # =========================================================================
    refuelsCostHc: Float
    expensesCostHc: Float
    totalCostHc: Float
    refuelsCountHc: Int
    expensesCountHc: Int

    # =========================================================================
    # Totals (Foreign Currencies - unconverted)
    # =========================================================================
    foreignRefuels: [CurrencyAmount]
    foreignExpenses: [CurrencyAmount]
    foreignCurrencyTotals: [CurrencyAmount]
    totalForeignRecordsCount: Int

    # =========================================================================
    # Fuel & Mileage Metrics (tracked regardless of currency)
    # =========================================================================
    fuelPurchased: Float
    mileage: Float
    refuelsCount: Int
    expensesCount: Int

    # =========================================================================
    # Consumption Metrics (NEW)
    # =========================================================================
    """
    Monthly consumption data grouped by fuel type.
    May be null if no consumption data available for this month.
    """
    consumption: ConsumptionData
  }

  type YearlyReport {
    year: Int

    # =========================================================================
    # Annual Totals (Home Currency)
    # =========================================================================
    totalRefuelsCostHc: Float
    totalExpensesCostHc: Float
    totalCostHc: Float
    totalRefuelsCountHc: Int
    totalExpensesCountHc: Int

    # =========================================================================
    # Annual Totals (Foreign Currencies - unconverted)
    # =========================================================================
    foreignRefuels: [CurrencyAmount]
    foreignExpenses: [CurrencyAmount]
    foreignCurrencyTotals: [CurrencyAmount]
    totalForeignRecordsCount: Int

    # =========================================================================
    # Annual Fuel & Mileage Metrics (tracked regardless of currency)
    # =========================================================================
    totalFuelPurchased: Float
    totalMileage: Float
    totalRefuelsCount: Int
    totalExpensesCount: Int

    # =========================================================================
    # Annual Consumption Metrics (NEW)
    # =========================================================================
    """
    Annual consumption data grouped by fuel type.
    Provides yearly average consumption with confidence levels.
    """
    consumption: ConsumptionData

    # =========================================================================
    # Monthly Breakdown (12 months)
    # =========================================================================
    months: [MonthlyBreakdown]

    # =========================================================================
    # User Preferences (for frontend display)
    # =========================================================================
    distanceUnit: String
    volumeUnit: String
    consumptionUnit: String
    homeCurrency: String
    vehiclesCount: Int
  }

  type YearlyReportResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [YearlyReport]
  }

  # =============================================================================
  # Travel Report Types
  # =============================================================================

  type TripTag {
    id: ID
    tagName: String
    tagColor: String
  }

  """
  Individual trip detail for the report table
  """
  type TripDetail {
    id: ID
    carId: ID
    "Trip start date/time (ISO 8601)"
    date: String
    "Trip end date/time (ISO 8601)"
    endDate: String
    "Purpose of the trip"
    purpose: String
    "Destination (from travels.destination or fallback from last record)"
    destination: String
    "Travel type: business, personal, medical, charity, commute"
    travelType: String
    "Distance in user's preferred unit"
    distance: Float
    "Whether this is a round trip"
    isRoundTrip: Boolean

    "Active driving/working time in minutes (for gig workers)"
    activeMinutes: Int
    "Total time including waiting in minutes"
    totalMinutes: Int

    "Total refuels cost linked to this trip (home currency)"
    refuelsTotal: Float
    "Total refuels volume linked to this trip (user's volume unit)"
    refuelsVolume: Float
    "Total expenses cost linked to this trip (home currency)"
    expensesTotal: Float
    "Total revenues linked to this trip (home currency)"
    revenuesTotal: Float

    "Reimbursement rate per distance unit"
    reimbursementRate: Float
    "Currency of the reimbursement rate"
    reimbursementRateCurrency: String
    "Calculated reimbursement amount (rate × distance)"
    calculatedReimbursement: Float

    "Tags attached to this trip"
    tags: [TripTag]
  }

  """
  Trips totals for table footer
  """
  type TripsTotals {
    totalTrips: Int
    totalDistance: Float
    totalActiveMinutes: Int
    totalTotalMinutes: Int
    totalRefuelsCost: Float
    totalRefuelsVolume: Float
    totalExpensesCost: Float
    totalRevenuesCost: Float
    totalCalculatedReimbursement: Float
  }

  """
  Breakdown by travel type
  """
  type TravelTypeBreakdown {
    "Travel type: business, personal, medical, charity, commute"
    travelType: String
    "Number of trips of this type"
    tripsCount: Int
    "Total distance for this type (user's unit)"
    totalDistance: Float
    "Percentage of filtered trips distance"
    percentageOfFiltered: Float
  }

  """
  Tier breakdown for tiered rate calculations (e.g., CRA style)
  """
  type ReimbursementTierBreakdown {
    tierIndex: Int
    distanceInTier: Float
    rate: Float
    amount: Float
  }

  """
  Deduction calculation for a specific travel type
  """
  type StandardMileageByType {
    travelType: String
    "Distance in the rate's native unit"
    distance: Float
    "Primary rate (first tier rate)"
    rate: Float
    rateCurrency: String
    "Total deduction for this travel type"
    deduction: Float
    "Tier breakdown (only present for tiered rates like CRA)"
    tierBreakdown: [ReimbursementTierBreakdown]
  }

  """
  Standard Mileage Deduction (IRS Method)
  Calculates deduction based on IRS/CRA mileage rates.
  Supports both flat rates (IRS) and tiered rates (CRA).
  """
  type StandardMileageDeduction {
    "Total eligible distance (business + medical + charity)"
    eligibleDistance: Float
    distanceUnit: String
    "Breakdown by deductible travel type"
    byType: [StandardMileageByType]
    "Total deduction across all types"
    totalDeduction: Float
    "Currency of the deduction"
    currency: String
  }

  """
  Actual Expense Method (CRA/IRS Alternative)
  Calculates deductible expenses based on business use percentage.
  Total expenses × (business km / total km) = deductible amount
  """
  type ActualExpenseMethod {
    "Total refuels cost in period (all records, home currency)"
    totalRefuelsCostHc: Float
    "Total refuels volume in period (user's volume unit)"
    totalRefuelsVolume: Float
    "Total maintenance expenses (where expense_kinds.is_it_maintenance = true)"
    totalMaintenanceCostHc: Float
    "Total other expenses (non-maintenance)"
    totalOtherExpensesCostHc: Float
    "Sum of all expenses (refuels + maintenance + other)"
    totalAllExpensesCostHc: Float

    "Deductible refuels (totalRefuelsCostHc × businessUsePercentage)"
    deductibleRefuelsCostHc: Float
    "Deductible maintenance"
    deductibleMaintenanceCostHc: Float
    "Deductible other expenses"
    deductibleOtherExpensesCostHc: Float
    "Total deductible amount"
    totalDeductibleCostHc: Float

    volumeUnit: String
  }

  """
  Totals for expenses directly linked to the filtered trips via travel_id
  """
  type LinkedTotals {
    refuelsCostHc: Float
    refuelsVolume: Float
    expensesCostHc: Float
    revenuesCostHc: Float
    refuelsCount: Int
    expensesCount: Int
    revenuesCount: Int
  }

  """
  Travel Report for IRS/CRA Tax Compliance
  
  Provides two deduction calculation methods:
  1. Standard Mileage Method (IRS): Multiply eligible miles by IRS rate
  2. Actual Expense Method (CRA): Total expenses × business use percentage
  
  The report shows:
  - All trips matching the filter criteria
  - Business use percentage based on tracked vs total distance
  - Deduction calculations for tax filing
  - Expenses directly linked to each trip
  """
  type TravelReport {
    # =========================================================================
    # Period Info
    # =========================================================================
    dateFrom: String
    dateTo: String
    periodDays: Int

    # =========================================================================
    # Vehicles in Report
    # =========================================================================
    "IDs of vehicles included in this report"
    carIds: [ID]
    vehiclesCount: Int

    # =========================================================================
    # Distance Summary
    # =========================================================================
    """
    Total distance traveled by all selected vehicles in the period.
    Calculated from ALL expense_bases records (max odometer - min odometer per car).
    """
    totalDistanceInPeriod: Float

    """
    Sum of distances for filtered trips only.
    """
    filteredTripsDistance: Float

    """
    Business use percentage: (filteredTripsDistance / totalDistanceInPeriod) × 100
    Used for actual expense method calculation.
    """
    businessUsePercentage: Float

    distanceUnit: String

    # =========================================================================
    # Trip Counts by Type
    # =========================================================================
    "Breakdown of trips by travel type with counts and distances"
    tripsByType: [TravelTypeBreakdown]

    # =========================================================================
    # IRS Standard Mileage Method
    # =========================================================================
    """
    Standard mileage deduction calculation (IRS method).
    Uses official IRS/CRA mileage rates for deductible travel types.
    Null if no deductible trips exist.
    """
    standardMileageDeduction: StandardMileageDeduction

    # =========================================================================
    # CRA/IRS Actual Expense Method
    # =========================================================================
    """
    Actual expense method calculation (CRA/IRS alternative).
    Shows total expenses and deductible portion based on business use percentage.
    """
    actualExpenseMethod: ActualExpenseMethod

    # =========================================================================
    # Direct Trip-Linked Totals
    # =========================================================================
    """
    Totals for expenses directly linked to the filtered trips.
    Only includes expense_bases records where travel_id matches a filtered trip.
    """
    linkedTotals: LinkedTotals

    # =========================================================================
    # Trip Details Table
    # =========================================================================
    "Individual trip records matching the filter"
    trips: [TripDetail]

    # =========================================================================
    # Totals Row (for table footer)
    # =========================================================================
    "Aggregated totals for the trips table footer"
    tripsTotals: TripsTotals

    # =========================================================================
    # User Preferences
    # =========================================================================
    homeCurrency: String
    volumeUnit: String
  }

  type TravelReportResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [TravelReport]
  }

  # =============================================================================
  # Queries
  # =============================================================================

  type Query {
    reportExpenseSummary(filter: ExpenseSummaryReportFilter): ExpenseSummaryReportResult
    reportYearly(filter: YearlyReportFilter): YearlyReportResult
    reportTravel(filter: TravelReportFilter!): TravelReportResult
  }
`;

export default typeDefs;