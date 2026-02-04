// ./src/app/graphql/types/gloveboxDocumentTypes.ts
const typeDefs = `#graphql
  type GloveboxDocument @key(fields: "id") {
    id: ID
    accountId: ID
    
    # Ownership
    carId: ID
    userId: ID
    
    # Document type
    docTypeId: Int
    customTypeName: String
    
    # Core fields
    documentNumber: String
    issuedAt: String
    effectiveAt: String
    expiresAt: String
    issuingAuthority: String
    
    # Financial fields
    cost: Float
    costCurrency: String
    coverageAmount: Float
    coverageCurrency: String
    
    # Reminder
    remindBeforeDays: Int
    
    # Additional
    notes: String
    
    # Primary file (main document scan/photo)
    uploadedFileId: ID
    
    # Audit fields
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    removedAt: String
    
    # References
    docType: GloveboxDocType
    car: Car
    user: User
    userCreated: User
    userUpdated: User
    uploadedFile: UploadedFile
    
    # Additional files (beyond the primary)
    uploadedFilesIds: [ID]
    uploadedFiles: [UploadedFile]
    
    # Computed fields
    isExpired: Boolean
    daysUntilExpiration: Int
  }

  type GloveboxDocumentResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [GloveboxDocument!]
  }

  type GloveboxStats {
    totalDocuments: Int
    expiredDocuments: Int
    expiringSoonDocuments: Int
  }

  type GloveboxStatsResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [GloveboxStats!]
  }

  input GloveboxDocumentInput {
    id: ID
    carId: ID
    userId: ID
    docTypeId: Int
    customTypeName: String
    documentNumber: String
    issuedAt: String
    effectiveAt: String
    expiresAt: String
    issuingAuthority: String
    cost: Float
    costCurrency: String
    coverageAmount: Float
    coverageCurrency: String
    remindBeforeDays: Int
    notes: String
    uploadedFileId: ID
    status: Int
    
    "References to uploaded files"
    uploadedFilesIds: [ID]
  }

  input GloveboxDocumentFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    docTypeId: [Int]
    category: [String]
    expiresAtFrom: String
    expiresAtTo: String
    isExpired: Boolean
    expiresWithinDays: Int
    "Return expired records or those that are expiring within N days as per user preferences"
    expiredOrExpiring: Boolean
    status: [Int]
    searchKeyword: String
  }

  input GloveboxDocumentWhereInput {
    id: ID
  }

  type Query {
    gloveboxDocumentList(filter: GloveboxDocumentFilter, params: PaginationAndSorting): GloveboxDocumentResult
    gloveboxDocumentGet(id: ID): GloveboxDocumentResult
    gloveboxDocumentGetMany(ids: [ID]): GloveboxDocumentResult
    gloveboxStatsGet(withinDays: Int): GloveboxStatsResult
  }

  type Mutation {
    gloveboxDocumentCreate(params: GloveboxDocumentInput): GloveboxDocumentResult
    gloveboxDocumentUpdate(where: GloveboxDocumentWhereInput, params: GloveboxDocumentInput): GloveboxDocumentResult
    gloveboxDocumentRemove(where: GloveboxDocumentWhereInput): GloveboxDocumentResult
    gloveboxDocumentRemoveMany(where: [GloveboxDocumentWhereInput]): GloveboxDocumentResult
  }
`;

export default typeDefs;