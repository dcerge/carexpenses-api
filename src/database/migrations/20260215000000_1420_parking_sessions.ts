// ./src/database/migrations/20260215000000_1430_parking_sessions.ts

import { Knex } from 'knex';

import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.PARKING_SESSIONS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Parking session ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table
      .uuid(FIELDS.CAR_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.CARS}`)
      .comment('Associated vehicle');

    table
      .uuid(FIELDS.TRAVEL_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.TRAVELS}`)
      .comment('Associated travel record');

    // Timing
    table.datetime(FIELDS.START_TIME).notNullable().comment('When parking started (UTC)');
    table.datetime(FIELDS.END_TIME).nullable().comment('When parking ended (null while active, UTC)');
    table.integer(FIELDS.DURATION_MINUTES).nullable().comment('Paid duration in minutes (null = free/unknown)');

    // Pricing
    table.decimal(FIELDS.INITIAL_PRICE, 12, 2).nullable().comment('Price entered at start');
    table.decimal(FIELDS.FINAL_PRICE, 12, 2).nullable().comment('Price confirmed at end');
    table.string(FIELDS.CURRENCY, 3).nullable().comment('Currency code: USD, CAD, EUR, etc');

    // Location
    table.decimal(FIELDS.LATITUDE, 10, 7).nullable().comment('GPS latitude of parking location');
    table.decimal(FIELDS.LONGITUDE, 10, 7).nullable().comment('GPS longitude of parking location');
    table.text(FIELDS.FORMATTED_ADDRESS).nullable().comment('Reverse-geocoded or manually entered address');

    // Attachments & notes
    table.uuid(FIELDS.UPLOADED_FILE_ID).nullable().comment('Reference to a photo from the parking spot');
    table.text(FIELDS.NOTES).nullable().comment('User notes (e.g., Level 3, spot B12)');

    // Linked expense
    table
      .uuid(FIELDS.EXPENSE_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.EXPENSES}`)
      .comment('Reference to generated expense (set on close)');

    // User tracking
    table.uuid(FIELDS.STARTED_BY).notNullable().comment('User who started the session');
    table.uuid(FIELDS.ENDED_BY).nullable().comment('User who ended the session');

    // Status and audit
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ACCOUNT_ID, FIELDS.CAR_ID, FIELDS.STATUS]);
    table.index([FIELDS.ACCOUNT_ID, FIELDS.STATUS]);
    table.index([FIELDS.ACCOUNT_ID, FIELDS.CAR_ID, FIELDS.START_TIME]);
    table.index([FIELDS.EXPENSE_ID]);
    table.index([FIELDS.TRAVEL_ID]);

    table.comment('Real-time parking session tracking with auto expense generation');
  });

  // Enforce one active session per vehicle at the database level
  await knex.raw(`
    CREATE UNIQUE INDEX idx_parking_sessions_one_active_per_car
    ON ${dbSchema}.${TABLES.PARKING_SESSIONS} (${FIELDS.ACCOUNT_ID}, ${FIELDS.CAR_ID})
    WHERE (${FIELDS.REMOVED_AT} IS NULL AND ${FIELDS.STATUS} = 100)
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_parking_sessions_one_active_per_car`);
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.PARKING_SESSIONS);
};