// ./src/app/graphql/types/travelTrackingTypes.ts

const typeDefs = `#graphql
  # ===========================================================================
  # Types
  # ===========================================================================

  "A single GPS tracking point recorded during live travel tracking"
  type TrackingPoint {
    "Unique tracking point identifier"
    id: ID
    "Account that owns this record"
    accountId: ID
    "Travel this point belongs to"
    travelId: ID
    "Segment index (incremented on each pause/resume cycle)"
    segmentId: Int
    "Monotonically increasing sequence number, global per travel"
    seq: Int
    "GPS latitude"
    latitude: Float
    "GPS longitude"
    longitude: Float
    "Altitude in meters above sea level"
    altitude: Float
    "Speed in m/s from GPS"
    speed: Float
    "Heading in degrees 0-360 from GPS"
    heading: Float
    "GPS accuracy in meters"
    accuracy: Float
    "When the GPS reading was taken on the device"
    recordedAt: String
    "When the record was inserted into the database"
    createdAt: String
  }

  type TrackingPointResult implements OpResult {
    "Operation result code"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "List of tracking points"
    data: [TrackingPoint!]
  }

  # ===========================================================================
  # Inputs
  # ===========================================================================

  "A single GPS tracking point submitted from the client"
  input TrackingPointInput {
    "GPS latitude (-90 to 90)"
    latitude: Float!
    "GPS longitude (-180 to 180)"
    longitude: Float!
    "Altitude in meters above sea level"
    altitude: Float
    "Speed in m/s from GPS"
    speed: Float
    "Heading in degrees 0-360 from GPS"
    heading: Float
    "GPS accuracy in meters"
    accuracy: Float
    "When the GPS reading was taken on the device (ISO 8601)"
    recordedAt: String!
    "Sequence number, monotonically increasing per travel"
    seq: Int!
  }

  "Input for submitting a batch of tracking points"
  input TravelTrackingAddPointsInput {
    "Array of GPS tracking points"
    points: [TrackingPointInput!]!
    "Current GPS-derived total distance in km (running total from client)"
    gpsDistance: Float!
  }

  input TrackingPointFilter {
    "Filter by travel ID"
    travelId: ID
    "Filter by account ID"
    accountId: [ID]
    "Filter by segment ID"
    segmentId: Int
  }

  # ===========================================================================
  # Queries & Mutations
  # ===========================================================================

  type Query {
    "List tracking points for a travel with optional segment filter"
    trackingPointList(filter: TrackingPointFilter, params: PaginationAndSorting): TrackingPointResult
  }

  type Mutation {
    "Submit a batch of filtered GPS tracking points from the client"
    travelTrackingAddPoints(where: TravelWhereInput, params: TravelTrackingAddPointsInput): TravelResult

    "Discard all tracking data. Hard-deletes points and resets tracking fields on the travel."
    travelTrackingDiscard(where: TravelWhereInput): TravelResult
  }
`;

export default typeDefs;