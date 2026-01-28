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
  # Queries
  # =============================================================================

  type Query {
    reportExpenseSummary(filter: ExpenseSummaryReportFilter): ExpenseSummaryReportResult
    reportYearly(filter: YearlyReportFilter): YearlyReportResult
  }
`;

export default typeDefs;