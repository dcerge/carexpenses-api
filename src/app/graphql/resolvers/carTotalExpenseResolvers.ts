// ./src/app/graphql/resolvers/carTotalExpenseResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'carTotalExpense',
  core: 'carTotalExpenseCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    CarTotalExpense: {
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async expenseKind(parent, args, context) {
        const { expenseKind, expenseKindId } = parent || {};

        if (!expenseKind && expenseKindId) {
          return context.gateways.expenseKindGw.get(expenseKindId);
        }

        return expenseKind ?? null;
      },
    },
  },
});

export default resolvers;
