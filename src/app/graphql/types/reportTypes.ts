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
    # Monthly Breakdown (12 months)
    # =========================================================================
    months: [MonthlyBreakdown]

    # =========================================================================
    # User Preferences (for frontend display)
    # =========================================================================
    distanceUnit: String
    volumeUnit: String
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
