// ./src/database/migrations/20251216000000_061_expense_category_l10n.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_CATEGORY_L10N, (table) => {
    table
      .string(FIELDS.ID, 128)
      .primary()
      .notNullable()
      .comment('ID is a comibnation of expense_category.id and land, example: 1-en');

    table.integer(FIELDS.EXPENSE_CATEGORY_ID).notNullable().comment(`Reference to ${TABLES.EXPENSE_CATEGORIES}`);
    table.string(FIELDS.LANG, 8).notNullable().comment('ISO 639-1 language code (e.g., en, uk, es)');

    table.string(FIELDS.NAME, 64).notNullable().comment('Localized expense category name');

    table.string(FIELDS.DESCRIPTION, 256).nullable().comment('Localized expense category description');

    table.primary([FIELDS.EXPENSE_CATEGORY_ID, FIELDS.LANGUAGE_CODE]);

    table.comment('Localization table for expense category names and descriptions');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_CATEGORY_L10N);
