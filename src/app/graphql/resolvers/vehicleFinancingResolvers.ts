// ./src/app/graphql/resolvers/vehicleFinancingResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'vehicleFinancing',
  core: 'vehicleFinancingCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    VehicleFinancing: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async expenseSchedule(parent, args, context) {
        const { expenseSchedule, expenseScheduleId } = parent || {};

        if (!expenseSchedule && expenseScheduleId) {
          return context.gateways.expenseScheduleGw.get(expenseScheduleId).then((item) => context.cores.expenseScheduleCore.processItemOnOut(item));
        }

        return expenseSchedule ?? null;
      },
    },
  },
});

export default resolvers;