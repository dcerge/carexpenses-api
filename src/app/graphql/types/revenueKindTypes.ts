// ./src/app/graphql/types/revenueKindTypes.ts
const typeDefs = `#graphql
  type RevenueKind @key(fields: "id") {
    id: ID
    code: String
    name: String
  }

  type RevenueKindResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [RevenueKind!]
  }

  input RevenueKindFilter {
    id: [ID]
    code: [String]
    revenueCategoryId: [Int]
    lang: String
    searchKeyword: String
  }

  type Query {
    revenueKindList(filter: RevenueKindFilter, params: PaginationAndSorting): RevenueKindResult
    revenueKindGet(id: ID): RevenueKindResult
    revenueKindGetMany(ids: [ID]): RevenueKindResult
  }
`;

export default typeDefs;