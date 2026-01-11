// ./src/app/graphql/types/serviceIntervalNextTypes.ts
const typeDefs = `#graphql
  type ServiceIntervalNext @key(fields: "id") {
    id: ID
    carId: ID
    kindId: Int
    intervalType: Int
    mileageInterval: Float
    daysInterval: Int
    maxWhenDone: String
    maxOdometer: Float
    nextWhenDo: String
    nextOdometer: Float
    remainingDays: Int
    remainingMileage: Float
    urgencyStatus: String
    status: Int
    car: Car
    expenseKind: ExpenseKind
  }

  type ServiceIntervalNextResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ServiceIntervalNext!]
  }

  input ServiceIntervalNextInput {
    nextWhenDo: String
    nextOdometer: Float
  }

  input ServiceIntervalNextFilter {
    carId: [ID]
    kindId: [Int]
    intervalType: [Int]
    urgencyStatus: [String]
  }

  input ServiceIntervalNextWhereInput {
    id: ID!
  }

  type Query {
    serviceIntervalNextList(filter: ServiceIntervalNextFilter, params: PaginationAndSorting): ServiceIntervalNextResult
    serviceIntervalNextGet(id: ID): ServiceIntervalNextResult
    serviceIntervalNextGetMany(ids: [ID]): ServiceIntervalNextResult
  }

  type Mutation {
    serviceIntervalNextUpdate(where: ServiceIntervalNextWhereInput, params: ServiceIntervalNextInput): ServiceIntervalNextResult
  }
`;

export default typeDefs;
