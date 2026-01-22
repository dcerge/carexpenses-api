// ./src/database/migrations/20251216000000_220_travels.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.TRAVELS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Travel ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    table
      .boolean(FIELDS.IS_ACTIVE)
      .notNullable()
      .defaultTo(true)
      .comment('Whether the travel is currently active/ongoing');

    // Odometer tracking
    table.decimal(FIELDS.FIRST_ODOMETER, 19, 4).nullable().comment('Odometer reading at start of travel');

    table.decimal(FIELDS.LAST_ODOMETER, 19, 4).nullable().comment('Odometer reading at end of travel');

    // Record references
    table.uuid(FIELDS.FIRST_RECORD_ID).nullable().comment('First expense/refuel record ID for this travel');

    table.uuid(FIELDS.LAST_RECORD_ID).nullable().comment('Last expense/refuel record ID for this travel');

    // Time tracking
    table.datetime(FIELDS.FIRST_DTTM).nullable().comment('Start date/time of travel');

    table.datetime(FIELDS.LAST_DTTM).nullable().comment('End date/time of travel');

    // Label reference
    table.uuid(FIELDS.LABEL_ID).nullable().comment('Reference to expense_labels');

    // Travel details
    table
      .string(FIELDS.PURPOSE, 128)
      .notNullable()
      .defaultTo('')
      .comment('Purpose of the travel (e.g., Business, Vacation)');

    table.string(FIELDS.DESTINATION, 128).nullable().defaultTo('').comment('Travel destination');

    table.text(FIELDS.COMMENTS).nullable().comment('Additional comments about the travel');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.LABEL_ID]);

    table.comment('User travels/trips with mileage tracking and expense grouping');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.TRAVELS);
