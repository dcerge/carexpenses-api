import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';
import { addOrderNoNum } from '@sdflc/backend-helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.REVENUE_KINDS, (table) => {
    table.integer(FIELDS.ID).primary().comment('Revenue kind ID');

    table
      .integer(FIELDS.REVENUE_CATEGORY_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.REVENUE_CATEGORIES}`)
      .onDelete('RESTRICT')
      .comment('Reference to revenue_categories');

    addOrderNoNum(table);

    table
      .string(FIELDS.CODE, 32)
      .notNullable()
      .comment('Revenue kind code (e.g., RIDESHARE, DELIVERY, VEHICLE_RENTAL)');

    table
      .integer(FIELDS.STATUS)
      .notNullable()
      .defaultTo(STATUS.ACTIVE)
      .comment('Record status: 100=Active, 200=Inactive, 300=Deleted');

    table.index([FIELDS.REVENUE_CATEGORY_ID]);
    table.index([FIELDS.STATUS]);

    table.comment('Lookup table for specific revenue kinds within categories');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.REVENUE_KINDS);