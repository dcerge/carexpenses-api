// ./src/app/graphql/types/opResultTypes.ts
const typeDefs = `#graphql
  "Sorting order: Ascending or Descending"
  type Error {
    name: String
    errors: [String]
    warnings: [String]
  }

  "Operation Result"
  interface OpResult {
    code: Int!
    errors: [Error!]
  }
`;

export default typeDefs;
