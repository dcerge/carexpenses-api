import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.REVENUE_CATEGORY_L10N, (table) => {
    table
      .string(FIELDS.ID, 128)
      .primary()
      .notNullable()
      .comment('ID is a combination of revenue_category.id and lang, example: 1-en');

    table.integer(FIELDS.REVENUE_CATEGORY_ID).notNullable().comment(`Reference to ${TABLES.REVENUE_CATEGORIES}`);

    table.string(FIELDS.LANG, 8).notNullable().comment('ISO 639-1 language code (e.g., en, ru, es, fr)');

    table.string(FIELDS.NAME, 64).notNullable().comment('Localized revenue category name');

    table.string(FIELDS.DESCRIPTION, 256).nullable().comment('Localized revenue category description');

    table.index([FIELDS.REVENUE_CATEGORY_ID]);

    table.comment('Localization table for revenue category names and descriptions');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.REVENUE_CATEGORY_L10N);