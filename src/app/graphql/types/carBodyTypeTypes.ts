// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type CarBodyType @key(fields: "id") {
    id: ID
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
    lang: String
    searchKeyword: String
  }

  type Query {
    carBodyTypeList(filter: CarBodyTypeFilter, params: PaginationAndSorting): CarBodyTypeResult
    carBodyTypeGet(carBodyTypeId: ID): CarBodyTypeResult
    carBodyTypeGetMany(ids: [ID]): CarBodyTypeResult
  }
`;

export default typeDefs;
