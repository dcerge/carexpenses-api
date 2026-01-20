// ./src/app/graphql/resolvers/gloveboxDocTypeResolvers.ts
import { buildDefaultResolvers } from '@sdflc/backend-helpers';

const resolvers = buildDefaultResolvers({
  prefix: 'gloveboxDocType',
  core: 'gloveboxDocTypeCore',
  disableCreate: true,
  disableCreateMany: true,
  disableUpdate: true,
  disableUpdateMany: true,
  disableRemove: true,
  disableRemoveMany: true,
  disableSet: true,
  types: {
    GloveboxDocType: {
      async name(parent, args, context) {
        const { name, id } = parent || {};

        if (!name && id) {
          const lang = context.lang || 'en';
          const l10nResult = await context.gateways.gloveboxDocTypeL10NGw.get(`${id}-${lang}`);
          return l10nResult?.name ?? null;
        }

        return name ?? null;
      },
      async description(parent, args, context) {
        const { description, id } = parent || {};

        if (!description && id) {
          const lang = context.lang || 'en';
          const l10nResult = await context.gateways.gloveboxDocTypeL10NGw.get(`${id}-${lang}`);
          return l10nResult?.description ?? null;
        }

        return description ?? null;
      },
      async documentNumberLabel(parent, args, context) {
        const { documentNumberLabel, id } = parent || {};

        if (!documentNumberLabel && id) {
          const lang = context.lang || 'en';
          const l10nResult = await context.gateways.gloveboxDocTypeL10NGw.get(`${id}-${lang}`);
          return l10nResult?.documentNumberLabel ?? null;
        }

        return documentNumberLabel ?? null;
      },
    },
  },
});

export default resolvers;