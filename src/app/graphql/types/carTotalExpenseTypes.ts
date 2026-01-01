// ./src/app/graphql/types/carTotalExpenseTypes.ts
const typeDefs = `#graphql
  type CarTotalExpense @key(fields: "carId homeCurrency expenseKindId") {
    carId: ID
    homeCurrency: String
    expenseKindId: Int
    recordsCount: Int
    amount: Float
    car: Car
    expenseKind: ExpenseKind
  }

  type CarTotalExpenseResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarTotalExpense!]
  }

  input CarTotalExpenseFilter {
    carId: [ID]
    homeCurrency: [String]
    expenseKindId: [Int]
  }

  type Query {
    carTotalExpenseList(filter: CarTotalExpenseFilter, params: PaginationAndSorting): CarTotalExpenseResult
    carTotalExpenseGet(carId: ID, homeCurrency: String, expenseKindId: Int): CarTotalExpenseResult
  }
`;

export default typeDefs;
