// ./src/app/graphql/resolvers/travelResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'travel',
  core: 'travelCore',
  disableCreateMany: true,
  disableUpdateMany: true,
  disableSet: true,
  types: {
    Travel: {
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
    },
  },
});

export default resolvers;
