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
      userRemoved(parent, args, context) {
        return parent.removedBy ? { __typename: 'User', id: parent.removedBy } : null;
      },
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
      account(parent, args, context) {
        return parent.accountId ? { __typename: 'Account', id: parent.accountId } : null;
      },
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
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
      async expenseKind(parent, args, context) {
        const { expenseKind, kindId, expenseType } = parent || {};

        // Only resolve for expenses (expenseType = 2)
        if (expenseType !== 2) {
          return null;
        }

        if (!expenseKind && kindId) {
          return context.gateways.expenseKindGw.get(kindId);
        }

        return expenseKind ?? null;
      },
      async revenueKind(parent, args, context) {
        const { revenueKind, kindId, expenseType } = parent || {};

        // Only resolve for revenues (expenseType = 5)
        if (expenseType !== 5) {
          return null;
        }

        if (!revenueKind && kindId) {
          return context.gateways.revenueKindGw.get(kindId);
        }

        return revenueKind ?? null;
      },
      async tireSet(parent, args, context) {
        const { tireSet, tireSetId } = parent || {};

        if (!tireSet && tireSetId) {
          return context.gateways.tireSetGw.get(tireSetId).then((item) => context.cores.tireSetCore.processItemOnOut(item));
        }

        return tireSet ?? null;
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