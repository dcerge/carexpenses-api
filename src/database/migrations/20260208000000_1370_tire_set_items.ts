// ./src/database/migrations/20260208000000_1370_tire_set_items.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.TIRE_SET_ITEMS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Tire set item ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table
      .uuid(FIELDS.TIRE_SET_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.TIRE_SETS}`)
      .comment('Reference to the parent tire set');

    table
      .uuid(FIELDS.EXPENSE_ID)
      .nullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.EXPENSES}`)
      .comment('Reference to the purchase expense record (nullable for came_with_vehicle)');

    // ---------------------------------------------------------------------------
    // Tire Details
    // ---------------------------------------------------------------------------

    table
      .string(FIELDS.BRAND, 128)
      .notNullable()
      .comment('Tire manufacturer name (e.g., Michelin, Continental, "Unknown")');

    table
      .string(FIELDS.MODEL, 128)
      .nullable()
      .comment('Tire model name (e.g., Pilot Sport 4, WinterContact TS 870)');

    table
      .string(FIELDS.TIRE_SIZE, 32)
      .notNullable()
      .comment('Tire size code normalized on save (e.g., "225/45R17"). Accepts formats: 225/45R17, 225/45/17, P225/45R17');

    table
      .string(FIELDS.POSITION, 16)
      .notNullable()
      .defaultTo('all')
      .comment('Position on vehicle: all, front, rear');

    table
      .integer(FIELDS.QUANTITY)
      .notNullable()
      .comment('Number of tires of this specific type within the set (typically 2 or 4)');

    table
      .string(FIELDS.TIRE_CONDITION, 32)
      .notNullable()
      .defaultTo('new')
      .comment('Condition when acquired: new, used, came_with_vehicle');

    // ---------------------------------------------------------------------------
    // Tread & Manufacturing
    // ---------------------------------------------------------------------------

    table
      .decimal(FIELDS.TREAD_DEPTH_INITIAL, 5, 2)
      .nullable()
      .comment('Starting tread depth in mm when acquired');

    table
      .string(FIELDS.DOT_CODE, 16)
      .nullable()
      .comment('DOT manufacturing date code from sidewall (e.g., "2319" = week 23 of 2019)');

    // ---------------------------------------------------------------------------
    // Registration
    // ---------------------------------------------------------------------------

    table
      .boolean(FIELDS.IS_REGISTERED)
      .notNullable()
      .defaultTo(false)
      .comment('Whether tires have been registered with the manufacturer for recall notifications');

    // ---------------------------------------------------------------------------
    // Additional Info
    // ---------------------------------------------------------------------------

    table
      .text(FIELDS.NOTES)
      .nullable()
      .comment('Additional notes about these tires');

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
    table.index([FIELDS.TIRE_SET_ID]);
    table.index([FIELDS.EXPENSE_ID]);

    table.comment(
      'Individual tire items within a tire set. A set can contain multiple items when tires are ' +
      'partially replaced (e.g., 2 Michelin rear + 2 Continental front after replacing worn fronts). ' +
      'Each item represents a group of identical tires purchased together. ' +
      'Purchase cost and date are tracked via the linked expense record (expense_id). '
    );
  });
};

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.TIRE_SET_ITEMS);