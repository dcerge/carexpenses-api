// ./src/app/graphql/types/queuedTaskTypes.ts
const typeDefs = `#graphql
  type QueuedTask @key(fields: "id") {
    id: ID
    userId: ID
    taskType: Int
    taskStatus: Int
    taskInfo: String
    createdAt: String
    updatedAt: String
    user: User
  }

  type QueuedTaskResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [QueuedTask!]
  }

  input QueuedTaskInput {
    id: ID
    taskType: Int
    taskStatus: Int
    taskInfo: String
  }

  input QueuedTaskFilter {
    id: [ID]
    userId: [ID]
    taskType: [Int]
    taskStatus: [Int]
  }

  input QueuedTaskWhereInput {
    id: ID
  }

  type Query {
    queuedTaskList(filter: QueuedTaskFilter, params: PaginationAndSorting): QueuedTaskResult
    queuedTaskGet(id: ID): QueuedTaskResult
    queuedTaskGetMany(ids: [ID]): QueuedTaskResult
  }

  type Mutation {
    queuedTaskCreate(params: QueuedTaskInput): QueuedTaskResult
    queuedTaskUpdate(where: QueuedTaskWhereInput, params: QueuedTaskInput): QueuedTaskResult
    queuedTaskRemove(where: QueuedTaskWhereInput): QueuedTaskResult
    queuedTaskRemoveMany(where: [QueuedTaskWhereInput]): QueuedTaskResult
  }
`;

export default typeDefs;
