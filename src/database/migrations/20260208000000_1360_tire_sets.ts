// ./src/database/migrations/20260208000000_1360_tire_sets.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.TIRE_SETS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Tire set ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - user who created the tire set');

    table
      .uuid(FIELDS.CAR_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.CARS}`)
      .comment('Reference to the vehicle');

    // ---------------------------------------------------------------------------
    // Tire Set Info
    // ---------------------------------------------------------------------------

    table
      .string(FIELDS.NAME, 128)
      .notNullable()
      .comment('User-friendly label (e.g., "Summer 2024", "Winter Nokians")');

    table
      .string(FIELDS.TIRE_TYPE, 32)
      .notNullable()
      .comment('Tire type: summer, winter, all_season, all_weather, performance, off_road');

    table
      .string(FIELDS.STORAGE_LOCATION, 256)
      .nullable()
      .comment('Where tires are stored when not on vehicle (e.g., "garage", "Tire Hotel on 5th Ave")');

    table
      .integer(FIELDS.QUANTITY)
      .notNullable()
      .defaultTo(4)
      .comment('Total number of tires in the set (4 for cars, 2 for motorcycles, 6+ for trucks)');

    table
      .text(FIELDS.NOTES)
      .nullable()
      .comment('Additional notes about the tire set');

    // ---------------------------------------------------------------------------
    // Standard Audit Fields
    // ---------------------------------------------------------------------------
    // status: 100 = Active, 10000 = Removed (soft delete)
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // ---------------------------------------------------------------------------
    // Indexes
    // ---------------------------------------------------------------------------
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.USER_ID]);

    table.comment(
      'Tire sets represent a logical group of tires on a vehicle (e.g., "my summer tires", "my winter set"). ' +
      'A set can contain mixed brands/models via tire_set_items when tires are partially replaced. ' +
      'tire_set_status tracks whether the set is currently on the vehicle (active), in storage (stored), ' +
      'or disposed of (retired). Financial data and installation dates are tracked through linked expense records. ' +
      'The tire_set_status is the business state.'
    );
  });
};

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.TIRE_SETS);