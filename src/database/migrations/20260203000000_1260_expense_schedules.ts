// ./src/database/migrations/20260203000000_1260_expense_schedules.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_SCHEDULES, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Expense schedule ID');

    table
      .uuid(FIELDS.CAR_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.CARS}`)
      .comment('Reference to cars');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - user to attribute generated expenses to');

    table.integer(FIELDS.KIND_ID).notNullable().comment('Reference to expense_kinds');

    // Schedule configuration
    table
      .string(FIELDS.SCHEDULE_TYPE, 16)
      .notNullable()
      .comment('Schedule type: weekly, monthly, yearly, one-time');

    table
      .string(FIELDS.SCHEDULE_DAYS, 64)
      .notNullable()
      .comment('Schedule days: 1,3,5 (weekly, ISO 1=Mon 7=Sun) / 1,15,last (monthly) / 01-15,06-15 (yearly) / 2026-06-20 (one-time)');

    table.datetime(FIELDS.START_AT).notNullable().comment('When schedule becomes active');

    table.datetime(FIELDS.END_AT).nullable().comment('When schedule stops (null = no end)');

    table.datetime(FIELDS.NEXT_SCHEDULED_AT).nullable().comment('Pre-computed next occurrence');

    table.datetime(FIELDS.LAST_ADDED_AT).nullable().comment('When expense was last created from this schedule');

    table
      .uuid(FIELDS.LAST_CREATED_EXPENSE_ID)
      .nullable()
      .comment('Reference to most recently created expense from this schedule');

    // Expense template fields (mirrors expense_bases + expenses)
    table.string(FIELDS.WHERE_DONE, 128).nullable().comment('Place name (insurance company, parking, etc.)');

    table.decimal(FIELDS.COST_WORK, 19, 4).notNullable().defaultTo(0).comment('Labor cost template');

    table.decimal(FIELDS.COST_PARTS, 19, 4).notNullable().defaultTo(0).comment('Parts cost template');

    table.decimal(FIELDS.TAX, 19, 4).notNullable().defaultTo(0).comment('Tax amount template');

    table.decimal(FIELDS.FEES, 19, 4).notNullable().defaultTo(0).comment('Fees amount template');

    table.decimal(FIELDS.SUBTOTAL, 19, 4).notNullable().defaultTo(0).comment('Subtotal in paid currency');

    table.decimal(FIELDS.TOTAL_PRICE, 19, 4).notNullable().defaultTo(0).comment('Total price in paid currency');

    table
      .string(FIELDS.PAID_IN_CURRENCY, 3)
      .nullable()
      .comment('Currency for expense (null = use user home currency)');

    table.string(FIELDS.SHORT_NOTE, 128).nullable().comment('Brief note template for generated expenses');

    table.text(FIELDS.COMMENTS).nullable().comment('Additional comments template');

    // Status and audit
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.KIND_ID]);
    table.index([FIELDS.NEXT_SCHEDULED_AT]);
    table.index([FIELDS.LAST_CREATED_EXPENSE_ID]);

    table.comment('Scheduled recurring expenses configuration');
  });

  // Composite index for efficient cron job queries
  await knex.raw(`
    CREATE INDEX idx_expense_schedules_active_pending 
    ON ${dbSchema}.${TABLES.EXPENSE_SCHEDULES} (${FIELDS.STATUS}, ${FIELDS.NEXT_SCHEDULED_AT}) 
    WHERE (${FIELDS.REMOVED_AT} IS NULL AND ${FIELDS.STATUS} = 100)
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_expense_schedules_active_pending`);
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_SCHEDULES);
};