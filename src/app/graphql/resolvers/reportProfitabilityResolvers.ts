// ./src/app/graphql/resolvers/reportProfitabilityResolvers.ts
const resolvers = {
  Query: {
    reportProfitability: async (_: any, args: any, context: any) => {
      return context.cores.reportProfitabilityCore.buildReport(args);
    },
  },
};

export default resolvers;