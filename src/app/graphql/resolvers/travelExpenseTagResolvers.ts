// ./src/app/graphql/resolvers/travelExpenseTagResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'travelExpenseTag',
  core: 'travelExpenseTagCore',
  disableGet: true,
  disableGetMany: true,
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    TravelExpenseTag: {
      async travel(parent, args, context) {
        const { travel, travelId } = parent || {};

        if (!travel && travelId) {
          return context.gateways.travelGw
            .get(travelId)
            .then((item) => context.cores.travelCore.processItemOnOut(item));
        }

        return travel ?? null;
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
