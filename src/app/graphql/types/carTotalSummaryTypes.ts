const typeDefs = `#graphql
  type CarTotalSummary @key(fields: "carId homeCurrency") {
    carId: ID
    homeCurrency: String
    latestKnownMileage: Float
    latestRefuelId: ID
    latestExpenseId: ID
    latestTravelId: ID
    totalRefuelsCount: Int
    totalExpensesCount: Int
    refuelsTaxes: Float
    totalRefuelsCost: Float
    expensesFees: Float
    expensesTaxes: Float
    totalExpensesCost: Float
    totalRefuelsVolume: Float
    # Revenue tracking
    totalRevenuesCount: Int
    totalRevenuesAmount: Float
    latestRevenueId: ID
    # Maintenance tracking (expenses where is_it_maintenance = true)
    totalMaintenanceCount: Int
    totalMaintenanceCost: Float
    # First refuel tracking (for consumption calculation)
    firstRefuelId: ID
    firstRefuelOdometer: Float
    firstRefuelVolume: Float
    # Consumption metrics (excluding first refuel)
    consumptionVolume: Float
    consumptionDistance: Float
    # Checkpoint tracking
    totalCheckpointsCount: Int
    # Travel tracking
    totalTravelsCount: Int
    totalTravelsDistance: Float
    # Timestamps
    firstRecordAt: String
    lastRecordAt: String
    updatedAt: String
    # Relations
    car: Car
    latestRefuel: Expense
    latestExpense: Expense
    latestTravel: Travel
    latestRevenue: Expense
    firstRefuel: Expense
  }

  type CarTotalSummaryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarTotalSummary!]
  }

  input CarTotalSummaryFilter {
    carId: [ID]
    homeCurrency: [String]
  }

  type Query {
    carTotalSummaryList(filter: CarTotalSummaryFilter, params: PaginationAndSorting): CarTotalSummaryResult
    carTotalSummaryGet(carId: ID, homeCurrency: String): CarTotalSummaryResult
  }
`;

export default typeDefs;