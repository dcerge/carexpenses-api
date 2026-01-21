// ./src/app/graphql/resolvers/carTotalSummaryResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'carTotalSummary',
  core: 'carTotalSummaryCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    CarTotalSummary: {
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async latestRefuel(parent, args, context) {
        const { latestRefuel, latestRefuelId } = parent || {};

        if (!latestRefuel && latestRefuelId) {
          return context.gateways.refuelGw.get(latestRefuelId).then((item) => context.cores.expenseCore.processItemOnOut(item));
        }

        return latestRefuel ?? null;
      },
      async firstRefuel(parent, args, context) {
        const { firstRefuel, firstRefuelId } = parent || {};

        if (!firstRefuel && firstRefuelId) {
          return context.gateways.refuelGw.get(firstRefuelId).then((item) => context.cores.expenseCore.processItemOnOut(item));
        }

        return firstRefuel ?? null;
      },
      async latestExpense(parent, args, context) {
        const { latestExpense, latestExpenseId } = parent || {};

        if (!latestExpense && latestExpenseId) {
          return context.gateways.expenseGw.get(latestExpenseId).then((item) => context.cores.expenseCore.processItemOnOut(item));
        }

        return latestExpense ?? null;
      },
      async latestRevenue(parent, args, context) {
        const { latestRevenue, latestRevenueId } = parent || {};

        if (!latestRevenue && latestRevenueId) {
          return context.gateways.revenuGw.get(latestRevenueId).then((item) => context.cores.expenseCore.processItemOnOut(item));
        }

        return latestRevenue ?? null;
      },
    },
  },
});

export default resolvers;
