// ./src/app/graphql/resolvers/userNotificationResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'userNotification',
  core: 'userNotificationCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    UserNotification: {
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
    },
  },
  mutation: {
    async userNotificationMarkAsRead(parent: any, args: any, context: any) {
      const result = await context.cores['userNotificationCore'].markAsRead(args);
      return result;
    },
    async userNotificationMarkAllAsRead(parent: any, args: any, context: any) {
      const result = await context.cores['userNotificationCore'].markAllAsRead(args);
      return result;
    },
  },
});

export default resolvers;
