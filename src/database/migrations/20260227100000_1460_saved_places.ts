// ./src/database/migrations/20260227100000_1460_saved_places.ts

import { Knex } from 'knex';

import { addOrderNoNum, dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.SAVED_PLACES, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Saved place ID');
    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    // Place identity
    table.string(FIELDS.NAME, 128).notNullable().comment('Display label: Home, Acme Corp, Shell on 5th');
    table.string(FIELDS.NORMALIZED_NAME, 128).nullable().comment('Lowercase name for case-insensitive operations');
    table.string(FIELDS.PLACE_TYPE, 32).defaultTo('other').notNullable().comment('Place type: home, office, client, gas_station, mechanic, store, other');
    table.boolean(FIELDS.IS_PRIVATE).defaultTo(false).notNullable().comment('When true, only visible to the user who created it');

    // Place name (maps to expense_bases.where_done)
    table.string(FIELDS.WHERE_DONE, 128).nullable().comment('Place/business name as used in expense_bases');

    // Address fields
    table.string(FIELDS.ADDRESS_1, 128).nullable().comment('Street address');
    table.string(FIELDS.ADDRESS_2, 128).nullable().comment('PO Box, Apartment, Suite, etc.');
    table.string(FIELDS.CITY, 128).nullable().comment('City');
    table.string(FIELDS.POSTAL_CODE, 16).nullable().comment('Postal Code/Zip');
    table.string(FIELDS.STATE_PROVINCE, 128).nullable().comment('State or Province');
    table.string(FIELDS.COUNTRY, 128).nullable().comment('Country full name');
    table.string(FIELDS.COUNTRY_ID, 4).nullable().comment('Country code: US, CA, FR, RU, etc');

    // Coordinates
    table.decimal(FIELDS.LATITUDE, 12, 7).nullable().comment('GPS latitude');
    table.decimal(FIELDS.LONGITUDE, 12, 7).nullable().comment('GPS longitude');

    // Auto-match radius
    table.integer(FIELDS.RADIUS_M).defaultTo(150).notNullable().comment('Auto-match radius in meters for GPS proximity detection');

    // Usage tracking
    table.integer(FIELDS.USE_COUNT).defaultTo(0).notNullable().comment('Number of times this place has been selected');
    table.timestamp(FIELDS.LAST_USED_AT, { useTz: true }).nullable().comment('Last time this place was selected');

    // Sort order
    addOrderNoNum(table);

    // Status and audit
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: false,
    });

    // Indexes
    table.index([FIELDS.ACCOUNT_ID, FIELDS.STATUS]);
    table.index([FIELDS.ACCOUNT_ID, FIELDS.PLACE_TYPE, FIELDS.STATUS]);
    table.index([FIELDS.ACCOUNT_ID, FIELDS.IS_PRIVATE, FIELDS.CREATED_BY]);
    table.index([FIELDS.LATITUDE, FIELDS.LONGITUDE]);
    table.index([FIELDS.USE_COUNT]);

    table.comment('User-saved frequently visited places for quick selection in travels and expenses');
  });

  // Unique name per account with soft-delete support
  await knex.raw(`
    CREATE UNIQUE INDEX idx_saved_places_unique_name
    ON ${dbSchema}.${TABLES.SAVED_PLACES} (${FIELDS.ACCOUNT_ID}, ${FIELDS.NORMALIZED_NAME}, ${FIELDS.REMOVED_AT_STR})
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_saved_places_unique_name`);
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.SAVED_PLACES);
};