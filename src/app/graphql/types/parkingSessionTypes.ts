// ./src/app/graphql/types/parkingSessionTypes.ts
const typeDefs = `#graphql
  """
  Real-time parking session tracking. Users start a session when they park,
  track duration and location, get walking directions back, and optionally
  generate a parking expense on session close. Each vehicle can have at most
  one active session at a time.
  """
  type ParkingSession @key(fields: "id") {
    id: ID
    accountId: ID

    "Vehicle this parking session belongs to"
    carId: ID

    "Associated travel record (if parked during a trip)"
    travelId: ID

    # ==========================================================================
    # Timing
    # ==========================================================================

    "When parking started (UTC)"
    startTime: String

    "When parking ended, null while active (UTC)"
    endTime: String

    "Paid duration in minutes (null = free or unknown duration)"
    durationMinutes: Int

    # ==========================================================================
    # Pricing
    # ==========================================================================

    "Price entered at start (nullable)"
    initialPrice: Float

    "Price confirmed at end (nullable)"
    finalPrice: Float

    "Currency code: USD, CAD, EUR, etc."
    currency: String

    # ==========================================================================
    # Location
    # ==========================================================================

    "GPS latitude of parking location"
    latitude: Float

    "GPS longitude of parking location"
    longitude: Float

    "Reverse-geocoded or manually entered address"
    formattedAddress: String

    # ==========================================================================
    # Attachments & notes
    # ==========================================================================

    "Reference to a photo from the parking spot"
    uploadedFileId: ID

    "User notes (e.g., Level 3, spot B12, next to the blue pillar)"
    notes: String

    # ==========================================================================
    # Linked expense
    # ==========================================================================

    "Reference to the auto-generated expense (set on close when finalPrice > 0)"
    expenseId: ID

    # ==========================================================================
    # User tracking
    # ==========================================================================

    "User who started the session"
    startedBy: ID

    "User who ended the session"
    endedBy: ID

    # ==========================================================================
    # Status and audit fields
    # ==========================================================================

    """
    Session status:
    - 100: Active (parking in progress)
    - 200: Completed (session ended)
    """
    status: Int

    version: Int

    createdBy: ID
    updatedBy: ID
    createdAt: String
    updatedAt: String

    # ==========================================================================
    # Resolved references
    # ==========================================================================

    account: Account
    car: Car
    travel: Travel
    "The auto-generated parking expense (if finalPrice > 0)"
    expense: Expense
    "User who started the session"
    userStarted: User
    "User who ended the session"
    userEnded: User
    userCreated: User
    userUpdated: User
  }

  type ParkingSessionResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [ParkingSession]
  }

  input ParkingSessionInput {
    id: ID

    "Vehicle this parking session belongs to"
    carId: ID

    "Associated travel record"
    travelId: ID

    # Timing
    "When parking started (UTC)"
    startTime: String

    "When parking ended (UTC)"
    endTime: String

    "Paid duration in minutes (null = free or unknown)"
    durationMinutes: Int

    # Pricing
    "Price entered at start"
    initialPrice: Float

    "Price confirmed at end (0 or null = free parking, no expense created)"
    finalPrice: Float

    "Currency code (defaults to vehicle/account home currency)"
    currency: String

    # Location
    "GPS latitude"
    latitude: Float

    "GPS longitude"
    longitude: Float

    "Address text"
    formattedAddress: String

    # Attachments & notes
    "Photo of parking spot"
    uploadedFileId: ID

    "Notes (e.g., Level 3, spot B12)"
    notes: String

    """
    Session status:
    - 100: Active (parking in progress)
    - 200: Completed (session ended)
    """
    status: Int
  }

  input ParkingSessionFilter {
    id: [ID]
    accountId: [ID]
    carId: [ID]
    travelId: [ID]
    expenseId: [ID]
    startedBy: [ID]
    endedBy: [ID]
    "Filter by status: 100=Active, 200=Completed"
    status: [Int]
    "Filter sessions starting on or after this date"
    startTimeFrom: String
    "Filter sessions starting on or before this date"
    startTimeTo: String
    "Filter sessions ending on or after this date"
    endTimeFrom: String
    "Filter sessions ending on or before this date"
    endTimeTo: String
    "Search in address and notes"
    searchKeyword: String
  }

  input ParkingSessionWhereInput {
    id: ID
  }

  type Query {
    "List parking sessions with filtering and pagination (active + history)"
    parkingSessionList(filter: ParkingSessionFilter, params: PaginationAndSorting): ParkingSessionResult

    "Get a single parking session by ID"
    parkingSessionGet(id: ID): ParkingSessionResult

    "Get multiple parking sessions by IDs"
    parkingSessionGetMany(ids: [ID]): ParkingSessionResult
  }

  type Mutation {
    "Create a new parking session (start parking)"
    parkingSessionCreate(params: ParkingSessionInput): ParkingSessionResult

    "Update a parking session (edit details, end parking)"
    parkingSessionUpdate(where: ParkingSessionWhereInput, params: ParkingSessionInput): ParkingSessionResult

    "Soft-delete a parking session"
    parkingSessionRemove(where: ParkingSessionWhereInput): ParkingSessionResult
  }
`;

export default typeDefs;