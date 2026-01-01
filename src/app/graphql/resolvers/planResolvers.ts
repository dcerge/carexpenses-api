import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'plan',
  core: 'planCore',
  disableCreate: true,
  disableUpdate: true,
  disableRemove: true,
  disableCreateMany: true,
  disableUpdateMany: true,
  disableRemoveMany: true,
  disableSet: true,
});

export default resolvers;
