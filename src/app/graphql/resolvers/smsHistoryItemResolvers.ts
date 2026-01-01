// ./src/app/graphql/resolvers/smsHistoryItemResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'smsHistoryItem',
  core: 'smsHistoryItemCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    SmsHistoryItem: {},
  },
});

export default resolvers;
