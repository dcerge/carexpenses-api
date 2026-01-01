// ./src/app/graphql/resolvers/carTransferResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'carTransfer',
  core: 'carTransferCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    CarTransfer: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      fromUser(parent, args, context) {
        return parent.fromUserId ? { __typename: 'User', id: parent.fromUserId } : null;
      },
      toUser(parent, args, context) {
        return parent.toUserId ? { __typename: 'User', id: parent.toUserId } : null;
      },
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async newCar(parent, args, context) {
        const { newCar, newCarId } = parent || {};

        if (!newCar && newCarId) {
          return context.gateways.carGw.get(newCarId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return newCar ?? null;
      },
    },
  },
});

export default resolvers;
