// ./src/app/graphql/types/externalTypes.ts
const typeDefs = `#graphql
  extend type User @key(fields: "id") {
    id: ID @external
  }

  extend type Account @key(fields: "id") {
    id: ID @external
  }
`;

export default typeDefs;
