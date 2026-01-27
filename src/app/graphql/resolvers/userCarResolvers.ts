// ./src/app/graphql/resolvers/userCarResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'userCar',
  core: 'userCarCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    UserCar: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
      account(parent, args, context) {
        return parent.accountId ? { __typename: 'Account', id: parent.accountId } : null;
      },
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId);
        }

        return car ?? null;
      },
    },
  },
});

export default resolvers;