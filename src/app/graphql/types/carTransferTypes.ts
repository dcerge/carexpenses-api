// ./src/app/graphql/types/carTransferTypes.ts
const typeDefs = `#graphql
  type CarTransfer @key(fields: "id") {
    id: ID
    carId: ID
    whatToTransfer: String
    whenSent: String
    fromUserId: ID
    toUserId: ID
    transferStatus: Int
    statusDate: String
    comments: String
    newCarId: ID
    car: Car
    newCar: Car
    fromUser: User
    toUser: User
  }

  type CarTransferResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarTransfer!]
  }

  input CarTransferInput {
    id: ID
    carId: ID
    whatToTransfer: String
    toUserId: ID
    transferStatus: Int
    comments: String
  }

  input CarTransferFilter {
    id: [ID]
    carId: [ID]
    fromUserId: [ID]
    toUserId: [ID]
    transferStatus: [Int]
    newCarId: [ID]
  }

  input CarTransferWhereInput {
    id: ID
  }

  type Query {
    carTransferList(filter: CarTransferFilter, params: PaginationAndSorting): CarTransferResult
    carTransferGet(id: ID): CarTransferResult
    carTransferGetMany(ids: [ID]): CarTransferResult
  }

  type Mutation {
    carTransferCreate(params: CarTransferInput): CarTransferResult
    carTransferUpdate(where: CarTransferWhereInput, params: CarTransferInput): CarTransferResult
    carTransferRemove(where: CarTransferWhereInput): CarTransferResult
    carTransferRemoveMany(where: [CarTransferWhereInput]): CarTransferResult
  }
`;

export default typeDefs;
