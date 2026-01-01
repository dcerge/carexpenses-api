// ./src/app/graphql/types/expenseTagTypes.ts
const typeDefs = `#graphql
  type ExpenseTag @key(fields: "id") {
    id: ID
    accountId: ID
    tagName: String
    tagColor: String
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    userCreated: User
    userUpdated: User
    userRemoved: User
    account: Account
  }

  type ExpenseTagResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseTag!]
  }

  input ExpenseTagInput {
    id: ID
    accountId: ID
    tagName: String
    tagColor: String
    status: Int
  }

  input ExpenseTagFilter {
    id: [ID]
    accountId: [ID]
    tagName: [String]
    status: [Int]
    searchKeyword: String
  }

  input ExpenseTagWhereInput {
    id: ID
  }

  type Query {
    expenseTagList(filter: ExpenseTagFilter, params: PaginationAndSorting): ExpenseTagResult
    expenseTagGet(id: ID): ExpenseTagResult
    expenseTagGetMany(ids: [ID]): ExpenseTagResult
  }

  type Mutation {
    expenseTagCreate(params: ExpenseTagInput): ExpenseTagResult
    expenseTagUpdate(where: ExpenseTagWhereInput, params: ExpenseTagInput): ExpenseTagResult
    expenseTagRemove(where: ExpenseTagWhereInput): ExpenseTagResult
    expenseTagRemoveMany(where: [ExpenseTagWhereInput]): ExpenseTagResult
  }
`;

export default typeDefs;
