const resolvers = {
  Query: {
    reportExpenseSummary: async (_: any, args: any, context: any) => {
      return context.cores.reportCore.expenseSummary(args);
    },
    reportYearly: async (_: any, args: any, context: any) => {
      return context.cores.reportCore.yearly(args);
    },
    reportTravel: async (_: any, args: any, context: any) => {
      return context.cores.reportCore.travelReport(args);
    },
    // Future reports:
    // reportMonthlyTrend: async (_: any, args: any, context: any) => {
    //   return context.cores.reportCore.monthlyTrend(args);
    // },
    // reportFuelEfficiency: async (_: any, args: any, context: any) => {
    //   return context.cores.reportCore.fuelEfficiency(args);
    // },
  },
};

export default resolvers;