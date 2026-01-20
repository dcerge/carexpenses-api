// ./src/app/graphql/resolvers/gloveboxDocumentResolvers.ts
import { OpResult } from '@sdflc/api-helpers';
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'gloveboxDocument',
  core: 'gloveboxDocumentCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    GloveboxDocument: {
      user(parent, args, context) {
        return parent.userId ? { __typename: 'User', id: parent.userId } : null;
      },
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
      },
      async car(parent, args, context) {
        const { car, carId } = parent || {};

        if (!car && carId) {
          return context.gateways.carGw.get(carId).then((item) => context.cores.carCore.processItemOnOut(item));
        }

        return car ?? null;
      },
      async docType(parent, args, context) {
        const { docType, docTypeId } = parent || {};

        if (!docType && docTypeId) {
          return context.gateways.gloveboxDocTypeGw.get(docTypeId);
        }

        return docType ?? null;
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
      async uploadedFilesIds(parent, args, context) {
        const { uploadedFilesIds, id } = parent || {};

        if (!uploadedFilesIds && id) {
          const filesResult = await context.gateways.gloveboxDocumentFileGw.list({
            filter: {
              gloveboxDocumentId: id,
            },
          });

          const files = filesResult.data || filesResult || [];
          return files.map((file) => file.uploadedFileId);
        }

        return uploadedFilesIds ?? [];
      },
      async uploadedFiles(parent, args, context) {
        const { uploadedFilesIds, id } = parent || {};

        if (!uploadedFilesIds && id) {
          const filesResult = await context.gateways.gloveboxDocumentFileGw.list({
            filter: {
              gloveboxDocumentId: id,
            },
          });

          const files = filesResult.data || filesResult || [];
          return files.map((file) => ({
            __typename: 'UploadedFile',
            id: file.uploadedFileId,
          }));
        }

        return (uploadedFilesIds ?? []).map((fileId) => ({
          __typename: 'UploadedFile',
          id: fileId,
        }));
      },
      isExpired(parent, args, context) {
        const { expiresAt } = parent || {};

        if (!expiresAt) {
          return false;
        }

        const expirationDate = new Date(expiresAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return expirationDate < today;
      },
      daysUntilExpiration(parent, args, context) {
        const { expiresAt } = parent || {};

        if (!expiresAt) {
          return null;
        }

        const expirationDate = new Date(expiresAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expirationDate.setHours(0, 0, 0, 0);

        const diffTime = expirationDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
      },
    },
  },
  query: {
    async gloveboxStatsGet(parent, args, context) {
      const { withinDays = 30 } = args || {};
      const accountId = context.accountId;

      const [totalDocuments, expiredDocuments, expiringSoonDocuments] = await Promise.all([
        context.gateways.gloveboxDocumentGw.count({ accountId }),
        context.gateways.gloveboxDocumentGw.countExpired(accountId),
        context.gateways.gloveboxDocumentGw.countExpiringSoon(accountId, withinDays),
      ]);

      return OpResult.ok([
        {
          totalDocuments,
          expiredDocuments,
          expiringSoonDocuments,
        },
      ]);
    },
  },
});

export default resolvers;