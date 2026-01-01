// ./src/app/graphql/types/expenseExpenseTagTypes.ts
const typeDefs = `#graphql
  type ExpenseExpenseTag @key(fields: "expenseId expenseTagId") {
    expenseId: ID
    expenseTagId: ID
    orderNo: Int
    expense: Expense
    expenseTag: ExpenseTag
  }

  type ExpenseExpenseTagResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseExpenseTag!]
  }

  input ExpenseExpenseTagInput {
    expenseId: ID
    expenseTagId: ID
    orderNo: Int
  }

  input ExpenseExpenseTagFilter {
    expenseId: [ID]
    expenseTagId: [ID]
  }

  input ExpenseExpenseTagWhereInput {
    expenseId: ID
    expenseTagId: ID
  }

  type Query {
    expenseExpenseTagList(filter: ExpenseExpenseTagFilter, params: PaginationAndSorting): ExpenseExpenseTagResult
  }

  type Mutation {
    expenseExpenseTagCreate(params: ExpenseExpenseTagInput): ExpenseExpenseTagResult
    expenseExpenseTagUpdate(where: ExpenseExpenseTagWhereInput, params: ExpenseExpenseTagInput): ExpenseExpenseTagResult
    expenseExpenseTagRemove(where: ExpenseExpenseTagWhereInput): ExpenseExpenseTagResult
    expenseExpenseTagRemoveMany(where: [ExpenseExpenseTagWhereInput]): ExpenseExpenseTagResult
  }
`;

export default typeDefs;
