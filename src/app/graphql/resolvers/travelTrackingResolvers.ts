// ./src/app/graphql/resolvers/travelTrackingResolvers.ts

import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'trackingPoint',
  core: 'travelTrackingCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  disableGet: true,
  disableGetMany: true,
  types: {},
  mutation: {
    async travelTrackingAddPoints(parent, args, context) {
      return context.cores.travelTrackingCore.addTrackingPoints(args);
    },
    async travelTrackingDiscard(parent, args, context) {
      return context.cores.travelTrackingCore.discardTracking(args);
    },
  },
});

export default resolvers;