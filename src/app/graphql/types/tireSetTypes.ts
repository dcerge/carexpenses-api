const typeDefs = `#graphql
  type TireSetItem {
    "Unique tire set item identifier"
    id: ID
    "Parent tire set ID"
    tireSetId: ID
    "Linked purchase expense ID"
    expenseId: ID

    # Tire details
    "Tire manufacturer name (e.g., Michelin, Continental)"
    brand: String
    "Tire model name (e.g., Pilot Sport 4)"
    model:  String
    "Tire size code (e.g., 225/45R17)"
    tireSize: String
    "Position on vehicle: all, front, rear"
    position: String
    "Number of tires of this type in the set"
    quantity: Int

    # Condition & manufacturing
    "Condition when acquired: new, used, came_with_vehicle"
    tireCondition: String
    "Starting tread depth in mm when acquired"
    treadDepthInitial: Float
    "DOT manufacturing date code (e.g., 2319 = week 23 of 2019)"
    dotCode: String

    # Registration
    "Whether tires are registered with manufacturer for recalls"
    isRegistered: Boolean

    "Additional notes"
    notes: String

    # System fields
    "Record status: 100=Active, 10000=Removed"
    status: Int
    "Record creation timestamp"
    createdAt: String
    "Last update timestamp"
    updatedAt: String

    # Relationships
    "Linked purchase expense record"
    expense: Expense
  }

  type TireSet @key(fields: "id") {
    "Unique tire set identifier"
    id: ID
    "Account that owns this tire set"
    accountId: ID
    "User who created the tire set"
    userId: ID
    "Vehicle this tire set belongs to"
    carId: ID

    # Tire set info
    "User-friendly label (e.g., Summer 2024, Winter Nokians)"
    name: String
    "Tire type: summer, winter, all_season, performance, off_road"
    tireType: String
    "Where tires are stored when not on vehicle"
    storageLocation: String
    "Total number of tires in the set"
    quantity: Int

    "Additional notes"
    notes: String

    # System fields
    "Record status: 100=Currently installed on vehicle, 300=Off vehicle, in storage, 5000=Disposed of, sold, or worn out, 10000=Removed"
    status: Int
    "Optimistic locking version number"
    version: Int
    "User who created this record"
    createdBy: ID
    "User who last updated this record"
    updatedBy: ID
    "User who soft-deleted this record"
    removedBy: ID
    "Record creation timestamp"
    createdAt: String
    "Last update timestamp"
    updatedAt: String

    # Relationships
    "Tire items within this set"
    items: [TireSetItem!]
    "Vehicle this tire set belongs to"
    car: Car
    "Service expenses linked to this set (rotations, swaps, alignments)"
    expenses: [Expense!]
    "User who created this record"
    userCreated: User
    "User who last updated this record"
    userUpdated: User
  }

  type TireSetResult implements OpResult {
    "Operation result code"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "List of tire set records"
    data: [TireSet!]
  }

  type TireSetSwapResult implements OpResult {
    "Operation result code"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "Swap result data"
    data: [TireSetSwapData!]
  }

  type TireSetSwapData {
    "The tire set that was installed (now active)"
    installedSet: TireSet
    "The tire set that was removed (now stored)"
    storedSet: TireSet
    "The swap expense record (if cost was provided)"
    expense: Expense
  }

  input TireSetItemInput {
    "Item ID (required for updates, omit for new items)"
    id: ID

    # Tire details
    "Tire manufacturer name"
    brand: String
    "Tire model name"
    model: String
    "Tire size code (e.g., 225/45R17)"
    tireSize: String
    "Position on vehicle: all, front, rear"
    position: String
    "Number of tires of this type"
    quantity: Int

    # Condition & manufacturing
    "Condition when acquired: new, used, came_with_vehicle"
    tireCondition: String
    "Starting tread depth in mm"
    treadDepthInitial: Float
    "DOT manufacturing date code"
    dotCode: String

    # Registration
    "Whether tires are registered with manufacturer"
    isRegistered: Boolean

    # Expense linking
    "Existing expense ID to link as purchase record"
    expenseId: ID

    "Additional notes"
    notes: String

    "Status: 100=Active, 10000=Removed"
    status: Int
  }

  input TireSetInput {
    "Vehicle ID"
    carId: ID
    "User-friendly label"
    name: String
    "Tire type: summer, winter, all_season,  all_weather, performance, off_road"
    tireType: String
    "Where tires are stored when not on vehicle"
    storageLocation: String
    "Total number of tires in the set"
    quantity: Int
    "Additional notes"
    notes: String
    "Status: 100=Currently installed on vehicle, 300=Off vehicle, in storage, 5000=Disposed of, sold, or worn out, 10000=Removed"
    status: Int

    "Tire items in this set"
    items: [TireSetItemInput!]

    # Optional: create installation expense alongside the tire set
    "Whether to create an installation expense (uses expenseDetails)"
    createExpense: Boolean
    "Installation/purchase expense details (used when createExpense is true). Uses standard ExpenseInput. kindId defaults to 213 (TIRE_REPAIR_REPLACEMENT) if not specified."
    expenseDetails: ExpenseInput
  }

  input TireSetSwapInput {
    "Vehicle ID"
    carId: ID!
    "ID of the stored tire set to install"
    installTireSetId: ID!
    "Where to store the outgoing set"
    storageLocation: String
    "Whether to create a swap expense (uses expenseDetails)"
    createExpense: Boolean
    "Swap expense details. Uses standard ExpenseInput. kindId defaults to 22 (SEASONAL_TIRE_SERVICE) if not specified. odometer is required for distance tracking."
    expenseDetails: ExpenseInput
  }

  input TireSetFilter {
    "Filter by tire set ID(s)"
    id: [ID]
    "Filter by vehicle ID(s)"
    carId: [ID]
    "Filter by tire type: summer, winter, all_season, all_weather, performance, off_road"
    tireType: [String]
    "Search in set name"
    searchKeyword: String
    "Filter by record status"
    status: [Int]
  }

  input TireSetWhereInput {
    "Tire set ID to update or remove"
    id: ID
  }

  type Query {
    "List tire sets with optional filtering and pagination"
    tireSetList(filter: TireSetFilter, params: PaginationAndSorting): TireSetResult
    "Get a single tire set by ID"
    tireSetGet(id: ID): TireSetResult
    "Get multiple tire sets by IDs"
    tireSetGetMany(ids: [ID]): TireSetResult
  }

  type Mutation {
    "Create a new tire set with items"
    tireSetCreate(params: TireSetInput): TireSetResult
    "Update a tire set and its items"
    tireSetUpdate(where: TireSetWhereInput, params: TireSetInput): TireSetResult
    "Soft-delete a tire set and its items"
    tireSetRemove(where: TireSetWhereInput): TireSetResult
    "Soft-delete multiple tire sets"
    tireSetRemoveMany(where: [TireSetWhereInput]): TireSetResult
    "Swap tire sets: install a stored set, store the current active set"
    tireSetSwap(params: TireSetSwapInput): TireSetSwapResult
  }
`;

export default typeDefs;