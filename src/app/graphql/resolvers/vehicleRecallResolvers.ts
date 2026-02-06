// ./src/app/graphql/resolvers/vehicleRecallResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'vehicleRecall',
  core: 'vehicleRecallCore',
  disableList: true,
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  disableGet: true,
  disableGetMany: true,
  types: {
    VehicleRecall: {
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
    },
  },
  query: {
    async vehicleRecallList(parent, args, context) {
      const { filter, params } = args || {};
      return context.cores.vehicleRecallCore.listRecallsForCar({
        carId: filter?.carId?.[0],
        statusFilter: filter?.statusFilter,
        searchKeyword: filter?.searchKeyword,
        params,
      });
    },
    async vehicleRecallCounts(parent, args, context) {
      const { carId } = args || {};
      return context.cores.vehicleRecallCore.getRecallCounts({ carId });
    },
  },
  mutation: {
    async vehicleRecallUpdate(parent, args, context) {
      return context.cores.vehicleRecallCore.updateRecallStatus(args);
    },
    async vehicleRecallRefresh(parent, args, context) {
      const { where } = args || {};
      return context.cores.vehicleRecallCore.requestRefreshForCar({
        carId: where?.carId,
      });
    },
  },
});

export default resolvers;