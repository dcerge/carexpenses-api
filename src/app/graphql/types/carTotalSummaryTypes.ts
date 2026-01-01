// ./src/app/graphql/types/carTotalSummaryTypes.ts
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
    firstRecordDttm: String
    lastRecordDttm: String
    updatedAt: String
    car: Car
    latestRefuel: Expense
    latestExpense: Expense
    latestTravel: Travel
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
