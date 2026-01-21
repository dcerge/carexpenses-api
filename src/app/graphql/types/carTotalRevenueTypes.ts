const typeDefs = `#graphql
  type CarTotalRevenue @key(fields: "carId homeCurrency revenueKindId") {
    carId: ID
    homeCurrency: String
    revenueKindId: Int
    recordsCount: Int
    amount: Float
    car: Car
    revenueKind: RevenueKind
  }

  type CarTotalRevenueResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarTotalRevenue!]
  }

  input CarTotalRevenueFilter {
    carId: [ID]
    homeCurrency: [String]
    revenueKindId: [Int]
  }

  type Query {
    carTotalRevenueList(filter: CarTotalRevenueFilter, params: PaginationAndSorting): CarTotalRevenueResult
    carTotalRevenueGet(carId: ID, homeCurrency: String, revenueKindId: Int): CarTotalRevenueResult
  }
`;

export default typeDefs;