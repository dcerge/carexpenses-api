// ./src/app/graphql/resolvers/carResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';
import { ENTITY_TYPE_IDS } from '../../../boundary';
import { STATUS } from '../../../database';

const resolvers = buildDefaultResolvers({
  prefix: 'car',
  core: 'carCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    Car: {
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
      account(parent, args, context) {
        return parent.accountId ? { __typename: 'Account', id: parent.accountId } : null;
      },
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      async carBodyType(parent, args, context) {
        const { carBodyType, bodyTypeId } = parent || {};

        if (!carBodyType && bodyTypeId) {
          return context.gateways.carBodyTypeGw.get(bodyTypeId);
        }

        return carBodyType ?? null;
      },
      async carTransmissionType(parent, args, context) {
        const { carTransmissionType, transmissionTypeId } = parent || {};

        if (!carTransmissionType && transmissionTypeId) {
          return context.gateways.carTransmissionTypeGw.get(transmissionTypeId);
        }

        return carTransmissionType ?? null;
      },
      async carEngineType(parent, args, context) {
        const { carEngineType, engineTypeId } = parent || {};

        if (!carEngineType && engineTypeId) {
          return context.gateways.carEngineTypeGw.get(engineTypeId);
        }

        return carEngineType ?? null;
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
      async uploadedFile(parent, args, context) {
        const { uploadedFileId } = parent || {};

        return uploadedFileId
          ? {
            __typename: 'UploadedFile',
            id: uploadedFileId,
          }
          : null;
      },
      async carUsers(parent, args, context) {
        const { carUsers, id } = parent || {};

        // Return cached carUsers if already loaded
        if (carUsers) {
          return carUsers;
        }

        // Fetch user-car assignments for this car
        if (id) {
          return context.gateways.userCarGw.list({
            filter: {
              carId: id,
              status: [STATUS.ACTIVE],
            },
          });
        }

        return [];
      },
    },
  },
});

export default resolvers;