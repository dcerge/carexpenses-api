// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type VehicleMake @key(fields: "id") {
    id: ID
    makeName: String
  }

  type VehicleMakeResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [VehicleMake!]
  }

  input VehicleMakeFilter {
    id: [ID]
    searchKeyword: String
  }

  type Query {
    vehicleMakeList(filter: VehicleMakeFilter, params: PaginationAndSorting): VehicleMakeResult
    vehicleMakeGet(carMonthlySummaryId: ID, expenseKindId: Int): VehicleMakeResult
    vehicleMakeGetMany(ids: [ID]): VehicleMakeResult
  }
`;

export default typeDefs;
