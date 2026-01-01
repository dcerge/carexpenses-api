// ./src/app/graphql/types/travelTypes.ts
const typeDefs = `#graphql
  type Travel @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    isActive: Boolean
    firstOdometer: Float
    lastOdometer: Float
    firstRecordId: ID
    lastRecordId: ID
    firstDttm: String
    lastDttm: String
    labelId: ID
    purpose: String
    destination: String
    comments: String
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    user: User
    account: Account
    car: Car
    expenseLabel: ExpenseLabel
    userCreated: User
    userUpdated: User
    userRemoved: User
  }

  type TravelResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [Travel!]
  }

  input TravelInput {
    id: ID
    accountId: ID
    carId: ID
    isActive: Boolean
    firstOdometer: Float
    lastOdometer: Float
    firstDttm: String
    lastDttm: String
    labelId: ID
    purpose: String
    destination: String
    comments: String
    status: Int
  }

  input TravelFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    labelId: [ID]
    isActive: Boolean
    purpose: [String]
    destination: [String]
    status: [Int]
    searchKeyword: String
  }

  input TravelWhereInput {
    id: ID
  }

  type Query {
    travelList(filter: TravelFilter, params: PaginationAndSorting): TravelResult
    travelGet(id: ID): TravelResult
    travelGetMany(ids: [ID]): TravelResult
  }

  type Mutation {
    travelCreate(params: TravelInput): TravelResult
    travelUpdate(where: TravelWhereInput, params: TravelInput): TravelResult
    travelRemove(where: TravelWhereInput): TravelResult
    travelRemoveMany(where: [TravelWhereInput]): TravelResult
  }
`;

export default typeDefs;
