// ./src/app/graphql/resolvers/reportTcoResolvers.ts
const resolvers = {
  Query: {
    reportTcoGet: async (_: any, args: any, context: any) => {
      const { cores } = context;
      return cores.reportTcoCore.get(args);
    },
  },
};

export default resolvers;