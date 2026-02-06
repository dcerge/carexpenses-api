// ./src/app/graphql/types/vehicleRecallTypes.ts
const typeDefs = `#graphql
  """
  Vehicle safety recall from NHTSA (US) or Transport Canada,
  linked to a specific user vehicle with user-managed status tracking.
  Combines data from vehicle_recall_statuses (per-user) and vehicle_recalls (shared catalog).
  """
  type VehicleRecall @key(fields: "id") {
    "Vehicle recall status ID (from vehicle_recall_statuses)"
    id: ID
    "User's car this recall applies to"
    carId: ID
    "Reference to the shared recall record"
    vehicleRecallId: ID

    # ==========================================================================
    # User status fields (from vehicle_recall_statuses)
    # ==========================================================================

    "When the user dismissed this recall"
    dismissedAt: String
    "When the user marked this recall as resolved/repaired"
    resolvedAt: String
    "User notes about this recall (e.g. repair details, dealer info)"
    userNotes: String

    """
    User status for this recall:
    - 100: Active (needs attention)
    - 5000: Dismissed (user chose to ignore)
    - 10000: Resolved (repaired/fixed)
    """
    status: Int
    "When this recall was first linked to the user's vehicle"
    createdAt: String

    # ==========================================================================
    # Recall detail fields (from vehicle_recalls shared catalog)
    # ==========================================================================

    "Recall data source: NHTSA (US) or TC (Canada)"
    source: String
    "Unique campaign/recall number from the source"
    campaignNumber: String
    "Manufacturer name as reported by the source"
    manufacturer: String
    "Affected component (e.g. SUSPENSION:REAR)"
    component: String
    "System type affected (primarily used by Transport Canada)"
    systemType: String
    "Recall summary / description of the defect"
    summary: String
    "Potential consequences of the defect"
    consequence: String
    "Remedy / corrective action description"
    remedy: String
    "Additional notes from the source"
    recallNotes: String
    "Date the recall report was received by the authority (YYYY-MM-DD)"
    reportReceivedDate: String
    "Vehicle should not be driven until repaired (NHTSA Do Not Drive)"
    parkIt: Boolean
    "Vehicle should be parked away from structures (fire/explosion risk)"
    parkOutside: Boolean
    "Recall can be resolved via over-the-air software update"
    otaUpdate: Boolean

    # ==========================================================================
    # Resolved references
    # ==========================================================================

    "Vehicle this recall applies to"
    car: Car
  }

  type VehicleRecallResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [VehicleRecall!]
  }

  """
  Recall counts grouped by user status, used for dashboard badges.
  """
  type VehicleRecallCounts {
    "Number of active/open recalls needing attention"
    active: Int
    "Number of recalls dismissed by the user"
    dismissed: Int
    "Number of recalls marked as resolved/repaired"
    resolved: Int
  }

  type VehicleRecallCountsResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [VehicleRecallCounts!]
  }

  type VehicleRecallRefresh {
    "Number of lookup records queued for re-fetch"
    queued: Int
  }

  type VehicleRecallRefreshResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [VehicleRecallRefresh!]
  }

  input VehicleRecallFilter {
    "Filter by recall status ID(s)"
    id: [ID]
    "Filter by car ID(s)"
    carId: [ID]
    """
    Filter by user status:
    - 100: Active
    - 5000: Dismissed
    - 10000: Resolved
    """
    statusFilter: [Int]
    "Search in summary, component, consequence, remedy, campaign number"
    searchKeyword: String
  }

  input VehicleRecallWhereInput {
    "Vehicle recall status row ID (if user has already acted on this recall)"
    id: ID
    "Shared recall catalog record ID (required for first-time actions)"
    vehicleRecallId: ID
    "Car ID (required for first-time actions)"
    carId: ID
  }

  input VehicleRecallUpdateInput {
    """
    New status for the recall:
    - 100: Active (reopen a dismissed or resolved recall)
    - 5000: Dismissed (user chose to ignore)
    - 10000: Resolved (repaired/fixed)
    """
    status: Int
    "User notes about this recall (repair details, dealer info, etc.)"
    notes: String
  }

  input VehicleRecallCarWhereInput {
    "Car ID to refresh recalls for"
    carId: ID
  }

  type Query {
    "List vehicle recalls for user's cars with filtering and pagination"
    vehicleRecallList(filter: VehicleRecallFilter, params: PaginationAndSorting): VehicleRecallResult
    "Get recall counts by status for dashboard badges"
    vehicleRecallCounts(carId: ID): VehicleRecallCountsResult
  }

  type Mutation {
    "Update a vehicle recall status (dismiss, resolve, reopen, or update notes)"
    vehicleRecallUpdate(where: VehicleRecallWhereInput, params: VehicleRecallUpdateInput): VehicleRecallResult
    "Request a recall data refresh for a specific vehicle (queues for background fetch)"
    vehicleRecallRefresh(where: VehicleRecallCarWhereInput): VehicleRecallRefreshResult
  }
`;

export default typeDefs;