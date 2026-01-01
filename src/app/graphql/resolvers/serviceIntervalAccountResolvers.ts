// ./src/app/graphql/resolvers/serviceIntervalAccountResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'serviceIntervalAccount',
  core: 'serviceIntervalAccountCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    ServiceIntervalAccount: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
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
