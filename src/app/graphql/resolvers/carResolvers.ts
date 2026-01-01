// ./src/app/graphql/resolvers/carResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'car',
  core: 'carCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    Car: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      async bodyType(parent, args, context) {
        const { bodyType, bodyTypeId } = parent || {};

        if (!bodyType && bodyTypeId) {
          return context.gateways.bodyTypeGw.get(bodyTypeId);
        }

        return bodyType ?? null;
      },
      async transmissionType(parent, args, context) {
        const { transmissionType, transmissionTypeId } = parent || {};

        if (!transmissionType && transmissionTypeId) {
          return context.gateways.transmissionTypeGw.get(transmissionTypeId);
        }

        return transmissionType ?? null;
      },
      async engineType(parent, args, context) {
        const { engineType, engineTypeId } = parent || {};

        if (!engineType && engineTypeId) {
          return context.gateways.engineTypeGw.get(engineTypeId);
        }

        return engineType ?? null;
      },
      async make(parent, args, context) {
        const { make, makeId } = parent || {};

        if (!make && makeId) {
          return context.gateways.makeGw.get(makeId);
        }

        return make ?? null;
      },
      async entityAttachment(parent, args, context) {
        const { entityAttachment, entityAttachmentId } = parent || {};

        if (!entityAttachment && entityAttachmentId) {
          return context.gateways.entityAttachmentGw.get(entityAttachmentId);
        }

        return entityAttachment ?? null;
      },
    },
  },
});

export default resolvers;
