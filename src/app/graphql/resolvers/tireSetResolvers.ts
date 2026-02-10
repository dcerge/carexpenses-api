// ./src/app/graphql/resolvers/tireSetResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'tireSet',
  core: 'tireSetCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    TireSet: {
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
      async items(parent, args, context) {
        // Items are typically loaded by afterList/afterGet in core,
        // but resolve here as a fallback if not already attached
        if (Array.isArray(parent.items)) {
          return parent.items;
        }

        if (!parent.id) return [];

        const { accountId } = context;

        const items = await context.gateways.tireSetItemGw.list({
          filter: {
            tireSetId: parent.id,
            accountId,
          },
        });

        return items || [];
      },
      async expenses(parent, args, context) {
        // Load service expenses linked to this tire set via expenses.tire_set_id
        if (Array.isArray(parent.expenses)) {
          return parent.expenses;
        }

        if (!parent.id) return [];

        const { accountId } = context;

        const expenses = await context.cores.expenseCore.list({
          filter: {
            tireSetId: parent.id,
            accountId,
          }
        });

        return expenses.data || [];

        // const expenses = await context.gateways.expenseGw.list({
        //   filter: {
        //     tireSetId: parent.id,
        //     accountId,
        //   },
        // });

        // return (expenses || []).map((item) => context.cores.expenseCore.processItemOnOut(item));
      },
    },
    TireSetItem: {
      async expense(parent, args, context) {
        const { expense, expenseId } = parent || {};

        if (!expense && expenseId) {
          return context.gateways.expenseBaseGw.get(expenseId).then((item) => context.cores.expenseCore.processItemOnOut(item));
        }

        return expense ?? null;
      },
    },
  },
  mutation: {
    async tireSetSwap(parent, args, context) {
      return context.cores.tireSetCore.swap(args);
    },
  }
});

export default resolvers;