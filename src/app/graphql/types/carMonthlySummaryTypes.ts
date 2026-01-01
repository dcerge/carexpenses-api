// ./src/app/graphql/types/carMonthlySummaryTypes.ts
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
    firstRecordDttm: String
    lastRecordDttm: String
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
