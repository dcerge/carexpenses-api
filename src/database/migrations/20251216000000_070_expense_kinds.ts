// ./src/database/migrations/20251216000000_070_expense_kinds.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';
import { addOrderNoNum } from '@sdflc/backend-helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_KINDS, (table) => {
    table.integer(FIELDS.ID).primary().comment('Expense kind ID');

    table
      .integer(FIELDS.EXPENSE_CATEGORY_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.EXPENSE_CATEGORIES}`)
      .onDelete('RESTRICT')
      .comment('Reference to expense_categories');

    addOrderNoNum(table);

    table
      .string(FIELDS.CODE, 32)
      .notNullable()
      .comment('Expense kind code (e.g., OIL_CHANGE, TIRE_ROTATION, BRAKE_PADS)');

    table
      .boolean(FIELDS.CAN_SCHEDULE)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this expense kind can be scheduled for reminders');

    table
      .boolean(FIELDS.IS_IT_MAINTENANCE)
      .notNullable()
      .defaultTo(false)
      .comment('Flag indicating if this is a maintenance type expense');

    table
      .integer(FIELDS.STATUS)
      .notNullable()
      .defaultTo(STATUS.ACTIVE)
      .comment('Record status: 100=Active, 200=Inactive, 300=Deleted');

    table.index([FIELDS.EXPENSE_CATEGORY_ID]);
    table.index([FIELDS.STATUS]);

    table.comment('Lookup table for specific expense kinds within categories');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_KINDS);
