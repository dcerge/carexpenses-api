const typeDefs = `#graphql
  # =============================================================================
  # Profitability Report Types
  # =============================================================================

  input ProfitabilityReportFilter {
    "Filter by specific vehicles (empty = all vehicles)"
    carId: [ID]
    "Filter by specific tags (empty = all)"
    tagId: [ID]
    "Start date (UTC, ISO 8601) - required"
    dateFrom: String!
    "End date (UTC, ISO 8601) - required"
    dateTo: String!
  }

  # -- - Revenue Breakdown-- -

  """
    Revenue breakdown by revenue category
  """
  type RevenueCategoryBreakdown {
    categoryId: Int
    categoryCode: String
    categoryName: String
    totalAmountHc: Float
    recordsCount: Int
    percentageOfTotal: Float
    foreignCurrencies: [CurrencyAmount]
    totalForeignRecordsCount: Int
  }

  """
    Revenue breakdown by revenue kind
  """
  type RevenueKindBreakdown {
    kindId: Int
    kindCode: String
    kindName: String
    categoryId: Int
    categoryCode: String
    totalAmountHc: Float
    recordsCount: Int
    percentageOfTotal: Float
    foreignCurrencies: [CurrencyAmount]
    totalForeignRecordsCount: Int
  }

    # -- - Per - Vehicle Profitability-- -

    """
    Profitability metrics for a single vehicle
    """
  type VehicleProfitability {
    carId: ID

    "Total revenue in home currency"
    revenueHc: Float
    revenueCount: Int

    "Expense breakdown in home currency"
    refuelsCostHc: Float
    maintenanceCostHc: Float
    otherExpensesCostHc: Float
    totalExpensesHc: Float
    expensesCount: Int

    "Net profit = revenue - expenses"
    netProfitHc: Float
    "Profit margin: (netProfit / revenue) × 100"
    profitMarginPct: Float

    "Distance driven in user's preferred unit"
    distance: Float
    "Net profit per distance unit"
    profitPerDistance: Float
    "Revenue per distance unit"
    revenuePerDistance: Float
    "Expenses per distance unit"
    expensesPerDistance: Float
  }

  # -- - Monthly Trend-- -

  """
  Monthly profitability data point for trend charts
  """
  type ProfitabilityMonthlyTrend {
    "Month number (1-12) or year-month string"
    month: Int
    year: Int

    revenueHc: Float
    revenueCount: Int

    refuelsCostHc: Float
    maintenanceCostHc: Float
    otherExpensesCostHc: Float
    totalExpensesHc: Float
    expensesCount: Int

    netProfitHc: Float

    "Distance driven in this month (user's unit)"
    distance: Float
    "Profit per distance unit for this month"
    profitPerDistance: Float
  }

  # -- - Per - Trip Profitability-- -

  """
    Profitability for a single trip that has linked revenue
  """
  type TripProfitability {
    tripId: ID
    carId: ID
    date: String
    purpose: String
    destination: String
    travelType: String
    distance: Float

    "Revenue linked to this trip"
    revenueHc: Float
    revenueCount: Int

    "Expenses linked to this trip (refuels + expenses)"
    linkedRefuelsHc: Float
    linkedExpensesHc: Float
    totalLinkedExpensesHc: Float

    "Trip net profit = revenue - linked expenses"
    netProfitHc: Float
    "Profit per distance unit for this trip"
    profitPerDistance: Float

    tags: [TripTag]
  }

  """
    Totals for per - trip profitability table
  """
  type TripProfitabilityTotals {
    totalTrips: Int
    totalDistance: Float
    totalRevenueHc: Float
    totalLinkedRefuelsHc: Float
    totalLinkedExpensesHc: Float
    totalLinkedAllExpensesHc: Float
    totalNetProfitHc: Float
  }

  # -- - Break - Even-- -

  """
  Break - even analysis for the period
    """
  type BreakEvenAnalysis {
    "Average daily revenue in home currency"
    avgDailyRevenueHc: Float
    "Average daily expenses in home currency"
    avgDailyExpensesHc: Float
    "Average daily net profit (positive = profitable)"
    avgDailyNetProfitHc: Float

    """
    If currently unprofitable: estimated days at current avg revenue
    to cover total expenses.Null if already profitable or no revenue.
    """
    daysToBreakEven: Int

    """
      If profitable: the day number in the period when cumulative
      revenue first exceeded cumulative expenses.Null if never profitable.
    """
    breakEvenDayInPeriod: Int

    "Whether the period is overall profitable"
    isProfitable: Boolean
  }

  type OdometerWarning {
    carId: ID
    "Total expense_bases records for this car in the period"
    totalRecords: Int
    "Records that have a non-null odometer value"
    recordsWithOdometer: Int
    "Records missing odometer"
    recordsMissingOdometer: Int
    "Percentage of records missing odometer (0-100)"
    missingPercentage: Float
    "Largest gap between consecutive odometer readings (in user's distance unit)"
    largestGapDistance: Float
    "Warning level based on data completeness"
    warningLevel: String
  }

  # -- - Main Report Type-- -

  """
    Profitability Report — Vehicle Revenue vs Expenses Analysis

    Designed for gig workers, delivery drivers, and small fleet operators
    to understand whether their vehicles are making or losing money.

    Key metrics: net profit, profit per km / mile, profit margin,
    break-even analysis, and per - vehicle / per - trip profitability.
  """
  type ProfitabilityReport {
    # =========================================================================
    # Period Info
    # =========================================================================
    dateFrom: String
    dateTo: String
    periodDays: Int

    odometerWarnings: [OdometerWarning]

    # =========================================================================
    # Summary KPIs(Home Currency)
    # =========================================================================
    "Total revenue across all selected vehicles"
    totalRevenueHc: Float
    totalRevenueCount: Int

    "Total expenses (refuels + maintenance + other)"
    totalRefuelsCostHc: Float
    totalMaintenanceCostHc: Float
    totalOtherExpensesCostHc: Float
    totalExpensesHc: Float
    totalExpensesCount: Int

    "Net profit = totalRevenue - totalExpenses"
    netProfitHc: Float
    "Profit margin: (netProfit / totalRevenue) × 100"
    profitMarginPct: Float

    "Daily averages"
    avgDailyRevenueHc: Float
    avgDailyExpensesHc: Float
    avgDailyNetProfitHc: Float

    "Total distance driven in period (user's unit)"
    totalDistance: Float
    "Net profit per distance unit"
    profitPerDistance: Float

    # =========================================================================
    # Foreign Currency Totals
    # =========================================================================
    foreignRevenueTotals: [CurrencyAmount]
    foreignExpenseTotals: [CurrencyAmount]
    totalForeignRevenueRecordsCount: Int
    totalForeignExpenseRecordsCount: Int

    # =========================================================================
    # Revenue Breakdown
    # =========================================================================
    revenueByCategory: [RevenueCategoryBreakdown]
    revenueByKind: [RevenueKindBreakdown]

    # =========================================================================
    # Expense Breakdown(reuses existing pattern)
    # =========================================================================
    expensesByCategory: [ExpenseSummaryByCategory]
    expensesByKind: [ExpenseSummaryByKind]

    # =========================================================================
    # Per - Vehicle Profitability
    # =========================================================================
    "Profitability metrics for each vehicle"
    byVehicle: [VehicleProfitability]

    # =========================================================================
    # Monthly Trend(for charts)
    # =========================================================================
    "Monthly revenue/expense/profit trend data"
    monthlyTrend: [ProfitabilityMonthlyTrend]

    # =========================================================================
    # Per - Trip Profitability
    # =========================================================================
    "Trips that have linked revenue — shows per-trip profit"
    profitableTrips: [TripProfitability]
    profitableTripsTotals: TripProfitabilityTotals

    # =========================================================================
    # Break - Even Analysis
    # =========================================================================
    breakEven: BreakEvenAnalysis

    # =========================================================================
    # User Preferences
    # =========================================================================
    distanceUnit: String
    volumeUnit: String
    homeCurrency: String
    vehiclesCount: Int
  }

  type ProfitabilityReportResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ProfitabilityReport]
  }

  # =============================================================================
  # Queries
  # =============================================================================

  type Query {
    reportProfitability(filter: ProfitabilityReportFilter!): ProfitabilityReportResult
  }
`;

export default typeDefs;