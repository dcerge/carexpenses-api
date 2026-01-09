// ./src/app/graphql/types/serviceIntervalAccountTypes.ts
const typeDefs = `#graphql
  type ServiceIntervalAccount {
    carId: ID
    kindId: Int
    intervalType: Int
    mileageInterval: Float
    daysInterval: Int
    isCustomized: Boolean
    expenseKind: ExpenseKind
  }

  type ServiceIntervalAccountResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ServiceIntervalAccount!]
  }

  input ServiceIntervalAccountInput {
    carId: ID!
    kindId: Int!
    intervalType: Int!
    mileageInterval: Float
    daysInterval: Int
  }

  input ServiceIntervalAccountFilter {
    carId: ID!
    kindId: [Int]
    intervalType: [Int]
  }

  input ServiceIntervalAccountWhereInput {
    carId: ID!
    kindId: Int!
  }

  type Query {
    serviceIntervalAccountList(filter: ServiceIntervalAccountFilter!, params: PaginationAndSorting): ServiceIntervalAccountResult
  }

  type Mutation {
    serviceIntervalAccountSet(params: ServiceIntervalAccountInput!): ServiceIntervalAccountResult
    serviceIntervalAccountRemove(where: ServiceIntervalAccountWhereInput!): ServiceIntervalAccountResult
    serviceIntervalAccountRemoveMany(where: [ServiceIntervalAccountWhereInput!]!): ServiceIntervalAccountResult
  }
`;

export default typeDefs;
