// ./src/app/graphql/types/revenueCategoryTypes.ts
const typeDefs = `#graphql
  type RevenueCategory @key(fields: "id") {
    id: ID
    code: String
    name: String
    kinds: [RevenueKind!]
  }

  type RevenueCategoryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [RevenueCategory!]
  }

  input RevenueCategoryFilter {
    id: [ID]
    code: [String]
    lang: String
    searchKeyword: String
  }

  type Query {
    revenueCategoryList(filter: RevenueCategoryFilter, params: PaginationAndSorting): RevenueCategoryResult
    revenueCategoryGet(id: ID): RevenueCategoryResult
    revenueCategoryGetMany(ids: [ID]): RevenueCategoryResult
  }
`;

export default typeDefs;