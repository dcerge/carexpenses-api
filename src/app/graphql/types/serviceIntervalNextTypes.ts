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
    status: Int
    car: Car
    expenseKind: ExpenseKind
  }

  type ServiceIntervalNextResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ServiceIntervalNext!]
  }

  input ServiceIntervalNextFilter {
    id: [ID]
    carId: [ID]
    kindId: [Int]
    intervalType: [Int]
    status: [Int]
  }

  type Query {
    serviceIntervalNextList(filter: ServiceIntervalNextFilter, params: PaginationAndSorting): ServiceIntervalNextResult
    serviceIntervalNextGet(id: ID): ServiceIntervalNextResult
    serviceIntervalNextGetMany(ids: [ID]): ServiceIntervalNextResult
  }
`;

export default typeDefs;
