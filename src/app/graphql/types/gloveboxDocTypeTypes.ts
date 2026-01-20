// ./src/app/graphql/types/gloveboxDocTypeTypes.ts
const typeDefs = `#graphql
  type GloveboxDocType @key(fields: "id") {
    id: ID
    code: String
    category: String
    orderNo: Int
    
    # Field visibility flags
    hasDocumentNumber: Boolean
    hasIssueDate: Boolean
    hasEffectiveDate: Boolean
    hasExpiration: Boolean
    hasIssuingAuthority: Boolean
    hasCost: Boolean
    hasCoverageAmount: Boolean
    
    # Label customization
    documentNumberLabelKey: String
    
    status: Int
    
    # Localized fields (resolved based on user's language)
    name: String
    description: String
    documentNumberLabel: String
  }

  type GloveboxDocTypeResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [GloveboxDocType!]
  }

  input GloveboxDocTypeFilter {
    id: [ID]
    code: [String]
    category: [String]
    hasExpiration: Boolean
    status: [Int]
    lang: String
  }

  type Query {
    gloveboxDocTypeList(filter: GloveboxDocTypeFilter, params: PaginationAndSorting): GloveboxDocTypeResult
    gloveboxDocTypeGet(id: ID): GloveboxDocTypeResult
    gloveboxDocTypeGetMany(ids: [ID]): GloveboxDocTypeResult
  }
`;

export default typeDefs;