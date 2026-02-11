// ./src/app/graphql/resolvers/vehicleTaskResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'vehicleTask',
  core: 'vehicleTaskCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    VehicleTask: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
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
      assignedToUser(parent, args, context) {
        return parent.assignedToUserId ? { __typename: 'User', id: parent.assignedToUserId } : null;
      },
      completedByUser(parent, args, context) {
        return parent.completedByUserId ? { __typename: 'User', id: parent.completedByUserId } : null;
      },
      async linkedExpense(parent, args, context) {
        const { linkedExpense, linkedExpenseId } = parent || {};

        if (!linkedExpense && linkedExpenseId) {
          return context.cores.expenseCore.get(linkedExpenseId).then((result) => {
            return result?.data?.[0] ?? null;
          });
        }

        return linkedExpense ?? null;
      },
    },
  },
  mutation: {
    async vehicleTaskComplete(parent, args, context) {
      const { where } = args || {};
      return context.cores.vehicleTaskCore.complete({ where });
    },
  },
  query: {
    async vehicleTaskDashboard(parent, args, context) {
      const { params } = args || {};
      return context.cores.vehicleTaskCore.dashboard({ params });
    },
  },
});

export default resolvers;