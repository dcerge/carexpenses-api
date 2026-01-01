// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type ExpenseCategory @key(fields: "id") {
    id: ID
    code: String
    name: String
    kinds: [ExpenseKind!]
  }

  type ExpenseCategoryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseCategory!]
  }

  input ExpenseCategoryFilter {
    id: [ID]
    code: [String]
    lang: String
    searchKeyword: String
  }

  type Query {
    expenseCategoryList(filter: ExpenseCategoryFilter, params: PaginationAndSorting): ExpenseCategoryResult
    expenseCategoryGet(carMonthlySummaryId: ID, expenseKindId: Int): ExpenseCategoryResult
    expenseCategoryGetMany(ids: [ID]): ExpenseCategoryResult
  }
`;

export default typeDefs;
