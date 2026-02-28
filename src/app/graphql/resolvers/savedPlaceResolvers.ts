// ./src/app/graphql/resolvers/savedPlaceResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'savedPlace',
  core: 'savedPlaceCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    SavedPlace: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      account(parent, args, context) {
        return parent.accountId ? { __typename: 'Account', id: parent.accountId } : null;
      },
    },
  },
  query: {
    async savedPlacesListByProximity(parent, args, context) {
      const { proximity, filter } = args || {};
      return context.cores.savedPlaceCore.listByProximity({ proximity, filter });
    },
  }
});

export default resolvers;