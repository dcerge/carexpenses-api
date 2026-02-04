// ./src/app/graphql/resolvers/expenseSchedulesResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'expenseSchedule',
  core: 'expenseScheduleCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    ExpenseSchedule: {
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
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async expenseKind(parent, args, context) {
        const { expenseKind, kindId } = parent || {};

        if (!expenseKind && kindId) {
          return context.gateways.expenseKindGw.get(kindId);
        }

        return expenseKind ?? null;
      },
      async lastCreatedExpense(parent, args, context) {
        const { lastCreatedExpense, lastCreatedExpenseId } = parent || {};

        if (!lastCreatedExpense && lastCreatedExpenseId) {
          return context.cores.expenseCore.get(lastCreatedExpenseId).then((result) => {
            return result?.data?.[0] ?? null;
          });
        }

        return lastCreatedExpense ?? null;
      },
    },
  },
  mutation: {
    async expenseSchedulePause(parent, args, context) {
      const { where } = args || {};
      return context.cores.expenseScheduleCore.pause({ where });
    },
    async expenseScheduleResume(parent, args, context) {
      const { where } = args || {};
      return context.cores.expenseScheduleCore.resume({ where });
    },
    async expenseScheduleRunNow(parent, args, context) {
      const { where } = args || {};
      const result = await context.cores.expenseScheduleCore.runNow({ where });

      // Add createdExpense to result if we have the ID
      if (result.createdExpenseId) {
        const expenseResult = await context.cores.expenseCore.get(result.createdExpenseId);
        result.createdExpense = expenseResult?.data?.[0] ?? null;
      }

      return result;
    },
  },
});

export default resolvers;