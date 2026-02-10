// ./src/database/migrations/20260208000000_1380_alter_expenses.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSES, (table) => {
    table
      .uuid(FIELDS.TIRE_SET_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.TIRE_SETS}`)
      .comment('Reference to tire set for tire-related expenses (rotation, swap, alignment, repair)');

    table.index([FIELDS.TIRE_SET_ID]);
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSES, (table) => {
    table.dropIndex([FIELDS.TIRE_SET_ID]);
    table.dropColumn(FIELDS.TIRE_SET_ID);
  });
};