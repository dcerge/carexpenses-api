// ./src/app/graphql/resolvers/carResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';
import { ENTITY_TYPE_IDS } from 'boundary';

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
          return context.gateways.carBodyTypeGw.get(bodyTypeId);
        }

        return bodyType ?? null;
      },
      async transmissionType(parent, args, context) {
        const { transmissionType, transmissionTypeId } = parent || {};

        if (!transmissionType && transmissionTypeId) {
          return context.gateways.carTransmissionTypeGw.get(transmissionTypeId);
        }

        return transmissionType ?? null;
      },
      async engineType(parent, args, context) {
        const { engineType, engineTypeId } = parent || {};

        if (!engineType && engineTypeId) {
          return context.gateways.carEngineTypeGw.get(engineTypeId);
        }

        return engineType ?? null;
      },
      async vehicleMake(parent, args, context) {
        const { vehicleMake, makeId } = parent || {};

        if (!vehicleMake && makeId) {
          return context.gateways.vehicleMakeGw.get(makeId);
        }

        return vehicleMake ?? null;
      },
      async entityAttachment(parent, args, context) {
        const { entityAttachment, entityAttachmentId } = parent || {};

        if (!entityAttachment && entityAttachmentId) {
          return context.gateways.entityAttachmentGw.get(entityAttachmentId);
        }

        return entityAttachment ?? null;
      },
      async uploadedFilesIds(parent, args, context) {
        const { uploadedFilesIds, id } = parent || {};

        if (!uploadedFilesIds && id) {
          const attachments = await context.gateways.entityEntityAttachmentGw.list({
            filter: {
              entityTypeId: ENTITY_TYPE_IDS.CAR,
              entityId: id,
            },
          });

          return attachments.map((attachment) => attachment.uploadedFileId);
        }

        return uploadedFilesIds ?? [];
      },
      async uploadedFiles(parent, args, context) {
        const { uploadedFilesIds, id } = parent || {};

        if (!uploadedFilesIds && id) {
          const attachments = await context.gateways.entityEntityAttachmentGw.list({
            filter: {
              entityTypeId: ENTITY_TYPE_IDS.CAR,
              entityId: id,
            },
          });

          return attachments.map((attachment) => {
            return {
              __typename: 'UploadedFile',
              id: attachment.uploadedFileId,
            };
          });
        }

        return uploadedFilesIds ?? [];
      },
    },
  },
});

export default resolvers;
