const typeDefs = `#graphql
  """
  Unified type for all financial records: expenses, refuels, checkpoints, travel points, and revenues.
  The expenseType field determines which specific fields are populated:
  - 1 = Refuel: uses refuel-specific fields (refuelVolume, pricePerVolume, etc.)
  - 2 = Expense: uses expense-specific fields (kindId references expense_kinds, costWork, costParts, etc.)
  - 3 = Checkpoint: uses only common fields (odometer, fuelInTank, comments)
  - 4 = Travel Point: uses common fields + pointType, linked to a travel via travelId
  - 5 = Revenue: uses revenue-specific fields (kindId references revenue_kinds, shortNote)
  """
  type Expense @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    carId: ID
    
    """
    Discriminator field: 1=Refuel, 2=Expense, 3=Checkpoint, 4=Travel Point, 5=Revenue
    """
    expenseType: Int
    
    # ==========================================================================
    # Common fields (from expense_bases) - used by ALL expense types
    # ==========================================================================
    
    "Odometer reading at time of record"
    odometer: Float
    "Trip meter reading"
    tripMeter: Float
    "Calculated fuel consumption (derived)"
    consumption: Float
    "Date/time when the record occurred"
    whenDone: String
    "Location/address (legacy field - use structured address fields instead)"
    location: String
    "Place name (gas station, service center, etc.)"
    whereDone: String
    "Subtotal before tax and fees"
    subtotal: Float
    "Tax amount"
    tax: Float
    "Additional fees"
    fees: Float
    """
    Total amount in payment currency.
    For expenses/refuels: money spent (positive = cost)
    For revenues: money earned (positive = income)
    """
    totalPrice: Float
    "Currency used for payment (ISO 4217 code)"
    paidInCurrency: String
    "Total price converted to user's home currency"
    totalPriceInHc: Float
    "User's home currency at time of record (ISO 4217 code)"
    homeCurrency: String
    "Legacy picture ID (deprecated, use uploadedFiles)"
    expensePictureId: ID
    "Additional comments/notes"
    comments: String
    "Estimated fuel percentage in tank (0-100)"
    fuelInTank: Float
    "Reference to travel record if this record is part of a trip"
    travelId: ID
    "Owner number at time of record (for vehicles with multiple owners over time)"
    ownerNumber: Int
    
    # ==========================================================================
    # Address fields
    # ==========================================================================
    
    "Street address"
    address1: String
    "PO Box, Apartment, Suite, etc."
    address2: String
    "City"
    city: String
    "Postal Code/Zip"
    postalCode: String
    "State or Province"
    stateProvince: String
    "Country full name"
    country: String
    "Country code: US, CA, FR, RU, etc."
    countryId: String
    
    # ==========================================================================
    # Coordinates
    # ==========================================================================
    
    "Location longitude"
    longitude: Float
    "Location latitude"
    latitude: Float
    
    # ==========================================================================
    # Weather data (auto-populated based on location and time)
    # ==========================================================================
    
    "Temperature in Celsius"
    weatherTempC: Float
    "Feels like temperature (wind chill/heat index) in Celsius"
    weatherFeelsLikeC: Float
    "Weather condition code: clear, rain, snow, etc."
    weatherConditionCode: String
    "Weather provider icon code for UI display"
    weatherConditionIcon: String
    "Human-readable weather description"
    weatherDescription: String
    "Humidity percentage 0-100"
    weatherHumidityPct: Int
    "Atmospheric pressure in hectopascals"
    weatherPressureHpa: Int
    "Cloud cover percentage 0-100"
    weatherCloudPct: Int
    "Visibility in meters"
    weatherVisibilityM: Int
    "Wind speed in meters per second"
    weatherWindSpeedMps: Float
    "Wind direction in degrees 0-359"
    weatherWindDirDeg: Int
    "Precipitation in mm (last hour)"
    weatherPrecipMm: Float
    "UV index"
    weatherUvIndex: Float
    "Weather data provider: openweathermap, weatherapi, etc."
    weatherProvider: String
    "When weather data was retrieved from provider"
    weatherFetchedAt: String
    
    # ==========================================================================
    # Travel Point-specific fields (expenseType = 4)
    # ==========================================================================
    
    """
    Type of location for travel waypoints (expenseType=4 only).
    Used for tax compliance - IRS/CRA rules differ based on start/end point types.
    Values: home, office, client, other
    """
    pointType: String
    
    # ==========================================================================
    # Expense-specific fields (expenseType = 2)
    # ==========================================================================
    
    """
    Kind ID - interpretation depends on expenseType:
    - For expenseType=2 (Expense): references expense_kinds table
    - For expenseType=5 (Revenue): references revenue_kinds table
    """
    kindId: Int
    "Cost of labor/work portion (expenseType=2 only)"
    costWork: Float
    "Cost of parts/materials portion (expenseType=2 only)"
    costParts: Float
    "Cost of labor in home currency (expenseType=2 only)"
    costWorkHc: Float
    "Cost of parts in home currency (expenseType=2 only)"
    costPartsHc: Float
    "Brief note about the expense or revenue (expenseType=2,5)"
    shortNote: String
    
    # ==========================================================================
    # Refuel-specific fields (expenseType = 1)
    # ==========================================================================
    
    "Volume of fuel added (expenseType=1 only)"
    refuelVolume: Float
    "Unit for volume: 'l' (liters), 'gal-us', 'gal-uk' (expenseType=1 only)"
    volumeEnteredIn: String
    "Price per unit volume (expenseType=1 only)"
    pricePerVolume: Float
    "Whether tank was filled completely (expenseType=1 only)"
    isFullTank: Boolean
    "Estimated fuel remaining before refuel (expenseType=1 only)"
    remainingInTankBefore: Float
    "Fuel grade/type: Regular, Premium, Diesel, etc. (expenseType=1 only)"
    fuelGrade: String
    
    # ==========================================================================
    # Audit fields
    # ==========================================================================
    
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
    
    user: User
    account: Account
    car: Car
    travel: Travel
    "Expense kind - populated when expenseType=2"
    expenseKind: ExpenseKind
    "Revenue kind - populated when expenseType=5"
    revenueKind: RevenueKind
    userCreated: User
    userUpdated: User
    userRemoved: User
    "References to uploaded file IDs"
    uploadedFilesIds: [ID]
    "Resolved uploaded files"
    uploadedFiles: [UploadedFile]
    "Associated tags"
    tags: [ExpenseTag]
  }

  type ExpenseResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [Expense!]
  }

  input ExpenseInput {
    id: ID
    accountId: ID
    carId: ID
    
    """
    Record type: 1=Refuel, 2=Expense, 3=Checkpoint, 4=Travel Point, 5=Revenue
    """
    expenseType: Int
    
    # Common fields
    odometer: Float
    whenDone: String
    location: String
    whereDone: String
    subtotal: Float
    tax: Float
    fees: Float
    totalPrice: Float
    paidInCurrency: String
    totalPriceInHc: Float
    homeCurrency: String
    comments: String
    fuelInTank: Float
    travelId: ID
    
    # ==========================================================================
    # Address fields
    # ==========================================================================
    
    "Street address"
    address1: String
    "PO Box, Apartment, Suite, etc."
    address2: String
    "City"
    city: String
    "Postal Code/Zip"
    postalCode: String
    "State or Province"
    stateProvince: String
    "Country full name"
    country: String
    "Country code: US, CA, FR, RU, etc."
    countryId: String
    
    # ==========================================================================
    # Coordinates
    # ==========================================================================
    
    "Location longitude"
    longitude: Float
    "Location latitude"
    latitude: Float
    
    # Note: Weather fields are NOT included in input - they are auto-populated
    # by the backend based on location coordinates and whenDone timestamp
    
    # Travel Point-specific fields (expenseType = 4)
    """
    Type of location for travel waypoints (expenseType=4 only).
    Values: home, office, client, other
    """
    pointType: String
    
    # Expense-specific fields (expenseType = 2)
    # Revenue-specific fields (expenseType = 5) - only kindId and shortNote apply
    """
    Kind ID:
    - For expenseType=2: ID from expense_kinds
    - For expenseType=5: ID from revenue_kinds
    """
    kindId: Int
    "Cost of labor (expenseType=2 only)"
    costWork: Float
    "Cost of parts (expenseType=2 only)"
    costParts: Float
    "Cost of labor in home currency (expenseType=2 only)"
    costWorkHc: Float
    "Cost of parts in home currency (expenseType=2 only)"
    costPartsHc: Float
    "Brief note (expenseType=2,5)"
    shortNote: String
    
    # Refuel-specific fields (expenseType = 1)
    refuelVolume: Float
    volumeEnteredIn: String
    pricePerVolume: Float
    isFullTank: Boolean
    remainingInTankBefore: Float
    fuelGrade: String
    
    status: Int

    "References to uploaded files"
    uploadedFilesIds: [ID]
    "Tag IDs to associate with this record"
    tags: [ID]
  }

  input ExpenseFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    carId: [ID]
    """
    Filter by expense type: 1=Refuel, 2=Expense, 3=Checkpoint, 4=Travel Point, 5=Revenue
    """
    expenseType: [Int]
    """
    Filter by kind ID. Note: kindId meaning depends on expenseType.
    Use with expenseType filter to ensure correct interpretation.
    """
    kindId: [Int]
    "Filter by travel ID (for records linked to a trip)"
    travelId: [ID]
    """
    Filter by point type (expenseType=4 only): home, office, client, other
    """
    pointType: [String]
    isFullTank: Boolean
    fuelGrade: [String]
    whenDoneFrom: String
    whenDoneTo: String
    
    # Location filters
    "Filter by city"
    city: [String]
    "Filter by state/province"
    stateProvince: [String]
    "Filter by country code (US, CA, FR, RU, etc.)"
    countryId: [String]
    
    # Weather condition filter
    "Filter by weather condition code: clear, rain, snow, etc."
    weatherConditionCode: [String]
    
    "Filter by tag IDs"
    tags: [ID]
    status: [Int]
    searchKeyword: String
  }

  input ExpenseWhereInput {
    id: ID
  }

  type Query {
    "List expenses/refuels/checkpoints/travel points/revenues with filtering and pagination"
    expenseList(filter: ExpenseFilter, params: PaginationAndSorting): ExpenseResult
    "Get a single record by ID"
    expenseGet(id: ID): ExpenseResult
    "Get multiple records by IDs"
    expenseGetMany(ids: [ID]): ExpenseResult
  }

  type Mutation {
    "Create a new expense/refuel/checkpoint/travel point/revenue record"
    expenseCreate(params: ExpenseInput): ExpenseResult
    "Update an existing record"
    expenseUpdate(where: ExpenseWhereInput, params: ExpenseInput): ExpenseResult
    "Soft-delete a record"
    expenseRemove(where: ExpenseWhereInput): ExpenseResult
    "Soft-delete multiple records"
    expenseRemoveMany(where: [ExpenseWhereInput]): ExpenseResult
  }
`;

export default typeDefs;