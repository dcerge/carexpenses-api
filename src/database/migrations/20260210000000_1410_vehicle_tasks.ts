// ./src/database/migrations/20260210000001_1410_vehicle_tasks.ts
import { Knex } from 'knex';
import { addOrderNoNum, dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.VEHICLE_TASKS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Vehicle task ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    addOrderNoNum(table);

    table
      .uuid(FIELDS.CAR_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.CARS}`)
      .comment('Reference to cars (nullable for account-wide tasks)');

    table.uuid(FIELDS.ASSIGNED_TO_USER_ID).nullable().comment('User ID - who should complete the task');

    table
      .integer(FIELDS.PRIORITY)
      .notNullable()
      .defaultTo(100)
      .comment('Priority: 100 = low, 200 = medium, 300 = high');


    // Task details
    table.string(FIELDS.TITLE, 256).notNullable().comment('Task description');

    table.text(FIELDS.NOTES).nullable().comment('Additional details');

    table.string(FIELDS.CATEGORY, 128).nullable().comment('Task type for grouping: administrative, purchase, appointment, seasonal, repair');

    // Dates
    table.datetime(FIELDS.DUE_DATE).nullable().comment('Optional due date/time in UTC');

    table.datetime(FIELDS.REMINDER_DATE).nullable().comment('When to send reminder notification (in UTC)');

    // Recurrence (same pattern as expense_schedules)
    table
      .string(FIELDS.SCHEDULE_TYPE, 16)
      .notNullable()
      .defaultTo('one-time')
      .comment('Recurrence type: weekly, monthly, yearly, one-time (no recurrence)');

    table
      .string(FIELDS.SCHEDULE_DAYS, 64)
      .nullable()
      .comment('Schedule days: 1,3,5 (weekly, ISO 1=Mon 7=Sun) / 1,15,last (monthly) / 01-15,06-15 (yearly) / 2026-06-20 (one-time)');

    // Completion
    table.datetime(FIELDS.COMPLETED_AT).nullable().comment('When marked complete (in UTC)');
    table.uuid(FIELDS.COMPLETED_BY_USER_ID).nullable().comment('User ID - who completed the task');

    table
      .uuid(FIELDS.LINKED_EXPENSE_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.EXPENSES}`)
      .comment('Reference to expense created from this task');

    // Status and audit
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.ASSIGNED_TO_USER_ID]);
    table.index([FIELDS.DUE_DATE]);
    table.index([FIELDS.LINKED_EXPENSE_ID]);

    table.comment('Per-vehicle to-do tasks with optional recurrence and expense linking');
  });

  // Composite index for dashboard widget: pending/in-progress tasks sorted by due date
  await knex.raw(`
    CREATE INDEX idx_vehicle_tasks_active_by_due_date 
    ON ${dbSchema}.${TABLES.VEHICLE_TASKS} (${FIELDS.ACCOUNT_ID}, ${FIELDS.STATUS}, ${FIELDS.DUE_DATE}) 
    WHERE (${FIELDS.REMOVED_AT} IS NULL AND ${FIELDS.STATUS} IN (100, 200))
  `);

  // Index for reminder notifications processing
  await knex.raw(`
    CREATE INDEX idx_vehicle_tasks_pending_reminders 
    ON ${dbSchema}.${TABLES.VEHICLE_TASKS} (${FIELDS.REMINDER_DATE}) 
    WHERE (${FIELDS.REMOVED_AT} IS NULL AND ${FIELDS.STATUS} IN (100, 200) AND ${FIELDS.REMINDER_DATE} IS NOT NULL)
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_vehicle_tasks_pending_reminders`);
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_vehicle_tasks_active_by_due_date`);
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.VEHICLE_TASKS);
};