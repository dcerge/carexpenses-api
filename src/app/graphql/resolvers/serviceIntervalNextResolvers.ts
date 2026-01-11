// ./src/app/graphql/resolvers/serviceIntervalNextResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'serviceIntervalNext',
  core: 'serviceIntervalNextCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  disableRemove: true,
  disableRemoveMany: true,
  types: {
    ServiceIntervalNext: {
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async expenseKind(parent, args, context) {
        const { expenseKind, kindId } = parent || {};

        if (!expenseKind && kindId) {
          return context.gateways.expenseKindGw.get(kindId);
        }

        return expenseKind ?? null;
      },
    },
  },
});

export default resolvers;
