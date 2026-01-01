// ./src/app/graphql/resolvers/carMonthlyExpenseResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'expenseCategory',
  core: 'expenseCategoryCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    ExpenseCategory: {
      async kinds(parent, args, context) {
        const { kinds, name, id } = parent || {};

        if (!kinds && id) {
          const result = await context.cores.expenseKindCore.list({
            filter: {
              expenseCategoryId: id,
              lang: 'en',
            },
          });

          return result.data ?? [];
        }

        return kinds ?? [];
      },
    },
  },
});

export default resolvers;
