// ./src/database/migrations/20251216000000_630_car_monthly_expenses.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_MONTHLY_EXPENSES, (table) => {
    table.uuid(FIELDS.CAR_MONTHLY_SUMMARY_ID).notNullable().comment('Reference to car_monthly_summaries');

    table.integer(FIELDS.EXPENSE_KIND_ID).notNullable().comment('Reference to expense_kinds');

    table
      .integer(FIELDS.RECORDS_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Number of expense records of this kind in this month');

    table.decimal(FIELDS.AMOUNT, 19, 4).nullable().comment('Total amount spent on this expense kind in home currency');

    table.primary([FIELDS.CAR_MONTHLY_SUMMARY_ID, FIELDS.EXPENSE_KIND_ID]);

    table.index([FIELDS.CAR_MONTHLY_SUMMARY_ID]);

    table.comment('Monthly expense totals by kind linked to car_monthly_summaries');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_MONTHLY_EXPENSES);
