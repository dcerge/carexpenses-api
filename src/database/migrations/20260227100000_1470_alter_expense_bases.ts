// ./src/database/migrations/20260227200000_1452_add_saved_place_id_to_expense_bases.ts

import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

const COLUMN = FIELDS.SAVED_PLACE_ID;
const TABLE = TABLES.EXPENSE_BASES;
const INDEX_NAME = 'expense_bases_saved_place_id_index';

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLE, (table) => {
    table
      .uuid(COLUMN)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.SAVED_PLACES}`)
      .onDelete('SET NULL')
      .onUpdate('CASCADE')
      .comment('Reference to saved place used for this record');
  });

  await knex.raw(`
    CREATE INDEX ${INDEX_NAME}
    ON ${dbSchema}.${TABLE} (${COLUMN})
    WHERE ${COLUMN} IS NOT NULL;
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.${INDEX_NAME};`);
  await knex.schema.withSchema(dbSchema).alterTable(TABLE, (table) => {
    table.dropColumn(COLUMN);
  });
};