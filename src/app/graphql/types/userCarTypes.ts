// ./src/app/graphql/types/userCarTypes.ts
const typeDefs = `#graphql
  type UserCar @key(fields: "id") {
    "Unique identifier for the user-car assignment"
    id: ID
    "Account ID that owns this assignment"
    accountId: ID
    "User ID assigned to the car"
    userId: ID
    "Car ID that the user is assigned to"
    carId: ID
    "Role ID defining permissions: 1=Owner, 2=Editor, 3=Viewer"
    roleId: Int
    "Record status: 100=Active, 200=Inactive, 300=Deleted"
    status: Int
    "User ID who created this record"
    createdBy: ID
    "User ID who last updated this record"
    updatedBy: ID
    "Timestamp when record was created (ISO 8601 format)"
    createdAt: String
    "Timestamp when record was last updated (ISO 8601 format)"
    updatedAt: String
    "User details (resolved from userId)"
    user: User
    "Account details (resolved from accountId)"
    account: Account
    "Car details (resolved from carId)"
    car: Car
    "User who created this record (resolved from createdBy)"
    userCreated: User
    "User who last updated this record (resolved from updatedBy)"
    userUpdated: User
  }

  type UserCarResult implements OpResult {
    "Operation result code: 0=Success, non-zero=Error"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "List of user-car assignment records"
    data: [UserCar!]
  }

  input UserCarInput {
    "UserCar ID (required for update, omit for create)"
    id: ID
    "User ID to assign to the car"
    userId: ID
    "Car ID to assign the user to"
    carId: ID
    "Role ID defining permissions: 1=Owner, 2=Driver, 3=Viewer"
    roleId: Int
    "Record status: 100=Active, 200=Inactive, 300=Deleted"
    status: Int
  }

  input UserCarFilter {
    "Filter by user-car assignment ID(s)"
    id: [ID]
    "Filter by account ID(s)"
    accountId: [ID]
    "Filter by user ID(s)"
    userId: [ID]
    "Filter by car ID(s)"
    carId: [ID]
    "Filter by role ID(s): 1=Owner, 2=Editor, 3=Viewer"
    roleId: [Int]
    "Filter by status: 100=Active, 200=Inactive, 300=Deleted"
    status: [Int]
  }

  input UserCarWhereInput {
    "UserCar ID to target for update/remove operations"
    id: ID
  }

  type Query {
    "Get a paginated and filtered list of user-car assignments"
    userCarList(filter: UserCarFilter, params: PaginationAndSorting): UserCarResult
    "Get a single user-car assignment by ID"
    userCarGet(id: ID): UserCarResult
    "Get multiple user-car assignments by IDs"
    userCarGetMany(ids: [ID]): UserCarResult
  }

  type Mutation {
    "Create a new user-car assignment"
    userCarCreate(params: UserCarInput): UserCarResult
    "Update an existing user-car assignment"
    userCarUpdate(where: UserCarWhereInput, params: UserCarInput): UserCarResult
    "Soft-delete a user-car assignment"
    userCarRemove(where: UserCarWhereInput): UserCarResult
    "Soft-delete multiple user-car assignments"
    userCarRemoveMany(where: [UserCarWhereInput]): UserCarResult
  }
`;

export default typeDefs;