// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type CarEngineType @key(fields: "id") {
    id: ID
    code: String
    name: String
  }

  type CarEngineTypeResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarEngineType!]
  }

  input CarEngineTypeFilter {
    id: [ID]
    code: [String]
    searchKeyword: String
  }

  type Query {
    carEngineTypeList(filter: CarEngineTypeFilter, params: PaginationAndSorting): CarEngineTypeResult
    carEngineTypeGet(carMonthlySummaryId: ID, expenseKindId: Int): CarEngineTypeResult
    carEngineTypeGetMany(ids: [ID]): CarEngineTypeResult
  }
`;

export default typeDefs;
