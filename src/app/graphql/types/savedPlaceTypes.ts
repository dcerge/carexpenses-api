// ./src/app/graphql/types/savedPlaceTypes.ts
const typeDefs = `#graphql
  """
  A saved/favorite location that can be quickly selected when creating
  travel waypoints, expenses, or refuels. Supports GPS proximity auto-matching.
  """
  type SavedPlace @key(fields: "id") {
    id: ID
    
    # ==========================================================================
    # Place identity
    # ==========================================================================
    
    "Display label: Home, Acme Corp, Shell on 5th"
    name: String
    
    "Lowercase name for case-insensitive operations"
    normalizedName: String
    
    """
    Place type for grouping and smart sorting:
    home, office, client, gas_station, mechanic, store, other
    """
    placeType: String
    
    "When true, only visible to the user who created it"
    isPrivate: Boolean
    
    # ==========================================================================
    # Place name and address
    # ==========================================================================
    
    "Place/business name (maps to expense_bases.where_done)"
    whereDone: String
    
    "Street address"
    address1: String
    
    "PO Box, Apartment, Suite, etc."
    address2: String
    
    city: String
    postalCode: String
    stateProvince: String
    
    "Country full name"
    country: String
    
    "Country code: US, CA, FR, RU, etc"
    countryId: String
    
    # ==========================================================================
    # Coordinates and proximity
    # ==========================================================================
    
    latitude: Float
    longitude: Float
    
    "Auto-match radius in meters for GPS proximity detection (default: 150)"
    radiusM: Int
    
    # ==========================================================================
    # Usage tracking
    # ==========================================================================
    
    "Number of times this place has been selected"
    useCount: Int
    
    "Last time this place was selected"
    lastUsedAt: String
    
    # ==========================================================================
    # Sort order
    # ==========================================================================
    
    orderNo: Float
    
    # ==========================================================================
    # Status and audit fields
    # ==========================================================================
    
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    createdAt: String
    updatedAt: String
    
    # ==========================================================================
    # Resolved references
    # ==========================================================================
    
    userCreated: User
    userUpdated: User
  }

  type SavedPlaceResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [SavedPlace!]
  }

  input SavedPlaceInput {
    id: ID
    
    "Display label"
    name: String
    
    """
    Place type: home, office, client, gas_station, mechanic, store, other
    """
    placeType: String
    
    "When true, only visible to the creator"
    isPrivate: Boolean
    
    "Place/business name"
    whereDone: String
    
    "Street address"
    address1: String
    
    "PO Box, Apartment, Suite, etc."
    address2: String
    
    city: String
    postalCode: String
    stateProvince: String
    country: String
    
    "Country code: US, CA, FR, RU, etc"
    countryId: String
    
    latitude: Float
    longitude: Float
    
    "Auto-match radius in meters (default: 150)"
    radiusM: Int
    
    orderNo: Float
    status: Int
  }

  input SavedPlaceFilter {
    id: [ID]
    accountId: [ID]
    
    "Filter by place type(s)"
    placeType: [String]
    
    "Filter by privacy flag"
    isPrivate: Boolean
    
    "Filter by creator"
    createdBy: [ID]
    
    "Filter by status"
    status: [Int]
    
    "Search in name, whereDone, address1, city"
    searchKeyword: String
  }

  input SavedPlaceProximityInput {
    "Current GPS latitude"
    latitude: Float!
    
    "Current GPS longitude"
    longitude: Float!
    
    "Override default radius in meters (uses each place's own radius_m if not provided)"
    radiusM: Int
  }

  input SavedPlaceWhereInput {
    id: ID
  }

  type Query {
    "List saved places with filtering and pagination"
    savedPlaceList(filter: SavedPlaceFilter, params: PaginationAndSorting): SavedPlaceResult

    "Find saved places near GPS coordinates, ordered by distance"
    savedPlaceListByProximity(proximity: SavedPlaceProximityInput, filter: SavedPlaceFilter): SavedPlaceResult
    
    "Get a single saved place by ID"
    savedPlaceGet(id: ID): SavedPlaceResult
    
    "Get multiple saved places by IDs"
    savedPlaceGetMany(ids: [ID]): SavedPlaceResult
  }

  type Mutation {
    "Create a new saved place"
    savedPlaceCreate(params: SavedPlaceInput): SavedPlaceResult
    
    "Update an existing saved place"
    savedPlaceUpdate(where: SavedPlaceWhereInput, params: SavedPlaceInput): SavedPlaceResult
    
    "Soft-delete a saved place"
    savedPlaceRemove(where: SavedPlaceWhereInput): SavedPlaceResult
    
    "Soft-delete multiple saved places"
    savedPlaceRemoveMany(where: [SavedPlaceWhereInput]): SavedPlaceResult
  }
`;

export default typeDefs;