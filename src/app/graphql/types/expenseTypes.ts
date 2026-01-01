// ./src/app/graphql/types/expenseTypes.ts
const typeDefs = `#graphql
  type Expense @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    expenseType: Int
    
    # Common fields (from expense_bases)
    odometer: Float
    tripMeter: Float
    whenDone: String
    location: String
    whereDone: String
    subtotal: Float
    tax: Float
    fees: Float
    totalPrice: Float
    paidInCurrency: String
    totalPriceInHc: Float
    homeCurrency: String
    expensePictureId: ID
    comments: String
    fuelInTank: Float
    labelId: ID
    travelId: ID
    ownerNumber: Int
    
    # Expense-specific fields (expenseType = 2)
    kindId: Int
    costWork: Float
    costParts: Float
    costWorkHc: Float
    costPartsHc: Float
    shortNote: String
    
    # Refuel-specific fields (expenseType = 1)
    refuelVolume: Float
    volumeEnteredIn: String
    pricePerVolume: Float
    isFullTank: Boolean
    remainingInTankBefore: Float
    fuelGrade: String
    
    # Audit fields
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    
    # References
    user: User
    account: Account
    car: Car
    expenseLabel: ExpenseLabel
    travel: Travel
    expenseKind: ExpenseKind
    userCreated: User
    userUpdated: User
    userRemoved: User
  }

  type ExpenseResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [Expense!]
  }

  input ExpenseInput {
    id: ID
    accountId: ID
    carId: ID
    expenseType: Int
    
    # Common fields
    odometer: Float
    tripMeter: Float
    whenDone: String
    location: String
    whereDone: String
    subtotal: Float
    tax: Float
    fees: Float
    totalPrice: Float
    paidInCurrency: String
    totalPriceInHc: Float
    homeCurrency: String
    comments: String
    fuelInTank: Float
    labelId: ID
    travelId: ID
    
    # Expense-specific fields (expenseType = 2)
    kindId: Int
    costWork: Float
    costParts: Float
    costWorkHc: Float
    costPartsHc: Float
    shortNote: String
    
    # Refuel-specific fields (expenseType = 1)
    refuelVolume: Float
    volumeEnteredIn: String
    pricePerVolume: Float
    isFullTank: Boolean
    remainingInTankBefore: Float
    fuelGrade: String
    
    status: Int
  }

  input ExpenseFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    expenseType: [Int]
    kindId: [Int]
    labelId: [ID]
    travelId: [ID]
    isFullTank: Boolean
    fuelGrade: [String]
    whenDoneFrom: String
    whenDoneTo: String
    status: [Int]
    searchKeyword: String
  }

  input ExpenseWhereInput {
    id: ID
  }

  type Query {
    expenseList(filter: ExpenseFilter, params: PaginationAndSorting): ExpenseResult
    expenseGet(id: ID): ExpenseResult
    expenseGetMany(ids: [ID]): ExpenseResult
  }

  type Mutation {
    expenseCreate(params: ExpenseInput): ExpenseResult
    expenseUpdate(where: ExpenseWhereInput, params: ExpenseInput): ExpenseResult
    expenseRemove(where: ExpenseWhereInput): ExpenseResult
    expenseRemoveMany(where: [ExpenseWhereInput]): ExpenseResult
  }
`;

export default typeDefs;
