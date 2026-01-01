// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type ExpenseKind @key(fields: "id") {
    id: ID
    code: String
    canSchedule: Boolean
    isItMaintenance: Boolean
    name: String
  }

  type ExpenseKindResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseKind!]
  }

  input ExpenseKindFilter {
    id: [ID]
    code: [String]
    canSchedule: Boolean
    isItMaintenance: Boolean
    searchKeyword: String
  }

  type Query {
    expenseKindList(filter: ExpenseKindFilter, params: PaginationAndSorting): ExpenseKindResult
    expenseKindGet(carMonthlySummaryId: ID, expenseKindId: Int): ExpenseKindResult
    expenseKindGetMany(ids: [ID]): ExpenseKindResult
  }
`;

export default typeDefs;
