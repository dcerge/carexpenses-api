// ./src/app/graphql/resolvers/expenseTagResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'expenseTag',
  core: 'expenseTagCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    ExpenseTag: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
    },
  },
});

export default resolvers;
