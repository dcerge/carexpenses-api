// ./src/database/migrations/20251216000000_060_expense_categories.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';
import { addOrderNoNum } from '@sdflc/backend-helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_CATEGORIES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Expense category ID');

    addOrderNoNum(table);

    table.string(FIELDS.CODE, 32).notNullable().comment('Expense category code (e.g., MAINTENANCE, FUEL, INSURANCE)');

    table.integer(FIELDS.STATUS).notNullable().defaultTo(STATUS.ACTIVE).comment('Status');

    table.index([FIELDS.STATUS]);

    table.comment('Lookup table for expense categories');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_CATEGORIES);
