// ./src/app/graphql/types/carTypes.ts
const typeDefs = `#graphql
  type Car @key(fields: "id") {
    id: ID
    accountId: ID
    userId: ID
    label: String
    vin: String
    model: String
    color: String
    engineVolume: Int
    manufacturedIn: Int
    mileageIn: String
    initialMileage: Int
    typeOfFuel: String
    tankVolume: Int
    additionalTankVolume: Int
    whenBought: String
    boughtFor: Float
    boughtForCurrency: String
    boughtFrom: String
    whenSold: String
    soldFor: Float
    soldForCurrency: String
    soldTo: String
    comments: String
    bodyTypeId: Int
    transmissionTypeId: Int
    engineTypeId: Int
    makeId: Int
    firstRecordId: ID
    ownerNumber: Int
    entityAttachmentId: ID
    status: Int
    version: Int
    createdBy: ID
    updatedBy: ID
    removedBy: ID
    createdAt: String
    updatedAt: String
    user: User
    account: Account
    userCreated: User
    userUpdated: User
    userRemoved: User
    carBodyType: CarBodyType
    carTransmissionType: CarTransmissionType
    carEngineType: CarEngineType
    vehicleMake: VehicleMake
    entityAttachment: EntityAttachment
    uploadedFilesIds: [ID]
    uploadedFiles: [UploadedFile]
  }

  type CarResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [Car!]
  }

  input CarInput {
    id: ID
    accountId: ID
    label: String
    vin: String
    model: String
    color: String
    engineVolume: Int
    manufacturedIn: Int
    mileageIn: String
    initialMileage: Int
    typeOfFuel: String
    tankVolume: Int
    additionalTankVolume: Int
    whenBought: String
    boughtFor: Float
    boughtForCurrency: String
    boughtFrom: String
    whenSold: String
    soldFor: Float
    soldForCurrency: String
    soldTo: String
    comments: String
    bodyTypeId: Int
    transmissionTypeId: Int
    engineTypeId: Int
    makeId: Int
    entityAttachmentId: ID
    status: Int
    "References to uploaded files"
    uploadedFilesIds: [ID]
  }

  input CarFilter {
    id: [ID]
    accountId: [ID]
    userId: [ID]
    label: [String]
    make: [String]
    model: [String]
    bodyTypeId: [Int]
    transmissionTypeId: [Int]
    engineTypeId: [Int]
    makeId: [Int]
    status: [Int]
    searchKeyword: String
  }

  input CarWhereInput {
    id: ID
  }

  type Query {
    carList(filter: CarFilter, params: PaginationAndSorting): CarResult
    carGet(id: ID): CarResult
    carGetMany(ids: [ID]): CarResult
  }

  type Mutation {
    carCreate(params: CarInput): CarResult
    carUpdate(where: CarWhereInput, params: CarInput): CarResult
    carRemove(where: CarWhereInput): CarResult
    carRemoveMany(where: [CarWhereInput]): CarResult
  }
`;

export default typeDefs;
