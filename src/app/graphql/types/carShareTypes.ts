// ./src/app/graphql/types/carShareTypes.ts
const typeDefs = `#graphql
  type CarShare @key(fields: "id") {
    id: ID
    carId: ID
    whatToShare: String
    createdAt: String
    fromUserId: ID
    toUserId: ID
    fromUserName: String
    toUserName: String
    shareRoleId: Int
    shareStatus: Int
    statusDate: String
    comments: String
    car: Car
    fromUser: User
    toUser: User
  }

  type CarShareResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarShare!]
  }

  input CarShareInput {
    id: ID
    carId: ID
    whatToShare: String
    toUserId: ID
    toUserName: String
    shareRoleId: Int
    shareStatus: Int
    comments: String
  }

  input CarShareFilter {
    id: [ID]
    carId: [ID]
    fromUserId: [ID]
    toUserId: [ID]
    shareRoleId: [Int]
    shareStatus: [Int]
  }

  input CarShareWhereInput {
    id: ID
  }

  type Query {
    carShareList(filter: CarShareFilter, params: PaginationAndSorting): CarShareResult
    carShareGet(id: ID): CarShareResult
    carShareGetMany(ids: [ID]): CarShareResult
  }

  type Mutation {
    carShareCreate(params: CarShareInput): CarShareResult
    carShareUpdate(where: CarShareWhereInput, params: CarShareInput): CarShareResult
    carShareRemove(where: CarShareWhereInput): CarShareResult
    carShareRemoveMany(where: [CarShareWhereInput]): CarShareResult
  }
`;

export default typeDefs;
