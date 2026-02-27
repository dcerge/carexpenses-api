// ./src/database/migrations/20260226000000_1440_alter_glovebox_doc_types.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOC_TYPES, (table) => {
    table
      .boolean(FIELDS.HAS_PHONE)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has a phone number (road assistance, insurance, etc)');

    table
      .boolean(FIELDS.HAS_WEBSITE)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has a website');
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOC_TYPES, (table) => {
    table.dropColumn(FIELDS.HAS_PHONE);
    table.dropColumn(FIELDS.HAS_WEBSITE);
  });
};