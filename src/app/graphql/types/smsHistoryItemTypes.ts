// ./src/app/graphql/types/smsHistoryItemTypes.ts
const typeDefs = `#graphql
  type SmsHistoryItem @key(fields: "id") {
    id: ID
    sid: String
    createdAt: String
    direction: Int
    fromNumber: String
    toNumber: String
    body: String
    metadata: String
  }

  type SmsHistoryItemResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [SmsHistoryItem!]
  }

  input SmsHistoryItemFilter {
    id: [ID]
    sid: [String]
    direction: [Int]
    fromNumber: [String]
    toNumber: [String]
    searchKeyword: String
  }

  type Query {
    smsHistoryItemList(filter: SmsHistoryItemFilter, params: PaginationAndSorting): SmsHistoryItemResult
    smsHistoryItemGet(id: ID): SmsHistoryItemResult
    smsHistoryItemGetMany(ids: [ID]): SmsHistoryItemResult
  }
`;

export default typeDefs;
