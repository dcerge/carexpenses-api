// ./src/database/migrations/20251216000000_300_expense_bases.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_BASES, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Expense base ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    table.integer(FIELDS.EXPENSE_TYPE).notNullable().comment('Expense type: 1=Refuel, 2=Expense');

    // Mileage tracking
    table.decimal(FIELDS.ODOMETER, 19, 4).nullable().comment('Odometer reading at time of expense');

    table.decimal(FIELDS.TRIP_METER, 19, 4).nullable().comment('Trip meter reading');

    // When and where
    table.datetime(FIELDS.WHEN_DONE).notNullable().comment('Date/time when expense occurred');

    table.string(FIELDS.LOCATION, 128).nullable().comment('Location/address where expense occurred');

    table.string(FIELDS.WHERE_DONE, 128).nullable().comment('Place name (gas station, service center, etc.)');

    // Cost info
    table.decimal(FIELDS.SUBTOTAL, 19, 4).notNullable().defaultTo(0).comment('Subtotal price in paid currency');
    table.decimal(FIELDS.TAX, 19, 4).notNullable().defaultTo(0).comment('Tax amount in paid currency');
    table.decimal(FIELDS.FEES, 19, 4).notNullable().defaultTo(0).comment('Fees amount in paid currency');
    table.decimal(FIELDS.TOTAL_PRICE, 19, 4).notNullable().defaultTo(0).comment('Total price in paid currency');

    table
      .string(FIELDS.PAID_IN_CURRENCY, 3)
      .notNullable()
      .defaultTo('USD')
      .comment('Currency used for payment (ISO 4217)');

    table.decimal(FIELDS.TOTAL_PRICE_IN_HC, 19, 4).nullable().comment('Total price converted to home currency');

    table.string(FIELDS.HOME_CURRENCY, 3).nullable().comment('Home currency at time of expense (ISO 4217)');

    // Legacy picture reference
    table.uuid(FIELDS.EXPENSE_PICTURE_ID).nullable().comment('Legacy picture ID - to be replaced by attachment system');

    table.text(FIELDS.COMMENTS).nullable().comment('Additional comments about the expense');

    table.decimal(FIELDS.FUEL_IN_TANK, 19, 4).nullable().comment('Estimated fuel in tank at time of expense');

    // References
    table.uuid(FIELDS.LABEL_ID).nullable().comment('Reference to expense_labels');

    table.uuid(FIELDS.TRAVEL_ID).nullable().comment('Reference to travels');

    table.integer(FIELDS.OWNER_NUMBER).notNullable().defaultTo(1).comment('Owner number at time of expense');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.EXPENSE_TYPE]);
    table.index([FIELDS.ODOMETER]);
    table.index([FIELDS.WHEN_DONE]);
    table.index([FIELDS.LABEL_ID]);
    table.index([FIELDS.TRAVEL_ID]);

    table.comment('Base table for all expenses and refuels with common fields');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_BASES);
