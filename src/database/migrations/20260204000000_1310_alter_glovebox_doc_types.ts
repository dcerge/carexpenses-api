// ./src/database/migrations/20260204000002_1300_vehicle_recall_statuses.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOC_TYPES, (table) => {

    table
      .boolean(FIELDS.HAS_INSPECTION_DATE)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has an inspection date');
  });
};

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.GLOVEBOX_DOC_TYPES, (table) => {
    table.dropColumn(FIELDS.HAS_INSPECTION_DATE);
  });