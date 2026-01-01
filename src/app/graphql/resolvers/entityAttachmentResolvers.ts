// ./src/app/graphql/resolvers/entityAttachmentResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'entityAttachment',
  core: 'entityAttachmentCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    EntityAttachment: {
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
      async forEntityType(parent, args, context) {
        const { forEntityType, forEntityTypeId } = parent || {};

        if (!forEntityType && forEntityTypeId) {
          return context.gateways.entityTypeGw.get(forEntityTypeId);
        }

        return forEntityType ?? null;
      },
    },
  },
});

export default resolvers;
