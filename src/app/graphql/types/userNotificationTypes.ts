// ./src/app/graphql/types/userNotificationTypes.ts
const typeDefs = `#graphql
  type UserNotification @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    entityId: ID
    entityUid: ID
    createdAt: String
    readAt: String
    notificationType: Int
    message: String
    sender: String
    actionInfo: String
    user: User
    account: Account
    car: Car
  }

  type UserNotificationResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [UserNotification!]
  }

  input UserNotificationInput {
    id: ID
    carId: ID
    entityId: ID
    entityUid: ID
    readAt: String
    notificationType: Int
    message: String
    sender: String
    actionInfo: String
  }

  input UserNotificationFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    notificationType: [Int]
    entityId: [ID]
    isRead: Boolean
    searchKeyword: String
  }

  input UserNotificationWhereInput {
    id: ID
  }

  type Query {
    userNotificationList(filter: UserNotificationFilter, params: PaginationAndSorting): UserNotificationResult
    userNotificationGet(id: ID): UserNotificationResult
    userNotificationGetMany(ids: [ID]): UserNotificationResult
  }

  type Mutation {
    userNotificationCreate(params: UserNotificationInput): UserNotificationResult
    userNotificationUpdate(where: UserNotificationWhereInput, params: UserNotificationInput): UserNotificationResult
    userNotificationRemove(where: UserNotificationWhereInput): UserNotificationResult
    userNotificationRemoveMany(where: [UserNotificationWhereInput]): UserNotificationResult
  }
`;

export default typeDefs;
