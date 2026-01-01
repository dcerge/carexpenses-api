// ./src/app/graphql/types/expenseLabelTypes.ts
const typeDefs = `#graphql
  type ExpenseLabel @key(fields: "id") {
    id: ID
    accountId: ID
    labelName: String
    labelColor: String
    lastTimeUsed: String
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    userCreated: User
    userUpdated: User
    userRemoved: User
    account: Account
  }

  type ExpenseLabelResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseLabel!]
  }

  input ExpenseLabelInput {
    id: ID
    accountId: ID
    labelName: String
    labelColor: String
    status: Int
  }

  input ExpenseLabelFilter {
    id: [ID]
    accountId: [ID]
    labelName: [String]
    status: [Int]
    searchKeyword: String
  }

  input ExpenseLabelWhereInput {
    id: ID
  }

  type Query {
    expenseLabelList(filter: ExpenseLabelFilter, params: PaginationAndSorting): ExpenseLabelResult
    expenseLabelGet(id: ID): ExpenseLabelResult
    expenseLabelGetMany(ids: [ID]): ExpenseLabelResult
  }

  type Mutation {
    expenseLabelCreate(params: ExpenseLabelInput): ExpenseLabelResult
    expenseLabelUpdate(where: ExpenseLabelWhereInput, params: ExpenseLabelInput): ExpenseLabelResult
    expenseLabelRemove(where: ExpenseLabelWhereInput): ExpenseLabelResult
    expenseLabelRemoveMany(where: [ExpenseLabelWhereInput]): ExpenseLabelResult
  }
`;

export default typeDefs;
