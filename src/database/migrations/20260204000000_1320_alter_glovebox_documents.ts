// ./src/database/migrations/20260204000002_1300_vehicle_recall_statuses.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOCUMENTS, (table) => {

    table
      .date(FIELDS.INSPECTED_AT)
      .nullable()
      .comment('Date when the item was inspected');
  });
};

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOCUMENTS, (table) => {
    table.dropColumn(FIELDS.INSPECTED_AT);
  });