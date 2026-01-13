const typeDefs = `#graphql
  # =============================================================================
  # Filter Input
  # =============================================================================

  input ExpenseSummaryReportFilter {
    carId: [ID]
    tagId: [ID]
    dateFrom: String
    dateTo: String
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
  # Main Report Type
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
    # Efficiency Metrics (based on HC costs)
    # =========================================================================
    consumption: Float
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
  # Query
  # =============================================================================

  type Query {
    reportExpenseSummary(filter: ExpenseSummaryReportFilter): ExpenseSummaryReportResult
  }
`;

export default typeDefs;
