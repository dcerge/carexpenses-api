// ./src/app/graphql/resolvers/queuedTaskResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'queuedTask',
  core: 'queuedTaskCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    QueuedTask: {
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
    },
  },
});

export default resolvers;
