// ./src/app/graphql/resolvers/parkingSessionResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'parkingSession',
  core: 'parkingSessionCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    ParkingSession: {
      userCreated(parent, args, context) {
        return parent.createdBy ? { __typename: 'User', id: parent.createdBy } : null;
      },
      userUpdated(parent, args, context) {
        return parent.updatedBy ? { __typename: 'User', id: parent.updatedBy } : null;
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
      async expense(parent, args, context) {
        const { expense, expenseId } = parent || {};

        if (!expense && expenseId) {
          return context.cores.expenseCore.get(expenseId).then((result) => {
            return result?.data?.[0] ?? null;
          });
        }

        return expense ?? null;
      },
      userStarted(parent, args, context) {
        return parent.startedBy ? { __typename: 'User', id: parent.startedBy } : null;
      },
      userEnded(parent, args, context) {
        return parent.endedBy ? { __typename: 'User', id: parent.endedBy } : null;
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
    },
  },
});

export default resolvers;