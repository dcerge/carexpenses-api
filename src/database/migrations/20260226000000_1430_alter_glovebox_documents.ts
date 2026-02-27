// ./src/database/migrations/20260226000000_1430_alter_glovebox_documents.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOCUMENTS, (table) => {
    table
      .string(FIELDS.PHONE, 64)
      .nullable()
      .comment('Phone number related to the document (road assistance, insurance, etc)');
    table
      .string(FIELDS.WEBSITE, 256)
      .nullable()
      .comment('Website related to the document (where to pay for renewal, etc)');
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOCUMENTS, (table) => {
    table.dropColumn(FIELDS.PHONE);
    table.dropColumn(FIELDS.WEBSITE);
  });
};