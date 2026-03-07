// ./src/app/graphql/types/reportTcoTypes.ts
const typeDefs = `#graphql
  # ===========================================================================
  # TCO Report — True Cost of Ownership
  # ===========================================================================

  """
  Cost breakdown for a single expense category within the TCO report.
  Monetary values are in the user's home currency.
  perDistance is in the user's preferred distance unit (distanceIn from profile).
  """
  type TcoCategoryBreakdown {
    "Expense category code (e.g. FUEL, MAINTENANCE, INSURANCE)"
    categoryCode: String!
    "Localized category name in the requested language (null if translation missing)"
    categoryName: String
    "Total amount spent in this category in home currency"
    totalCost: Float
    "Total number of expense records in this category"
    recordsCount: Int
    "This category's share of total TCO cost, 0–100 (null if totalCost is zero)"
    sharePercent: Float
    "Average cost per calendar month since ownership start"
    perMonth: Float
    "Average cost per distance unit driven (user's distanceIn preference)"
    perDistance: Float
  }

  """
  A single month's cost data point for the TCO trend chart.
  Monetary values are in the user's home currency.
  """
  type TcoMonthlyPoint {
    year: Int!
    month: Int!
    "Total cost for the month: refuels + all expenses (home currency)"
    totalCost: Float
    "Refuel cost portion (home currency)"
    refuelsCost: Float
    "Expense cost portion (home currency)"
    expensesCost: Float
  }

  """
  Full True Cost of Ownership report for a single car.
  Provides lifetime totals, per-category breakdowns, and a monthly trend.
  All monetary values are in the user's home currency.
  perDistance values use the user's distanceIn preference.
  """
  type TcoReport {
    "The car this report covers"
    carId: ID!
    "The date used as ownership baseline: when_bought, first_record_at, or car created_at (ISO UTC)"
    ownershipStartAt: String
    "Full calendar months from ownershipStartAt to now (minimum 1)"
    monthsOwned: Int!
    "Total cost: all refuels + all expenses in home currency"
    totalCost: Float
    "Average cost per calendar month (totalCost / monthsOwned)"
    perMonth: Float
    "Average cost per distance unit driven (user's distanceIn preference)"
    perDistance: Float
    "Breakdown of costs by expense category, sorted by category order_no"
    categories: [TcoCategoryBreakdown!]
    "Monthly cost trend, ordered oldest-first. Depth controlled by trendMonths param."
    monthlyTrend: [TcoMonthlyPoint!]
  }

  type TcoReportResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [TcoReport!]
  }

  input TcoReportParamsInput {
    "Car IDs to include. Empty or omitted = all accessible cars"
    carIds: [ID]
    "User's timezone offset in minutes from UTC (like JS getTimezoneOffset())"
    timezoneOffset: Int
    "Language code for category name localization (default: en)"
    lang: String
    "Number of months to include in the monthly trend (default: 24)"
    trendMonths: Int
  }

  type Query {
    reportTcoGet(params: TcoReportParamsInput): TcoReportResult
  }
`;

export default typeDefs;