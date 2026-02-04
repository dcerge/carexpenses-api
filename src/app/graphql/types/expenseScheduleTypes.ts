// ./src/app/graphql/types/expenseScheduleTypes.ts
const typeDefs = `#graphql
  """
  Scheduled recurring expense configuration.
  Allows users to set up automatic expense creation for recurring costs like
  insurance, loan payments, monthly parking, subscriptions, etc.
  """
  type ExpenseSchedule @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    
    """
    Reference to expense_kinds table - determines the type of expense created
    """
    kindId: Int
    
    # ==========================================================================
    # Schedule configuration
    # ==========================================================================
    
    """
    Schedule frequency type:
    - weekly: expenses created on specified days of week (1=Mon, 7=Sun)
    - monthly: expenses created on specified days of month (1-31, 'last')
    - yearly: expenses created on specified dates (MM-DD format)
    - one-time: single future expense on specified date (YYYY-MM-DD)
    """
    scheduleType: String
    
    """
    Days/dates when expenses should be created. Format depends on scheduleType:
    - weekly: comma-separated day numbers, 1=Monday, 7=Sunday (e.g., "1,3,5")
    - monthly: comma-separated day numbers, 1-31, 'last' for last day (e.g., "1,15,last")
    - yearly: comma-separated MM-DD dates (e.g., "01-15,06-15")
    - one-time: single YYYY-MM-DD date (e.g., "2026-06-20")
    """
    scheduleDays: String
    
    "When the schedule becomes active"
    startAt: String
    
    "When the schedule stops (null = no end date)"
    endAt: String
    
    "Pre-computed next occurrence date"
    nextScheduledAt: String
    
    "When an expense was last created from this schedule"
    lastAddedAt: String
    
    "Reference to the most recently created expense from this schedule"
    lastCreatedExpenseId: ID
    
    # ==========================================================================
    # Expense template fields
    # ==========================================================================
    
    "Place name (insurance company, parking garage, loan provider, etc.)"
    whereDone: String
    
    "Labor cost template"
    costWork: Float
    
    "Parts cost template"
    costParts: Float
    
    "Tax amount template"
    tax: Float
    
    "Fees amount template"
    fees: Float
    
    "Subtotal in payment currency"
    subtotal: Float
    
    "Total price in payment currency"
    totalPrice: Float
    
    "Currency for created expenses (null = use user's home currency at time of creation)"
    paidInCurrency: String
    
    "Brief note template for generated expenses"
    shortNote: String
    
    "Additional comments template"
    comments: String
    
    # ==========================================================================
    # Status and audit fields
    # ==========================================================================
    
    """
    Schedule status:
    - 50: Paused (temporarily disabled)
    - 100: Active (will create expenses on schedule)
    - 200: Completed (for one-time schedules after execution)
    """
    status: Int
    
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    
    # ==========================================================================
    # Resolved references
    # ==========================================================================
    
    "User who will be attributed as owner of created expenses"
    user: User
    account: Account
    car: Car
    "Expense kind details"
    expenseKind: ExpenseKind
    "Most recently created expense from this schedule"
    lastCreatedExpense: Expense
    userCreated: User
    userUpdated: User
  }

  type ExpenseScheduleResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseSchedule!]
  }
  
  """
  Result for manual schedule execution (runNow mutation)
  """
  type ExpenseScheduleRunResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ExpenseSchedule!]
    "The expense that was created by running the schedule"
    createdExpense: Expense
  }

  input ExpenseScheduleInput {
    id: ID
    accountId: ID
    carId: ID
    
    "Reference to expense_kinds table"
    kindId: Int
    
    # Schedule configuration
    """
    Schedule frequency: weekly, monthly, yearly, one-time
    """
    scheduleType: String
    
    """
    Days/dates for expense creation. Format depends on scheduleType:
    - weekly: "1,3,5" (1=Mon, 7=Sun)
    - monthly: "1,15,last"
    - yearly: "01-15,06-15"
    - one-time: "2026-06-20"
    """
    scheduleDays: String
    
    "When schedule becomes active (defaults to tomorrow)"
    startAt: String
    
    "When schedule stops (null = no end)"
    endAt: String
    
    # Expense template fields
    "Place name for generated expenses"
    whereDone: String
    
    "Labor cost"
    costWork: Float
    
    "Parts cost"
    costParts: Float
    
    "Tax amount"
    tax: Float
    
    "Fees amount"
    fees: Float
    
    "Subtotal (if not provided, calculated as costWork + costParts)"
    subtotal: Float
    
    "Total price (if not provided, calculated as subtotal + tax + fees)"
    totalPrice: Float
    
    "Currency (null = use user's home currency)"
    paidInCurrency: String
    
    "Brief note for generated expenses"
    shortNote: String
    
    "Comments for generated expenses"
    comments: String
    
    """
    Status: 50=Paused, 100=Active
    """
    status: Int
  }

  input ExpenseScheduleFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    kindId: [Int]
    "Filter by schedule type: weekly, monthly, yearly, one-time"
    scheduleType: [String]
    "Filter by status: 50=Paused, 100=Active, 200=Completed"
    status: [Int]
    "Filter schedules with next occurrence on or after this date"
    nextScheduledAtFrom: String
    "Filter schedules with next occurrence on or before this date"
    nextScheduledAtTo: String
    "Search in whereDone, shortNote, comments"
    searchKeyword: String
  }

  input ExpenseScheduleWhereInput {
    id: ID
  }

  type Query {
    "List expense schedules with filtering and pagination"
    expenseScheduleList(filter: ExpenseScheduleFilter, params: PaginationAndSorting): ExpenseScheduleResult
    
    "Get a single expense schedule by ID"
    expenseScheduleGet(id: ID): ExpenseScheduleResult
    
    "Get multiple expense schedules by IDs"
    expenseScheduleGetMany(ids: [ID]): ExpenseScheduleResult
  }

  type Mutation {
    "Create a new expense schedule"
    expenseScheduleCreate(params: ExpenseScheduleInput): ExpenseScheduleResult
    
    "Update an existing expense schedule"
    expenseScheduleUpdate(where: ExpenseScheduleWhereInput, params: ExpenseScheduleInput): ExpenseScheduleResult
    
    "Pause an active schedule (sets status to 50)"
    expenseSchedulePause(where: ExpenseScheduleWhereInput): ExpenseScheduleResult
    
    "Resume a paused schedule (sets status to 100)"
    expenseScheduleResume(where: ExpenseScheduleWhereInput): ExpenseScheduleResult
    
    """
    Manually trigger expense creation from a schedule.
    Creates an expense for today's date regardless of the schedule timing.
    Useful for testing or catch-up scenarios.
    """
    expenseScheduleRunNow(where: ExpenseScheduleWhereInput): ExpenseScheduleRunResult
    
    "Soft-delete an expense schedule"
    expenseScheduleRemove(where: ExpenseScheduleWhereInput): ExpenseScheduleResult
    
    "Soft-delete multiple expense schedules"
    expenseScheduleRemoveMany(where: [ExpenseScheduleWhereInput]): ExpenseScheduleResult
  }
`;

export default typeDefs;