// ./src/app/graphql/types/entityAttachmentTypes.ts
const typeDefs = `#graphql
  type EntityAttachment @key(fields: "id") {
    id: ID
    userId: ID
    carId: ID
    description: String
    attachmentType: Int
    attachmentPath: String
    attachmentSize: String
    accessLevel: Int
    forEntityTypeId: Int
    coordinates: String
    uploadedFileId: ID
    status: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    user: User
    car: Car
    userCreated: User
    userUpdated: User
    userRemoved: User
  }

  type EntityAttachmentResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [EntityAttachment!]
  }

  input EntityAttachmentInput {
    id: ID
    carId: ID
    description: String
    attachmentType: Int
    attachmentPath: String
    attachmentSize: String
    accessLevel: Int
    forEntityTypeId: Int
    coordinates: String
    uploadedFileId: ID
    status: Int
  }

  input EntityAttachmentFilter {
    id: [ID]
    userId: [ID]
    carId: [ID]
    attachmentType: [Int]
    accessLevel: [Int]
    forEntityTypeId: [Int]
    status: [Int]
    searchKeyword: String
  }

  input EntityAttachmentWhereInput {
    id: ID
  }

  type Query {
    entityAttachmentList(filter: EntityAttachmentFilter, params: PaginationAndSorting): EntityAttachmentResult
    entityAttachmentGet(id: ID): EntityAttachmentResult
    entityAttachmentGetMany(ids: [ID]): EntityAttachmentResult
  }

  type Mutation {
    entityAttachmentCreate(params: EntityAttachmentInput): EntityAttachmentResult
    entityAttachmentUpdate(where: EntityAttachmentWhereInput, params: EntityAttachmentInput): EntityAttachmentResult
    entityAttachmentRemove(where: EntityAttachmentWhereInput): EntityAttachmentResult
    entityAttachmentRemoveMany(where: [EntityAttachmentWhereInput]): EntityAttachmentResult
  }
`;

export default typeDefs;
