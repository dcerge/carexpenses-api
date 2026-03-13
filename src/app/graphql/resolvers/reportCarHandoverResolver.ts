// ./src/app/graphql/resolvers/reportCarHandoverResolver.ts
const resolvers = {
  Query: {
    reportCarHandoverGet: async (_: any, args: any, context: any) => {
      return context.cores.reportCarHandoverCore.get(args);
    },
  },
  HandoverReport: {
    async car(parent, args, context) {
      const { car, carId } = parent || {};

      if (!car && carId) {
        return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
      }

      return car ?? null;
    },
  }
};

export default resolvers;