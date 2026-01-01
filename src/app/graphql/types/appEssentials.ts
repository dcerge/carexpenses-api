// ./src/app/graphql/types/appEssentials.ts
const typeDefs = `#graphql
  type AppEssentials {
    lang: String
    carBodyTypes: [CarBodyType]
    carEngineTypes: [CarEngineType]
    carTransmissionTypes: [CarTransmissionType]
    vehicleMakes: [VehicleMake]
    expenseCategories: [ExpenseCategory]
  }

  type AppEssentialsResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [AppEssentials!]
  }

  type Query {
    appEssentialsGet: AppEssentialsResult
  }
`;

export default typeDefs;
