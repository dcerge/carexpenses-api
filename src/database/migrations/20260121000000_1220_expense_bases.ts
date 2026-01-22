import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSE_BASES, (table) => {
    table
      .string(FIELDS.POINT_TYPE, 32)
      .nullable()
      .comment('Point type for travel waypoints (expense_type=4): home, office, client, other');

    table.index([FIELDS.POINT_TYPE]);
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSE_BASES, (table) => {
    table.dropIndex([FIELDS.POINT_TYPE]);
    table.dropColumn(FIELDS.POINT_TYPE);
  });