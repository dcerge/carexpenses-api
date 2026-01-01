// ./src/app/graphql/resolvers/entityEntityAttachmentResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'entityEntityAttachment',
  core: 'entityEntityAttachmentCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    EntityEntityAttachment: {
      async entityType(parent, args, context) {
        const { entityType, entityTypeId } = parent || {};

        if (!entityType && entityTypeId) {
          return context.gateways.entityTypeGw.get(entityTypeId);
        }

        return entityType ?? null;
      },
      async entityAttachment(parent, args, context) {
        const { entityAttachment, entityAttachmentId } = parent || {};

        if (!entityAttachment && entityAttachmentId) {
          return context.gateways.entityAttachmentGw
            .get(entityAttachmentId)
            .then((item) => context.cores.entityAttachmentCore.processItemOnOut(item));
        }

        return entityAttachment ?? null;
      },
    },
  },
});

export default resolvers;
