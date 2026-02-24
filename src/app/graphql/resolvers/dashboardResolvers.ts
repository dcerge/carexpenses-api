// ./src/app/graphql/resolvers/dashboardResolvers.ts
const resolvers = {
  Query: {
    dashboardGet: async (_: any, args: any, context: any) => {
      const { cores } = context;
      return cores.dashboardCore.get(args);
    },
    dashboardFleetSummaryGet: async (_: any, args: any, context: any) => {
      const { cores } = context;
      return cores.dashboardCore.getFleetSummary(args);
    },
  },
};

export default resolvers;