const typeDefs = `#graphql
  type Travel @key(fields: "id") {
    "Unique travel record identifier"
    id: ID
    "Account that owns this travel record"
    accountId: ID
    "User who performed this travel"
    userId: ID
    "Vehicle used for this travel"
    carId: ID
    "Whether the travel is currently in progress"
    isActive: Boolean
    
    # Odometer tracking
    "Odometer reading at trip start"
    firstOdometer: Float
    "Odometer reading at trip end"
    lastOdometer: Float
    "Unit for odometer values: km or mi"
    odometerIn: String
    
    # Distance tracking
    "Trip distance (calculated from odometers or entered manually)"
    distance: Float
    "Unit for distance value: km or mi"
    distanceIn: String
    "Trip distance converted to kilometers (for reporting)"
    distanceKm: Float
    
    # Record references
    "ID of the first travel point (expense_base record)"
    firstRecordId: ID
    "ID of the last travel point (expense_base record)"
    lastRecordId: ID
    
    # Time tracking
    "Trip start date and time"
    firstDttm: String
    "Trip end date and time"
    lastDttm: String
    
    # Travel details
    "Purpose of the trip (e.g., Client meeting, Delivery)"
    purpose: String
    "Trip destination name or description"
    destination: String
    "Additional notes about the travel"
    comments: String
    
    # Tax categorization
    "Tax category: business, personal, medical, charity, commute"
    travelType: String
    "Whether this is a round trip (same route back)"
    isRoundTrip: Boolean
    
    # Reimbursement tracking
    "Mileage reimbursement rate per distance unit"
    reimbursementRate: Float
    "Currency for reimbursement rate (ISO 4217: USD, CAD, EUR)"
    reimbursementRateCurrency: String
    "Calculated reimbursement amount (rate × distance)"
    calculatedReimbursement: Float
    
    # Time tracking (for profitability)
    "Active driving/working time in minutes"
    activeMinutes: Int
    "Total trip time including waiting in minutes"
    totalMinutes: Int
    
    # System fields
    "Record status: 100=Draft, 200=Completed, 300=Submitted, etc."
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
    "User who performed this travel"
    user: User
    "Account that owns this travel"
    account: Account
    "Vehicle used for this travel"
    car: Car
    "Tags associated with this travel"
    tags: [ExpenseTag!]
    "First travel waypoint"
    firstRecord: Expense
    "Last travel waypoint"
    lastRecord: Expense
    "All travel waypoints"
    waypoints: [Expense]
    "User who created this record"
    userCreated: User
    "User who last updated this record"
    userUpdated: User
    "User who soft-deleted this record"
    userRemoved: User
  }

  type TravelResult implements OpResult {
    "Operation result code"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "List of travel records"
    data: [Travel!]
  }

  input TravelInput {
    "Vehicle ID for this travel"
    carId: ID
    "Whether the travel is in progress"
    isActive: Boolean
    
    # Distance tracking (manual entry when odometer not used)
    "Manual distance entry (when odometer not available)"
    distance: Float
    "Unit for manual distance: km or mi"
    distanceIn: String
    
    # Travel details
    "Purpose of the trip"
    purpose: String
    "Trip destination"
    destination: String
    "Additional notes"
    comments: String
    
    # Tax categorization
    "Tax category: business, personal, medical, charity, commute"
    travelType: String
    "Whether this is a round trip"
    isRoundTrip: Boolean
    
    # Reimbursement tracking
    "Mileage reimbursement rate per distance unit"
    reimbursementRate: Float
    "Currency for reimbursement rate (ISO 4217)"
    reimbursementRateCurrency: String
    
    # Time tracking (for profitability)
    "Active driving/working time in minutes"
    activeMinutes: Int
    "Total trip time in minutes"
    totalMinutes: Int
    
    # Tags
    "Array of tag IDs to associate with this travel"
    tagIds: [ID!]
    
    "Record status"
    status: Int

    "First waypoint information like odometer, place and location. Used only when you start a trip or when user enters past trips details"
    firstRecord: ExpenseInput
    "First waypoint information like odometer, place and location. Used only when you close a trip or when user enters past trips details"
    lastRecord: ExpenseInput

    "Save the place. If true then use whereDone, location, address1, address2 and other address related fields to create a record in saved placed and use its reference"
    savePlace: Boolean
    "If true then try to lookup a saved place by coordinates and use its ID as savedPlaceId and fill out whereDone, location, address1 and other places"
    lookupSavedPlaceByCoordinates: Boolean
  }

  input TravelFilter {
    "Filter by travel ID(s)"
    id: [ID]
    "Filter by account ID(s)"
    accountId: [ID]
    "Filter by user ID(s) who performed the travel"
    userId: [ID]
    "Filter by vehicle ID(s)"
    carId: [ID]
    "Filter by active/completed status"
    isActive: Boolean
    "Filter by purpose (exact match)"
    purpose: [String]
    "Filter by destination (exact match)"
    destination: [String]
    
    # Tax/type filters
    "Filter by tax category: business, personal, medical, charity, commute"
    travelType: [String]
    "Filter by round trip flag"
    isRoundTrip: Boolean
    
    # Date range filters
    "Filter trips starting on or after this date (ISO 8601)"
    firstDttmFrom: String
    "Filter trips starting on or before this date (ISO 8601)"
    firstDttmTo: String
    "Filter trips ending on or after this date (ISO 8601)"
    lastDttmFrom: String
    "Filter trips ending on or before this date (ISO 8601)"
    lastDttmTo: String
    
    # Tag filter
    "Filter by associated tag ID(s)"
    tagId: [ID]
    
    "Filter by record status"
    status: [Int]
    "Search in purpose and destination fields"
    searchKeyword: String
  }

  input TravelWhereInput {
    "Travel ID to update or remove"
    id: ID
  }

  type Query {
    "List travels with optional filtering and pagination"
    travelList(filter: TravelFilter, params: PaginationAndSorting): TravelResult
    "Get a single travel by ID"
    travelGet(id: ID): TravelResult
    "Get multiple travels by IDs"
    travelGetMany(ids: [ID]): TravelResult
  }

  type Mutation {
    "Create a new travel record"
    travelCreate(params: TravelInput): TravelResult
    "Update an existing travel record"
    travelUpdate(where: TravelWhereInput, params: TravelInput): TravelResult
    "Soft-delete a travel record"
    travelRemove(where: TravelWhereInput): TravelResult
    "Soft-delete multiple travel records"
    travelRemoveMany(where: [TravelWhereInput]): TravelResult
  }
`;

export default typeDefs;