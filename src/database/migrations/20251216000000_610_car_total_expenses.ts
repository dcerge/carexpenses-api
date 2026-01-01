// ./src/database/migrations/20251216000000_610_car_total_expenses.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_TOTAL_EXPENSES, (table) => {
    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.string(FIELDS.HOME_CURRENCY, 3).notNullable().comment('Home currency for this summary (ISO 4217)');

    table.integer(FIELDS.EXPENSE_KIND_ID).notNullable().comment('Reference to expense_kinds');

    table.integer(FIELDS.RECORDS_COUNT).notNullable().defaultTo(0).comment('Number of expense records of this kind');

    table.decimal(FIELDS.AMOUNT, 19, 4).nullable().comment('Total amount spent on this expense kind in home currency');

    table.primary([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY, FIELDS.EXPENSE_KIND_ID]);

    table.index([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY]);

    table.comment('Aggregated expense totals by kind for each car by currency');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_TOTAL_EXPENSES);
