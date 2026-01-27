const typeDefs = `#graphql
  """
  Converted values with explicit units for distance and volume fields.
  Used for both car-specific units and user preference units.
  """
  type TotalSummaryUnits {
    "Distance unit: km, mi"
    distanceUnit: String!
    "Volume unit: l, gal-us, gal-uk"
    volumeUnit: String!
    "Consumption unit: l100km, km-l, mpg-us, mpg-uk, mi-l"
    consumptionUnit: String!
    "Latest known mileage in specified distance unit"
    latestKnownMileage: Float
    "First refuel odometer reading in specified distance unit"
    firstRefuelOdometer: Float
    "Consumption distance in specified distance unit"
    consumptionDistance: Float
    "Total travels distance in specified distance unit"
    totalTravelsDistance: Float
    "Total refuels volume in specified volume unit"
    totalRefuelsVolume: Float
    "First refuel volume in specified volume unit"
    firstRefuelVolume: Float
    "Consumption volume in specified volume unit"
    consumptionVolume: Float
    "Calculated fuel consumption in specified consumption unit"
    consumption: Float
  }

  type CarTotalSummary @key(fields: "carId homeCurrency") {
    carId: ID
    homeCurrency: String
    "Latest known mileage (metric: km)"
    latestKnownMileage: Float
    latestRefuelId: ID
    latestExpenseId: ID
    latestTravelId: ID
    totalRefuelsCount: Int
    totalExpensesCount: Int
    refuelsTaxes: Float
    totalRefuelsCost: Float
    expensesFees: Float
    expensesTaxes: Float
    totalExpensesCost: Float
    "Total refuels volume (metric: liters)"
    totalRefuelsVolume: Float
    # Revenue tracking
    totalRevenuesCount: Int
    totalRevenuesAmount: Float
    latestRevenueId: ID
    # Maintenance tracking (expenses where is_it_maintenance = true)
    totalMaintenanceCount: Int
    totalMaintenanceCost: Float
    # First refuel tracking (for consumption calculation)
    firstRefuelId: ID
    "First refuel odometer reading (metric: km)"
    firstRefuelOdometer: Float
    "First refuel volume (metric: liters)"
    firstRefuelVolume: Float
    # Consumption metrics (excluding first refuel)
    "Consumption volume (metric: liters)"
    consumptionVolume: Float
    "Consumption distance (metric: km)"
    consumptionDistance: Float
    # Checkpoint tracking
    totalCheckpointsCount: Int
    # Travel tracking
    totalTravelsCount: Int
    "Total travels distance (metric: km)"
    totalTravelsDistance: Float
    # Timestamps
    firstRecordAt: String
    lastRecordAt: String
    updatedAt: String
    # Relations
    car: Car
    latestRefuel: Expense
    latestExpense: Expense
    latestTravel: Travel
    latestRevenue: Expense
    firstRefuel: Expense
    "Values converted to car's preferred units (mileageIn, mainTankVolumeEnteredIn)"
    inCarUnits: TotalSummaryUnits
    "Values converted to user's preferred units (distanceIn, volumeIn from profile)"
    inUserUnits: TotalSummaryUnits
  }

  type CarTotalSummaryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarTotalSummary!]
  }

  input CarTotalSummaryFilter {
    carId: [ID]
    homeCurrency: [String]
  }

  type Query {
    carTotalSummaryList(filter: CarTotalSummaryFilter, params: PaginationAndSorting): CarTotalSummaryResult
    carTotalSummaryGet(carId: ID, homeCurrency: String): CarTotalSummaryResult
  }
`;

export default typeDefs;