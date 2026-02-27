// ./src/app/graphql/types/dashboardTypes.ts
const typeDefs = `#graphql
  # ===========================================================================
  # Reusable unit conversion type
  # ===========================================================================

  """
  Distance, volume, and consumption values converted to specific units.
  Used for both lifetime totals (year=0, month=0) and monthly stats.
  """
  type StatsUnits {
    "Distance unit: km, mi"
    distanceUnit: String!
    "Volume unit: l, gal-us, gal-uk"
    volumeUnit: String!
    "Consumption unit: l100km, km-l, mpg-us, mpg-uk, mi-l"
    consumptionUnit: String!
    "First odometer reading in period (first ever for totals, start of month for monthly)"
    firstOdometer: Float
    "Last odometer reading in period (latest known for totals, end of month for monthly)"
    lastOdometer: Float
    "Total distance from completed travels in specified distance unit"
    travelsDistance: Float
    "First refuel odometer reading in specified distance unit"
    firstRefuelOdometer: Float
    "Distance used for consumption calculation in specified distance unit"
    consumptionDistance: Float
    "Total fuel volume purchased in specified volume unit"
    refuelsVolume: Float
    "First refuel volume in specified volume unit"
    firstRefuelVolume: Float
    "Fuel volume for consumption calculation in specified volume unit"
    consumptionVolume: Float
    "Calculated fuel consumption in specified consumption unit"
    consumption: Float
  }

  type TravelPurpose {
    "The purpose text (most recent spelling)"
    purpose: String!
  }


  # ===========================================================================
  # Unified stats type (currency-independent)
  # ===========================================================================

  """
  Currency-independent stats for a single car.
  Used for both lifetime totals (year=0, month=0) and monthly breakdowns.
  All distance/volume/consumption values live in inCarUnits and inUserUnits.
  """
  type CarStats {
    carId: ID!
    "Year of the stats period (0 for lifetime totals)"
    year: Int!
    "Month of the stats period (0 for lifetime totals)"
    month: Int!
    refuelsCount: Int
    expensesCount: Int
    revenuesCount: Int
    maintenanceCount: Int
    checkpointsCount: Int
    travelsCount: Int
    latestRefuelId: ID
    latestExpenseId: ID
    latestTravelId: ID
    latestRevenueId: ID
    firstRefuelId: ID
    firstRecordAt: String
    lastRecordAt: String
    "Values converted to car's preferred units (mileageIn, mainTankVolumeEnteredIn)"
    inCarUnits: StatsUnits
    "Values converted to user's preferred units (distanceIn, volumeIn, consumptionIn from profile)"
    inUserUnits: StatsUnits
  }

  # ===========================================================================
  # Unified monetary type (currency-specific)
  # ===========================================================================

  """
  Monetary totals for a single car in a specific currency.
  Used for both lifetime totals (year=0, month=0) and monthly breakdowns.
  One entry per currency the car has expenses/revenues in.
  """
  type StatsMonetary {
    carId: ID!
    "Year of the stats period (0 for lifetime totals)"
    year: Int!
    "Month of the stats period (0 for lifetime totals)"
    month: Int!
    currency: String!
    refuelsCost: Float
    refuelsTaxes: Float
    expensesCost: Float
    expensesFees: Float
    expensesTaxes: Float
    maintenanceCost: Float
    revenuesAmount: Float
  }

  # ===========================================================================
  # Averages and Dashboard
  # ===========================================================================

  """
  Rolling averages computed from the last N months of data.
  Monetary values are in the user's home currency.
  Volume and consumption are in user's preferred units.
  Mileage is provided in both car and user preferred units.
  """
  type DashboardAverages {
    "The currency used for monetary averages (user's home currency)"
    currency: String!
    "Number of months used to compute the averages"
    monthsCount: Int
    "Average monthly expense amount (in home currency)"
    monthlyExpense: Float
    "Average monthly revenue amount (in home currency)"
    monthlyRevenue: Float
    "Average monthly refuels volume in user's preferred volume unit"
    monthlyRefuelsVolume: Float
    "Average monthly mileage in car's preferred distance unit"
    monthlyMileageInCarUnits: Float
    "Average monthly mileage in user's preferred distance unit"
    monthlyMileageInUserUnits: Float
    "Average fuel consumption in user's preferred consumption unit"
    monthlyConsumption: Float
  }

  """
  Dashboard data for a single car, combining lifetime stats,
  current and previous month summaries, and rolling averages.
  """
  type DashboardItem {
    "The car ID this dashboard item belongs to"
    carId: ID!
    "Full car object (null when includeCars is false)"
    car: Car
    "Lifetime currency-independent stats (zeroed object with year=0, month=0 if no stats exist)"
    totalStats: CarStats
    "Lifetime monetary totals per currency (year=0, month=0)"
    totalMonetary: [StatsMonetary!]
    "Current month currency-independent stats (zeroed object with year/month set if no stats exist)"
    currentMonthStats: CarStats
    "Current month monetary totals per currency"
    currentMonthMonetary: [StatsMonetary!]
    "Previous month currency-independent stats (zeroed object with year/month set if no stats exist)"
    previousMonthStats: CarStats
    "Previous month monetary totals per currency"
    previousMonthMonetary: [StatsMonetary!]
    "Rolling averages for the last N months (home currency only)"
    averages: DashboardAverages
    "Number of days remaining in the current month (based on user's timezone)"
    daysRemainingInMonth: Int
    "Recent unique travel purposes across accessible cars, sorted by most recently used"
    recentTravelPurposes: [TravelPurpose!]
  }

  type DashboardResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [DashboardItem!]
  }

  input DashboardParamsInput {
    "Car IDs to include. Empty or omitted = all accessible cars"
    carIds: [ID]
    "User's timezone offset in minutes from UTC (like JS getTimezoneOffset()). Used to determine current month and days remaining."
    timezoneOffset: Int
    "Number of months to use for rolling averages (default: 3)"
    avgMonths: Int
    "Whether to include full car objects in the response (default: true)"
    includeCars: Boolean
    "Whether to include expense/revenue breakdowns by kind for the current month (default: false)"
    includeBreakdowns: Boolean
  }

  # ===========================================================================
  # Fleet Summary — aggregated across all vehicles for one month
  # ===========================================================================

  """
  Fleet-wide monthly summary aggregated across all active vehicles.
  All monetary values are in the user's home currency.
  All physical values are in the user's preferred units.
  """
  type FleetSummary {
    "Requested year"
    year: Int!
    "Requested month (1-12)"
    month: Int!

    "User's home currency used for all monetary values"
    currency: String!
    "User's preferred distance unit"
    distanceUnit: String!
    "User's preferred volume unit"
    volumeUnit: String!

    "Total refuel cost across all vehicles (home currency)"
    refuelsCost: Float!
    "Total maintenance cost across all vehicles"
    maintenanceCost: Float!
    "Total other expenses cost across all vehicles"
    otherExpensesCost: Float!
    "Total cost: refuels + maintenance + other"
    totalCost: Float!
    "Total revenue across all vehicles"
    revenuesAmount: Float!

    "Total number of refuel records"
    refuelsCount: Int!
    "Total number of maintenance records"
    maintenanceCount: Int!
    "Total number of other expense records"
    otherExpensesCount: Int!
    "Total number of revenue records"
    revenuesCount: Int!

    "Total fuel volume purchased (user's volume unit)"
    refuelsVolume: Float!
    "Total distance driven across all vehicles (user's distance unit)"
    totalDistance: Float!

    "Fuel cost per distance unit (null if no distance)"
    fuelCostPerDistance: Float
    "Running cost per distance unit (null if no distance)"
    runningCostPerDistance: Float

    "Earliest year with data (for back-navigation bound)"
    minYear: Int!
    "Earliest month with data in minYear (for back-navigation bound)"
    minMonth: Int!
  }

  type FleetSummaryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [FleetSummary]
  }

  input FleetSummaryParamsInput {
    "Year to fetch summary for (defaults to current year based on timezone)"
    year: Int
    "Month to fetch summary for (1-12, defaults to current month based on timezone)"
    month: Int
    "User's timezone offset in minutes from UTC (like JS getTimezoneOffset())"
    timezoneOffset: Int
  }

  type Query {
    dashboardGet(params: DashboardParamsInput): DashboardResult
    dashboardFleetSummaryGet(params: FleetSummaryParamsInput): FleetSummaryResult
  }
`;

export default typeDefs;