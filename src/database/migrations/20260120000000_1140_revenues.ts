import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.REVENUES, (table) => {
    table.uuid(FIELDS.ID).primary().comment('Revenue ID - should match expense_bases ID');

    table
      .integer(FIELDS.KIND_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.REVENUE_KINDS}`)
      .onDelete('RESTRICT')
      .comment('Reference to revenue_kinds');

    table.string(FIELDS.SHORT_NOTE, 128).nullable().comment('Brief note about the revenue');

    table.index([FIELDS.KIND_ID]);

    table.comment('Revenue-specific details (extends expense_bases)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.REVENUES);