import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSE_BASES, (table) => {
    table
      .uuid(FIELDS.EXPENSE_SCHEDULE_ID)
      .comment('References expense schedule that was used to create this expense');

    table.index(FIELDS.EXPENSE_SCHEDULE_ID);
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSE_BASES, (table) => {
    table.dropIndex(FIELDS.EXPENSE_SCHEDULE_ID);
    table.dropColumn(FIELDS.EXPENSE_SCHEDULE_ID);
  });