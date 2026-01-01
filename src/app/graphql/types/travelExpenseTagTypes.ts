// ./src/app/graphql/types/travelExpenseTagTypes.ts
const typeDefs = `#graphql
  type TravelExpenseTag @key(fields: "travelId expenseTagId") {
    travelId: ID
    expenseTagId: ID
    orderNo: Int
    travel: Travel
    expenseTag: ExpenseTag
  }

  type TravelExpenseTagResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [TravelExpenseTag!]
  }

  input TravelExpenseTagInput {
    travelId: ID
    expenseTagId: ID
    orderNo: Int
  }

  input TravelExpenseTagFilter {
    travelId: [ID]
    expenseTagId: [ID]
  }

  input TravelExpenseTagWhereInput {
    travelId: ID
    expenseTagId: ID
  }

  type Query {
    travelExpenseTagList(filter: TravelExpenseTagFilter, params: PaginationAndSorting): TravelExpenseTagResult
  }

  type Mutation {
    travelExpenseTagCreate(params: TravelExpenseTagInput): TravelExpenseTagResult
    travelExpenseTagUpdate(where: TravelExpenseTagWhereInput, params: TravelExpenseTagInput): TravelExpenseTagResult
    travelExpenseTagRemove(where: TravelExpenseTagWhereInput): TravelExpenseTagResult
    travelExpenseTagRemoveMany(where: [TravelExpenseTagWhereInput]): TravelExpenseTagResult
  }
`;

export default typeDefs;
