const typeDefs = `#graphql
  type CarMonthlySummary @key(fields: "id") {
    id: ID
    carId: ID
    homeCurrency: String
    year: Int
    month: Int
    startMileage: Float
    endMileage: Float
    refuelsCount: Int
    expensesCount: Int
    refuelsTaxes: Float
    refuelsCost: Float
    expensesFees: Float
    expensesTaxes: Float
    expensesCost: Float
    refuelsVolume: Float
    # Revenue tracking
    revenuesCount: Int
    revenuesAmount: Float
    # Maintenance tracking (expenses where is_it_maintenance = true)
    maintenanceCount: Int
    maintenanceCost: Float
    # Consumption tracking
    consumptionVolume: Float
    isFirstRefuelMonth: Boolean
    # Checkpoint tracking
    checkpointsCount: Int
    # Travel tracking
    travelsCount: Int
    travelsDistance: Float
    # Timestamps
    firstRecordAt: String
    lastRecordAt: String
    updatedAt: String
    car: Car
  }

  type CarMonthlySummaryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarMonthlySummary!]
  }

  input CarMonthlySummaryFilter {
    id: [ID]
    carId: [ID]
    homeCurrency: [String]
    year: [Int]
    month: [Int]
  }

  type Query {
    carMonthlySummaryList(filter: CarMonthlySummaryFilter, params: PaginationAndSorting): CarMonthlySummaryResult
    carMonthlySummaryGet(id: ID): CarMonthlySummaryResult
    carMonthlySummaryGetMany(ids: [ID]): CarMonthlySummaryResult
  }
`;

export default typeDefs;