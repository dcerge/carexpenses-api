// ./src/app/graphql/resolvers/expenseResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';
import { ENTITY_TYPE_IDS } from '../../../boundary';

const resolvers = buildDefaultResolvers({
  prefix: 'expense',
  core: 'expenseCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    Expense: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async label(parent, args, context) {
        const { label, labelId } = parent || {};

        if (!label && labelId) {
          return context.gateways.expenseLabelGw
            .get(labelId)
            .then((item) => context.cores.expenseLabelCore.processItemOnOut(item));
        }

        return label ?? null;
      },
      async travel(parent, args, context) {
        const { travel, travelId } = parent || {};

        if (!travel && travelId) {
          return context.gateways.travelGw
            .get(travelId)
            .then((item) => context.cores.travelCore.processItemOnOut(item));
        }

        return travel ?? null;
      },
      async kind(parent, args, context) {
        const { kind, kindId } = parent || {};

        if (!kind && kindId) {
          return context.gateways.expenseKindGw.get(kindId);
        }

        return kind ?? null;
      },
      async uploadedFilesIds(parent, args, context) {
        const { uploadedFilesIds, id } = parent || {};

        if (!uploadedFilesIds && id) {
          const attachments = await context.gateways.entityEntityAttachmentGw.list({
            filter: {
              entityTypeId: ENTITY_TYPE_IDS.EXPENSE,
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
              entityTypeId: ENTITY_TYPE_IDS.EXPENSE,
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
      async tags(parent, args, context) {
        const { tags, id } = parent || {};

        if (!tags && id) {
          const expenseExpenseTags = await context.gateways.expenseExpenseTagGw.list({
            filter: {
              expenseId: id,
              //accountId: context.accountId
            },
          });

          return context.gateways.expenseTagGw.getMany(
            expenseExpenseTags.map((expenseExpenseTag) => expenseExpenseTag.expenseTagId),
          );
        }

        return tags ?? [];
      },
    },
  },
});

export default resolvers;
