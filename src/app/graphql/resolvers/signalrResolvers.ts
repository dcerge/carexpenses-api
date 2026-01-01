const resolvers = {
  Mutation: {
    async negotiate(parent: any, args: any, context: any) {
      const result = await context.cores['signalRCore'].negotiate(args);
      return result;
    },
    async sendCommand(parent: any, args: any, context: any) {
      const result = await context.cores['signalRCore'].sendCommand(args);
      return result;
    },
  },
  NegotationData: {},
};

export default resolvers;
