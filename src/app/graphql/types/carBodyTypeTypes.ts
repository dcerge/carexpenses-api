// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type CarBodyType @key(fields: "id") {
    id: ID
    code: String
    name: String
  }

  type CarBodyTypeResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarBodyType!]
  }

  input CarBodyTypeFilter {
    id: [ID]
    code: [String]
    searchKeyword: String
  }

  type Query {
    carBodyTypeList(filter: CarBodyTypeFilter, params: PaginationAndSorting): CarBodyTypeResult
    carBodyTypeGet(carMonthlySummaryId: ID, expenseKindId: Int): CarBodyTypeResult
    carBodyTypeGetMany(ids: [ID]): CarBodyTypeResult
  }
`;

export default typeDefs;
