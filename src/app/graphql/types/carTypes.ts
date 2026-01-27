// ./src/app/graphql/types/carTypes.ts
const typeDefs = `#graphql
  type Car @key(fields: "id") {
    "Unique identifier for the car"
    id: ID
    "Account ID that owns this car"
    accountId: ID
    "User ID who created this car"
    userId: ID
    "User-defined car label/name"
    label: String
    "Vehicle Identification Number"
    vin: String
    "Vehicle model name"
    model: String
    "Vehicle color"
    color: String
    "Engine volume in cubic centimeters (cc)"
    engineVolume: Int
    "Year of manufacture"
    manufacturedIn: Int
    "Mileage unit: km, mi"
    mileageIn: String
    "Initial mileage when car was added to the system"
    initialMileage: Int
    "Type of fuel used (deprecated)"
    typeOfFuel: String @deprecated(reason: "Use mainTankFuelType instead")
    "Main fuel tank volume in liters (deprecated)"
    tankVolume: Int @deprecated(reason: "Use mainTankVolume instead")
    "Additional fuel tank volume in liters (deprecated)"
    additionalTankVolume: Int @deprecated(reason: "Use addlTankVolume instead")
    "Date when car was purchased (ISO 8601 format)"
    whenBought: String
    "Purchase price"
    boughtFor: Float
    "Currency of purchase price (ISO 4217 code)"
    boughtForCurrency: String
    "Seller name or dealer"
    boughtFrom: String
    "Date when car was sold (ISO 8601 format)"
    whenSold: String
    "Sale price"
    soldFor: Float
    "Currency of sale price (ISO 4217 code)"
    soldForCurrency: String
    "Buyer name"
    soldTo: String
    "Additional comments about the car"
    comments: String
    "Reference to car_body_types lookup table"
    bodyTypeId: Int
    "Reference to car_transmission_types lookup table"
    transmissionTypeId: Int
    "Reference to car_engine_types lookup table"
    engineTypeId: Int
    "Reference to vehicle_makes lookup table"
    makeId: Int
    "Reference to original car record if this car was transferred from another user"
    firstRecordId: ID
    "Owner sequence number (1 for first owner, 2 for second, etc.)"
    ownerNumber: Int
    "Reference to primary car image/attachment in entity_attachments table"
    entityAttachmentId: ID
    "Reference to the car's main image in the storage microservice"
    uploadedFileId: ID
    "Drive type: fwd, rwd, awd, 4wd, 4x4"
    driveType: String
    "Vehicle license plate number"
    licensePlate: String
    "Main tank fuel type: gasoline, diesel, electric, lpg, cng, hydrogen, e85, biodiesel, etc."
    mainTankFuelType: String
    "Main tank volume in the unit specified by mainTankVolumeEnteredIn"
    mainTankVolume: Float
    "Unit the main tank volume was entered in: l, gal-us, gal-uk, kwh"
    mainTankVolumeEnteredIn: String
    "Default fuel grade for main tank: regular, midgrade, premium, diesel, etc."
    mainTankDefaultGrade: String
    "Additional tank fuel type: gasoline, diesel, electric, lpg, cng, hydrogen, e85, biodiesel, etc."
    addlTankFuelType: String
    "Additional tank volume in the unit specified by addlTankVolumeEnteredIn"
    addlTankVolume: Float
    "Unit the additional tank volume was entered in: l, gal-us, gal-uk, kwh"
    addlTankVolumeEnteredIn: String
    "Default fuel grade for additional tank: regular, midgrade, premium, diesel, etc."
    addlTankDefaultGrade: String
    "Record status: 100 - active, 110 - paused, 200 - in rent, 300 0 in maintenance, 310 in repair, 1000 - sold, 10000 - trashed"
    status: Int
    "Optimistic locking version number"
    version: Int
    "User ID who created this record"
    createdBy: ID
    "User ID who last updated this record"
    updatedBy: ID
    "Timestamp when record was created (ISO 8601 format)"
    createdAt: String
    "Timestamp when record was last updated (ISO 8601 format)"
    updatedAt: String
    "User who created this car (resolved from userId)"
    user: User
    "Account that owns this car (resolved from accountId)"
    account: Account
    "User who created this record (resolved from createdBy)"
    userCreated: User
    "User who last updated this record (resolved from updatedBy)"
    userUpdated: User
    "Body type details (resolved from bodyTypeId)"
    carBodyType: CarBodyType
    "Transmission type details (resolved from transmissionTypeId)"
    carTransmissionType: CarTransmissionType
    "Engine type details (resolved from engineTypeId)"
    carEngineType: CarEngineType
    "Vehicle make details (resolved from makeId)"
    vehicleMake: VehicleMake
    "Primary attachment details (resolved from entityAttachmentId)"
    entityAttachment: EntityAttachment
    "IDs of all documents attached to this car"
    uploadedFilesIds: [ID]
    "All documents attached to this car (resolved from uploadedFilesIds)"
    uploadedFiles: [UploadedFile]
    "Car's main image (resolved from uploadedFileId)"
    uploadedFile: UploadedFile
    "Users assgigned to the car"
    carUsers: [UserCar]
  }

  type CarResult implements OpResult {
    "Operation result code: 0=Success, non-zero=Error"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "List of car records"
    data: [Car!]
  }

  input CarInput {
    "Car ID (required for update, omit for create)"
    id: ID
    "Account ID (usually set automatically from auth context)"
    accountId: ID
    "User-defined car label/name"
    label: String
    "Vehicle Identification Number"
    vin: String
    "Vehicle model name"
    model: String
    "Vehicle color"
    color: String
    "Engine volume in cubic centimeters (cc)"
    engineVolume: Int
    "Year of manufacture"
    manufacturedIn: Int
    "Mileage unit: km, mi"
    mileageIn: String
    "Initial mileage when car was added to the system"
    initialMileage: Int
    "Deprecated: Use mainTankFuelType instead"
    typeOfFuel: String
    "Deprecated: Use mainTankVolume instead"
    tankVolume: Int
    "Deprecated: Use addlTankVolume instead"
    additionalTankVolume: Int
    "Date when car was purchased (ISO 8601 format)"
    whenBought: String
    "Purchase price"
    boughtFor: Float
    "Currency of purchase price (ISO 4217 code)"
    boughtForCurrency: String
    "Seller name or dealer"
    boughtFrom: String
    "Date when car was sold (ISO 8601 format)"
    whenSold: String
    "Sale price"
    soldFor: Float
    "Currency of sale price (ISO 4217 code)"
    soldForCurrency: String
    "Buyer name"
    soldTo: String
    "Additional comments about the car"
    comments: String
    "Reference to car_body_types lookup table"
    bodyTypeId: Int
    "Reference to car_transmission_types lookup table"
    transmissionTypeId: Int
    "Reference to car_engine_types lookup table"
    engineTypeId: Int
    "Reference to vehicle_makes lookup table"
    makeId: Int
    "Reference to primary car image/attachment in entity_attachments table"
    entityAttachmentId: ID
    "Reference to the car's main image in the storage microservice"
    uploadedFileId: ID
    "IDs of documents to attach to this car"
    uploadedFilesIds: [ID]
    "Drive type: fwd, rwd, awd, 4wd, 4x4"
    driveType: String
    "Vehicle license plate number"
    licensePlate: String
    "Main tank fuel type: gasoline, diesel, electric, lpg, cng, hydrogen, e85, biodiesel, etc."
    mainTankFuelType: String
    "Main tank volume in the unit specified by mainTankVolumeEnteredIn"
    mainTankVolume: Float
    "Unit the main tank volume was entered in: l, gal-us, gal-uk, kwh"
    mainTankVolumeEnteredIn: String
    "Default fuel grade for main tank: regular, midgrade, premium, diesel, etc."
    mainTankDefaultGrade: String
    "Additional tank fuel type: gasoline, diesel, electric, lpg, cng, hydrogen, e85, biodiesel, etc."
    addlTankFuelType: String
    "Additional tank volume in the unit specified by addlTankVolumeEnteredIn"
    addlTankVolume: Float
    "Unit the additional tank volume was entered in: l, gal-us, gal-uk, kwh"
    addlTankVolumeEnteredIn: String
    "Default fuel grade for additional tank: regular, midgrade, premium, diesel, etc."
    addlTankDefaultGrade: String
    "Record status: 100=Active, 200=Inactive, 300=Deleted, 400=Pending, 500=Archived"
    status: Int
    "Users assgigned to the car."
    carUsers: [UserCarInput]
  }

  input CarFilter {
    "Filter by car ID(s)"
    id: [ID]
    "Filter by account ID(s)"
    accountId: [ID]
    "Filter by user ID(s)"
    userId: [ID]
    "Filter by car label(s)"
    label: [String]
    "Filter by make name(s) - legacy text field"
    make: [String]
    "Filter by model name(s)"
    model: [String]
    "Filter by body type ID(s)"
    bodyTypeId: [Int]
    "Filter by transmission type ID(s)"
    transmissionTypeId: [Int]
    "Filter by engine type ID(s)"
    engineTypeId: [Int]
    "Filter by make ID(s)"
    makeId: [Int]
    "Filter by drive type(s): fwd, rwd, awd, 4wd, 4x4"
    driveType: [String]
    "Filter by main tank fuel type(s): gasoline, diesel, electric, etc."
    mainTankFuelType: [String]
    "Filter by status: 100=Active, 200=Inactive, 300=Deleted, 400=Pending, 500=Archived"
    status: [Int]
    "Search across label, model, VIN, license plate, and comments"
    searchKeyword: String
  }

  input CarWhereInput {
    "Car ID to target for update/remove operations"
    id: ID
  }

  type Query {
    "Get a paginated and filtered list of cars"
    carList(filter: CarFilter, params: PaginationAndSorting): CarResult
    "Get a single car by ID"
    carGet(id: ID): CarResult
    "Get multiple cars by IDs"
    carGetMany(ids: [ID]): CarResult
  }

  type Mutation {
    "Create a new car"
    carCreate(params: CarInput): CarResult
    "Update an existing car"
    carUpdate(where: CarWhereInput, params: CarInput): CarResult
    "Soft-delete a car"
    carRemove(where: CarWhereInput): CarResult
    "Soft-delete multiple cars"
    carRemoveMany(where: [CarWhereInput]): CarResult
  }
`;

export default typeDefs;