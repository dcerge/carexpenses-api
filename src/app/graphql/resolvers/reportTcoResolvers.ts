// ./src/app/graphql/resolvers/reportProfitabilityResolvers.ts
const resolvers = {
  Query: {
    reportTcoGet: async (_: any, args: any, context: any) => {
      return context.cores.reportTcoCore.get(args);
    },
  },
};

export default resolvers;