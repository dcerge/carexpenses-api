// ./src/app/graphql/types/carMonthlyExpenseTypes.ts
const typeDefs = `#graphql
  type CarTransmissionType @key(fields: "id") {
    id: ID
    code: String
    name: String
  }

  type CarTransmissionTypeResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarTransmissionType!]
  }

  input CarTransmissionTypeFilter {
    id: [ID]
    code: [String]
    searchKeyword: String
  }

  type Query {
    carTransmissionTypeList(filter: CarTransmissionTypeFilter, params: PaginationAndSorting): CarTransmissionTypeResult
    carTransmissionTypeGet(carMonthlySummaryId: ID, expenseKindId: Int): CarTransmissionTypeResult
    carTransmissionTypeGetMany(ids: [ID]): CarTransmissionTypeResult
  }
`;

export default typeDefs;
