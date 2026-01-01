// ./src/app/graphql/types/userCarTypes.ts
const typeDefs = `#graphql
  type UserCar @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    roleId: Int
    status: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    user: User
    account: Account
    car: Car
    userCreated: User
    userUpdated: User
    userRemoved: User
  }

  type UserCarResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [UserCar!]
  }

  input UserCarInput {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    roleId: Int
    status: Int
  }

  input UserCarFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    roleId: [Int]
    status: [Int]
  }

  input UserCarWhereInput {
    id: ID
  }

  type Query {
    userCarList(filter: UserCarFilter, params: PaginationAndSorting): UserCarResult
    userCarGet(id: ID): UserCarResult
    userCarGetMany(ids: [ID]): UserCarResult
  }

  type Mutation {
    userCarCreate(params: UserCarInput): UserCarResult
    userCarUpdate(where: UserCarWhereInput, params: UserCarInput): UserCarResult
    userCarRemove(where: UserCarWhereInput): UserCarResult
    userCarRemoveMany(where: [UserCarWhereInput]): UserCarResult
  }
`;

export default typeDefs;
