const typeDefs = `#graphql
  type CarMonthlyRevenue @key(fields: "carMonthlySummaryId revenueKindId") {
    carMonthlySummaryId: ID
    revenueKindId: Int
    recordsCount: Int
    amount: Float
    carMonthlySummary: CarMonthlySummary
    revenueKind: RevenueKind
  }

  type CarMonthlyRevenueResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarMonthlyRevenue!]
  }

  input CarMonthlyRevenueFilter {
    carMonthlySummaryId: [ID]
    revenueKindId: [Int]
  }

  type Query {
    carMonthlyRevenueList(filter: CarMonthlyRevenueFilter, params: PaginationAndSorting): CarMonthlyRevenueResult
    carMonthlyRevenueGet(carMonthlySummaryId: ID, revenueKindId: Int): CarMonthlyRevenueResult
  }
`;

export default typeDefs;