// ./src/database/migrations/20251216000000_071_expense_kind_l10n.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_KIND_L10N, (table) => {
    table
      .string(FIELDS.ID, 128)
      .primary()
      .notNullable()
      .comment('ID is a combination of expense_kind.id and land, example: 1-en');

    table.integer(FIELDS.EXPENSE_KIND_ID).notNullable().comment(`Reference to ${TABLES.EXPENSE_KINDS}`);

    table.string(FIELDS.LANG, 8).notNullable().comment('ISO 639-1 language code (e.g., en, uk, es)');

    table.string(FIELDS.NAME, 64).notNullable().comment('Localized expense kind name');

    table.string(FIELDS.DESCRIPTION, 256).nullable().comment('Localized expense kind description');

    table.primary([FIELDS.EXPENSE_KIND_ID, FIELDS.LANGUAGE_CODE]);

    table.comment('Localization table for expense kind names and descriptions');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_KIND_L10N);
