const typeDefs = `#graphql
  """
  Converted values with explicit units for distance and volume fields.
  Used for both car-specific units and user preference units.
  """
  type MonthlySummaryUnits {
    "Distance unit: km, mi"
    distanceUnit: String!
    "Volume unit: l, gal-us, gal-uk"
    volumeUnit: String!
    "Consumption unit: l100km, km-l, mpg-us, mpg-uk, mi-l"
    consumptionUnit: String!
    "Mileage at start of month in specified distance unit"
    startMileage: Float
    "Mileage at end of month in specified distance unit"
    endMileage: Float
    "Total distance from completed travels in specified distance unit"
    travelsDistance: Float
    "Total fuel volume purchased in specified volume unit"
    refuelsVolume: Float
    "Fuel volume for consumption calculation in specified volume unit"
    consumptionVolume: Float
    "Calculated fuel consumption in specified consumption unit"
    consumption: Float
  }

  type CarMonthlySummary @key(fields: "id") {
    id: ID
    carId: ID
    homeCurrency: String
    year: Int
    month: Int
    "Mileage at start of month (metric: km)"
    startMileage: Float
    "Mileage at end of month (metric: km)"
    endMileage: Float
    refuelsCount: Int
    expensesCount: Int
    refuelsTaxes: Float
    refuelsCost: Float
    expensesFees: Float
    expensesTaxes: Float
    expensesCost: Float
    "Total fuel volume purchased (metric: liters)"
    refuelsVolume: Float
    # Revenue tracking
    revenuesCount: Int
    revenuesAmount: Float
    # Maintenance tracking (expenses where is_it_maintenance = true)
    maintenanceCount: Int
    maintenanceCost: Float
    # Consumption tracking
    "Fuel volume for consumption calc (metric: liters)"
    consumptionVolume: Float
    isFirstRefuelMonth: Boolean
    # Checkpoint tracking
    checkpointsCount: Int
    # Travel tracking
    travelsCount: Int
    "Total distance from completed travels (metric: km)"
    travelsDistance: Float
    # Timestamps
    firstRecordAt: String
    lastRecordAt: String
    updatedAt: String
    car: Car
    "Values converted to car's preferred units (mileageIn, mainTankVolumeEnteredIn)"
    inCarUnits: MonthlySummaryUnits
    "Values converted to user's preferred units (distanceIn, volumeIn from profile)"
    inUserUnits: MonthlySummaryUnits
  }

  type CarMonthlySummaryResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [CarMonthlySummary!]
  }

  input CarMonthlySummaryFilter {
    id: [ID]
    carId: [ID]
    homeCurrency: [String]
    year: [Int]
    month: [Int]
  }

  type Query {
    carMonthlySummaryList(filter: CarMonthlySummaryFilter, params: PaginationAndSorting): CarMonthlySummaryResult
    carMonthlySummaryGet(id: ID): CarMonthlySummaryResult
    carMonthlySummaryGetMany(ids: [ID]): CarMonthlySummaryResult
  }
`;

export default typeDefs;