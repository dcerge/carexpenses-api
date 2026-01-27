// ./src/app/graphql/resolvers/userProfileResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'userProfile',
  core: 'userProfileCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    UserProfile: {
      
    },
  },
});

export default resolvers;
