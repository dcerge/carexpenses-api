// ./src/app/graphql/types/vehicleTaskTypes.ts
const typeDefs = `#graphql
  """
  Per-vehicle to-do task for ad-hoc items that don't fit into the scheduled
  maintenance system: "buy new wipers," "renew parking permit," "schedule
  inspection," etc.  Tasks can have due dates, priorities, recurrence, and can
  optionally convert to an expense record upon completion.
  """
  type VehicleTask @key(fields: "id") {
    id: ID
    accountId: ID
    orderNo: Float

    "Reference to the vehicle this task belongs to (null = account-wide task)"
    carId: ID

    "User who should complete the task (null = unassigned)"
    assignedToUserId: ID

    """
    Task priority:
    - 100: Low (no urgency)
    - 200: Medium (should be done soon)
    - 300: High (needs immediate attention)
    """
    priority: Int

    # ==========================================================================
    # Task details
    # ==========================================================================

    "Short task description"
    title: String

    "Additional details or instructions"
    notes: String

    "Task type for grouping: administrative, purchase, appointment, seasonal, repair, etc."
    category: String

    # ==========================================================================
    # Dates
    # ==========================================================================

    "Optional due date/time in UTC"
    dueDate: String

    "When to send a reminder notification (in UTC)"
    reminderDate: String

    # ==========================================================================
    # Recurrence (same pattern as expense schedules)
    # ==========================================================================

    """
    Recurrence type:
    - weekly: repeats on specified days of week (1=Mon, 7=Sun)
    - monthly: repeats on specified days of month (1-31, 'last')
    - yearly: repeats on specified dates (MM-DD format)
    - one-time: no recurrence (default)
    """
    scheduleType: String

    """
    Days/dates for recurrence. Format depends on scheduleType:
    - weekly: "1,3,5" (1=Mon, 7=Sun)
    - monthly: "1,15,last"
    - yearly: "01-15,06-15"
    - one-time: "2026-06-20" or null
    """
    scheduleDays: String

    # ==========================================================================
    # Completion
    # ==========================================================================

    "When the task was marked complete (in UTC)"
    completedAt: String

    "User who completed the task"
    completedByUserId: ID

    "Reference to expense created from this task via 'convert to expense' workflow"
    linkedExpenseId: ID

    # ==========================================================================
    # Status and audit fields
    # ==========================================================================

    """
    Task status:
    - 50: In Progress (someone is working on it)
    - 100: Todo (pending, not yet started)
    - 300: Complete (done)
    - 10000: Removed (soft-deleted)
    """
    status: Int

    version: Int

    createdBy: ID
    updatedBy: ID
    createdAt: String
    updatedAt: String

    # ==========================================================================
    # Computed urgency fields (calculated server-side in processItemOnOut)
    # ==========================================================================

    "Whether the task is past its due date and not complete/removed"
    isOverdue: Boolean

    "Number of days until due date (negative = overdue days). Null if no due date or task is complete/removed."
    daysUntilDue: Int

    """
    Urgency classification (computed from status and due date):
    - overdue: past due date
    - due_soon: due within the user's notification threshold
    - in_progress: actively being worked on
    - upcoming: has a due date in the future beyond the threshold
    - no_due_date: active task without a due date
    - complete: task is done
    """
    urgencyStatus: String

    # ==========================================================================
    # Resolved references
    # ==========================================================================

    account: Account
    car: Car
    "User assigned to complete this task"
    assignedToUser: User
    "User who completed this task"
    completedByUser: User
    "Linked expense record (if task was converted to expense)"
    linkedExpense: Expense
    userCreated: User
    userUpdated: User
  }

  type VehicleTaskResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [VehicleTask]
  }

  input VehicleTaskInput {
    id: ID
    orderNo: Float

    "Vehicle this task belongs to (null = account-wide task)"
    carId: ID

    "User who should complete the task"
    assignedToUserId: ID

    "Priority: 100=Low, 200=Medium, 300=High"
    priority: Int

    # Task details
    "Short task description"
    title: String

    "Additional details or instructions"
    notes: String

    "Task type for grouping"
    category: String

    # Dates
    "Due date/time in UTC"
    dueDate: String

    "When to send a reminder notification (in UTC)"
    reminderDate: String

    # Recurrence
    "Recurrence type: weekly, monthly, yearly, one-time"
    scheduleType: String

    "Recurrence days/dates (format depends on scheduleType)"
    scheduleDays: String

    # Completion
    "When the task was completed (in UTC, set automatically on status change)"
    completedAt: String

    "User who completed the task (set automatically on status change)"
    completedByUserId: ID

    "Link to an expense record"
    linkedExpenseId: ID

    "Status: 100=Todo, 200=In Progress, 300=Complete"
    status: Int
  }

  input VehicleTaskFilter {
    id: [ID]
    accountId: [ID]
    carId: [ID]
    assignedToUserId: [ID]
    completedByUserId: [ID]
    "Filter by priority: 100=Low, 200=Medium, 300=High"
    priority: [Int]
    "Filter by category"
    category: [String]
    "Filter by schedule type: weekly, monthly, yearly, one-time"
    scheduleType: [String]
    "Filter by status: 100=Todo, 200=In Progress, 300=Complete"
    status: [Int]
    "Filter tasks with due date on or after this date"
    dueDateFrom: String
    "Filter tasks with due date on or before this date"
    dueDateTo: String
    "Filter tasks with reminder date on or after this date"
    reminderDateFrom: String
    "Filter tasks with reminder date on or before this date"
    reminderDateTo: String
    "Filter by linked expense"
    linkedExpenseId: [ID]
    "Search in title, notes, category"
    searchKeyword: String
  }

  input VehicleTaskWhereInput {
    id: ID
  }

  input VehicleTaskDashboardInput {
    "Filter by specific vehicle(s). Null = all accessible vehicles."
    carId: [ID]

    "Number of days ahead to consider 'due soon'. Falls back to UserProfile.notifyInDays if not provided."
    dueSoonDays: Int

    "Maximum number of tasks to return (default: 20)"
    limit: Int
  }

  type Query {
    "List vehicle tasks with filtering and pagination"
    vehicleTaskList(filter: VehicleTaskFilter, params: PaginationAndSorting): VehicleTaskResult

    "Get a single vehicle task by ID"
    vehicleTaskGet(id: ID): VehicleTaskResult

    "Get multiple vehicle tasks by IDs"
    vehicleTaskGetMany(ids: [ID]): VehicleTaskResult

    "Get tasks needing attention for the dashboard widget (overdue, due soon, in progress)"
    vehicleTaskDashboard(params: VehicleTaskDashboardInput): VehicleTaskResult
  }

  type Mutation {
    "Create a new vehicle task"
    vehicleTaskCreate(params: VehicleTaskInput): VehicleTaskResult

    "Update an existing vehicle task"
    vehicleTaskUpdate(where: VehicleTaskWhereInput, params: VehicleTaskInput): VehicleTaskResult

    "Mark a task as complete (sets status=300, completedAt, completedByUserId)"
    vehicleTaskComplete(where: VehicleTaskWhereInput): VehicleTaskResult

    "Soft-delete a vehicle task"
    vehicleTaskRemove(where: VehicleTaskWhereInput): VehicleTaskResult

    "Soft-delete multiple vehicle tasks"
    vehicleTaskRemoveMany(where: [VehicleTaskWhereInput]): VehicleTaskResult
  }
`;

export default typeDefs;