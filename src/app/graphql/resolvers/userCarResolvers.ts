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
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async role(parent, args, context) {
        const { role, roleId } = parent || {};

        if (!role && roleId) {
          return context.gateways.carRoleGw.get(roleId);
        }

        return role ?? null;
      },
    },
  },
});

export default resolvers;
