// ./src/app/graphql/types/entityEntityAttachmentTypes.ts
const typeDefs = `#graphql
  type EntityEntityAttachment @key(fields: "id") {
    id: ID
    entityTypeId: Int
    entityId: ID
    entityAttachmentId: ID
    orderNo: Int
    entityAttachment: EntityAttachment
  }

  type EntityEntityAttachmentResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [EntityEntityAttachment!]
  }

  input EntityEntityAttachmentInput {
    id: ID
    entityTypeId: Int
    entityId: ID
    entityAttachmentId: ID
    orderNo: Int
  }

  input EntityEntityAttachmentFilter {
    id: [ID]
    entityTypeId: [Int]
    entityId: [ID]
    entityAttachmentId: [ID]
  }

  input EntityEntityAttachmentWhereInput {
    id: ID
  }

  type Query {
    entityEntityAttachmentList(filter: EntityEntityAttachmentFilter, params: PaginationAndSorting): EntityEntityAttachmentResult
    entityEntityAttachmentGet(id: ID): EntityEntityAttachmentResult
    entityEntityAttachmentGetMany(ids: [ID]): EntityEntityAttachmentResult
  }

  type Mutation {
    entityEntityAttachmentCreate(params: EntityEntityAttachmentInput): EntityEntityAttachmentResult
    entityEntityAttachmentUpdate(where: EntityEntityAttachmentWhereInput, params: EntityEntityAttachmentInput): EntityEntityAttachmentResult
    entityEntityAttachmentRemove(where: EntityEntityAttachmentWhereInput): EntityEntityAttachmentResult
    entityEntityAttachmentRemoveMany(where: [EntityEntityAttachmentWhereInput]): EntityEntityAttachmentResult
  }
`;

export default typeDefs;
