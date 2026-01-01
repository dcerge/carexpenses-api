// ./src/app/graphql/resolvers/expenseExpenseTagResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'expenseExpenseTag',
  core: 'expenseExpenseTagCore',
  disableGet: true,
  disableGetMany: true,
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    ExpenseExpenseTag: {
      async expense(parent, args, context) {
        const { expense, expenseId } = parent || {};

        if (!expense && expenseId) {
          const expenseBase = await context.gateways.expenseBaseGw.get(expenseId);
          return context.cores.expenseCore.processItemOnOut(expenseBase);
        }

        return expense ?? null;
      },
      async expenseTag(parent, args, context) {
        const { expenseTag, expenseTagId } = parent || {};

        if (!expenseTag && expenseTagId) {
          return context.gateways.expenseTagGw
            .get(expenseTagId)
            .then((item) => context.cores.expenseTagCore.processItemOnOut(item));
        }

        return expenseTag ?? null;
      },
    },
  },
});

export default resolvers;
