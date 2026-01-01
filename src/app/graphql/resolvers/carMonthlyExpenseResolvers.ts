// ./src/app/graphql/resolvers/carMonthlyExpenseResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'carMonthlyExpense',
  core: 'carMonthlyExpenseCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    CarMonthlyExpense: {
      async carMonthlySummary(parent, args, context) {
        const { carMonthlySummary, carMonthlySummaryId } = parent || {};

        if (!carMonthlySummary && carMonthlySummaryId) {
          return context.gateways.carMonthlySummaryGw
            .get(carMonthlySummaryId)
            .then((item) => context.cores.carMonthlySummaryCore.processItemOnOut(item));
        }

        return carMonthlySummary ?? null;
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
