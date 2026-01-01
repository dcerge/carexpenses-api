// ./src/app/graphql/types/serviceIntervalAccountTypes.ts
const typeDefs = `#graphql
  type ServiceIntervalAccount @key(fields: "id") {
    id: ID
    carId: ID
    kindId: Int
    intervalType: Int
    mileageInterval: Float
    daysInterval: Int
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    car: Car
    expenseKind: ExpenseKind
    userCreated: User
    userUpdated: User
    userRemoved: User
  }

  type ServiceIntervalAccountResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ServiceIntervalAccount!]
  }

  input ServiceIntervalAccountInput {
    id: ID
    carId: ID
    kindId: Int
    intervalType: Int
    mileageInterval: Float
    daysInterval: Int
    status: Int
  }

  input ServiceIntervalAccountFilter {
    id: [ID]
    carId: [ID]
    kindId: [Int]
    intervalType: [Int]
    status: [Int]
  }

  input ServiceIntervalAccountWhereInput {
    id: ID
  }

  type Query {
    serviceIntervalAccountList(filter: ServiceIntervalAccountFilter, params: PaginationAndSorting): ServiceIntervalAccountResult
    serviceIntervalAccountGet(id: ID): ServiceIntervalAccountResult
    serviceIntervalAccountGetMany(ids: [ID]): ServiceIntervalAccountResult
  }

  type Mutation {
    serviceIntervalAccountCreate(params: ServiceIntervalAccountInput): ServiceIntervalAccountResult
    serviceIntervalAccountUpdate(where: ServiceIntervalAccountWhereInput, params: ServiceIntervalAccountInput): ServiceIntervalAccountResult
    serviceIntervalAccountRemove(where: ServiceIntervalAccountWhereInput): ServiceIntervalAccountResult
    serviceIntervalAccountRemoveMany(where: [ServiceIntervalAccountWhereInput]): ServiceIntervalAccountResult
  }
`;

export default typeDefs;
