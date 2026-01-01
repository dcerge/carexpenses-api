// ./src/app/graphql/resolvers/expenseLabelResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'expenseLabel',
  core: 'expenseLabelCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    ExpenseLabel: {
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
