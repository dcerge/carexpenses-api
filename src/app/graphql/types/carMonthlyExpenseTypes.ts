// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type CarMonthlyExpense @key(fields: "carMonthlySummaryId expenseKindId") {
    carMonthlySummaryId: ID
    expenseKindId: Int
    recordsCount: Int
    amount: Float
    carMonthlySummary: CarMonthlySummary
    expenseKind: ExpenseKind
  }

  type CarMonthlyExpenseResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarMonthlyExpense!]
  }

  input CarMonthlyExpenseFilter {
    carMonthlySummaryId: [ID]
    expenseKindId: [Int]
  }

  type Query {
    carMonthlyExpenseList(filter: CarMonthlyExpenseFilter, params: PaginationAndSorting): CarMonthlyExpenseResult
    carMonthlyExpenseGet(carMonthlySummaryId: ID, expenseKindId: Int): CarMonthlyExpenseResult
  }
`;

export default typeDefs;
