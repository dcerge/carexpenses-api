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
    },
  },
});

export default resolvers;
