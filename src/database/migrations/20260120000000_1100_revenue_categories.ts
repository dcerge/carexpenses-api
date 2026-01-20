import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';
import { addOrderNoNum } from '@sdflc/backend-helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.REVENUE_CATEGORIES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Revenue category ID');

    addOrderNoNum(table);

    table
      .string(FIELDS.CODE, 32)
      .notNullable()
      .unique()
      .comment('Revenue category code (e.g., TRANSPORTATION, RENTAL, ADVERTISING)');

    table
      .integer(FIELDS.STATUS)
      .notNullable()
      .defaultTo(STATUS.ACTIVE)
      .comment('Record status: 100=Active, 200=Inactive, 300=Deleted');

    table.index([FIELDS.STATUS]);

    table.comment('Lookup table for revenue categories');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.REVENUE_CATEGORIES);