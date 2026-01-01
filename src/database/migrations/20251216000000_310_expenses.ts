// ./src/database/migrations/20251216000000_310_expenses.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSES, (table) => {
    table.uuid(FIELDS.ID).primary().comment('Expense ID - should match expense_bases ID');

    table.integer(FIELDS.KIND_ID).notNullable().comment('Reference to expense_kinds');

    table.decimal(FIELDS.COST_WORK, 19, 4).notNullable().defaultTo(0).comment('Cost of labor/work in paid currency');

    table.decimal(FIELDS.COST_PARTS, 19, 4).notNullable().defaultTo(0).comment('Cost of parts in paid currency');

    table.decimal(FIELDS.COST_WORK_HC, 19, 4).nullable().comment('Cost of labor/work in home currency');

    table.decimal(FIELDS.COST_PARTS_HC, 19, 4).nullable().comment('Cost of parts in home currency');

    table.string(FIELDS.SHORT_NOTE, 128).nullable().comment('Brief note about the expense');

    table.index([FIELDS.KIND_ID]);

    table.comment('Expense-specific details (extends expense_bases)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSES);
