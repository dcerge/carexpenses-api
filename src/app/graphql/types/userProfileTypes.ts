// ./src/app/graphql/types/userProfileTypes.ts
const typeDefs = `#graphql
  type UserProfile @key(fields: "id") {
    id: ID
    accountId: ID
    homeCurrency: String
    distanceIn: String
    volumeIn: String
    consumptionIn: String
    notifyInMileage: Float
    notifyInDays: Int
  }

  type UserProfileResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [UserProfile]
  }

  input UserProfileInput {
    homeCurrency: String
    distanceIn: String
    volumeIn: String
    consumptionIn: String
    notifyInMileage: Float
    notifyInDays: Int
  }

  input UserProfileFilter {
    id: [ID]
    accountId: [ID]
  }

  input UserProfileWhereInput {
    id: ID
  }

  type Query {
    userProfileList(filter: UserProfileFilter, params: PaginationAndSorting): UserProfileResult
    userProfileGet(id: ID): UserProfileResult
    userProfileGetMany(ids: [ID]): UserProfileResult
  }

  type Mutation {
    userProfileUpdate(where: UserProfileWhereInput, params: UserProfileInput): UserProfileResult
  }
`;

export default typeDefs;
