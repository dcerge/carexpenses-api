// ./src/app/graphql/resolvers/carMonthlyExpenseResolvers.ts
import { OpResult } from '@sdflc/api-helpers';
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
  disableGet: true,
  disableGetMany: true,
  disableList: true,
  types: {
    AppEssentials: {
      lang(parent, args, context) {
        return 'en';
      },
      async carBodyTypes(parent, args, context) {
        const result = await context.cores.carBodyTypeCore.list({});
        return result.data ?? [];
      },
      async carEngineTypes(parent, args, context) {
        const result = await context.cores.carEngineTypeCore.list({});
        return result.data ?? [];
      },
      async carTransmissionTypes(parent, args, context) {
        const result = await context.cores.carTransmissionTypeCore.list({});
        return result.data ?? [];
      },
      async vehicleMakes(parent, args, context) {
        const result = await context.cores.vehicleMakeCore.list({});
        return result.data ?? [];
      },
      async expenseCategories(parent, args, context) {
        const result = await context.cores.expenseCategoryCore.list({});
        return result.data ?? [];
      },
    },
  },
  query: {
    async appEssentialsGet(parent, args, context) {
      return OpResult.ok([
        {
          lang: '',
          carBodyTypes: [],
          carEngineTypes: [],
        },
      ]);
    },
  },
});

export default resolvers;
