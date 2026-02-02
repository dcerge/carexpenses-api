import { buildDefaultResolvers } from '@sdflc/backend-helpers';
import { EXPENSE_TYPES } from '../../../database';

const resolvers = buildDefaultResolvers({
  prefix: 'travel',
  core: 'travelCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    Travel: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      userRemoved(parent, args, context) {
        return parent.removedBy ? { __typename: 'User', id: parent.removedBy } : null;
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
      async tags(parent, args, context) {
        const { tags, id } = parent || {};

        if (!tags && id) {
          const travelExpenseTags = await context.gateways.travelExpenseTagGw.list({
            filter: {
              travelId: id,
            },
          });

          return context.gateways.expenseTagGw.getMany(
            travelExpenseTags.map((travelExpenseTag) => travelExpenseTag.expenseTagId),
          );
        }

        return tags ?? [];
      },
      async firstRecord(parent, args, context) {
        const { firstRecord, firstRecordId } = parent || {};

        if (!firstRecord && firstRecordId) {
          return context.gateways.expenseBaseGw
            .get(firstRecordId)
            .then((item) => context.cores.expenseCore.processItemWithProfile(item));
        }

        return firstRecord ?? null;
      },
      async lastRecord(parent, args, context) {
        const { lastRecord, lastRecordId } = parent || {};

        if (!lastRecord && lastRecordId) {
          return context.gateways.expenseBaseGw
            .get(lastRecordId)
            .then((item) => context.cores.expenseCore.processItemWithProfile(item));
        }

        return lastRecord ?? null;
      },
      async waypoints(parent, args, context) {
        const { waypoints, id } = parent || {};

        if (!waypoints && id) {
          // Get all travel points (expense_type = 4) linked to this travel
          const records = await context.gateways.expenseBaseGw.list({
            filter: {
              travelId: id,
              expenseType: EXPENSE_TYPES.TRAVEL_POINT,
            },
            params: {
              sorting: [
                { name: 'whenDone', order: 'asc' },
                { name: 'odometer', order: 'asc' },
              ],
            },
          });

          return records.map((record) => context.cores.expenseCore.processItemWithProfile(record));
        }

        return waypoints ?? [];
      },
    },
  },
});

export default resolvers;