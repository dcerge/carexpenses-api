// ./src/database/migrations/20251216000000_200_cars.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CARS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Car ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    // Basic car info
    table.string(FIELDS.LABEL, 32).notNullable().comment('User-defined car label/name');

    table.string(FIELDS.VIN, 32).nullable().comment('Vehicle Identification Number');

    table.string(FIELDS.MAKE, 32).nullable().comment('Vehicle make (legacy text field)');

    table.string(FIELDS.MODEL, 32).nullable().comment('Vehicle model');

    table.string(FIELDS.COLOR, 32).nullable().comment('Vehicle color');

    table.string(FIELDS.BODY_TYPE, 16).nullable().comment('Body type (legacy text field)');

    table.string(FIELDS.TRANSMISSION, 16).nullable().comment('Transmission type (legacy text field)');

    // Technical specs
    table.integer(FIELDS.ENGINE_VOLUME).notNullable().defaultTo(0).comment('Engine volume in cc');

    table.integer(FIELDS.MANUFACTURED_IN).notNullable().defaultTo(0).comment('Year of manufacture');

    table.string(FIELDS.MILEAGE_IN, 8).notNullable().defaultTo('km').comment('Mileage unit (km, mi)');

    table.integer(FIELDS.INITIAL_MILEAGE).notNullable().defaultTo(0).comment('Initial mileage when car was added');

    table.string(FIELDS.TYPE_OF_FUEL, 16).nullable().comment('Type of fuel used');

    table.integer(FIELDS.TANK_VOLUME).notNullable().defaultTo(0).comment('Main fuel tank volume in liters');

    table
      .integer(FIELDS.ADDITIONAL_TANK_VOLUME)
      .notNullable()
      .defaultTo(0)
      .comment('Additional fuel tank volume in liters');

    // Purchase info
    table.datetime(FIELDS.WHEN_BOUGHT).nullable().comment('Date when car was purchased');

    table.decimal(FIELDS.BOUGHT_FOR, 19, 4).notNullable().defaultTo(0).comment('Purchase price');

    table.string(FIELDS.BOUGHT_FOR_CURRENCY, 3).nullable().comment('Currency of purchase price (ISO 4217)');

    table.string(FIELDS.BOUGHT_FROM, 64).nullable().comment('Seller name/dealer');

    // Sale info
    table.datetime(FIELDS.WHEN_SOLD).nullable().comment('Date when car was sold');

    table.decimal(FIELDS.SOLD_FOR, 19, 4).nullable().comment('Sale price');

    table.string(FIELDS.SOLD_FOR_CURRENCY, 3).nullable().comment('Currency of sale price (ISO 4217)');

    table.string(FIELDS.SOLD_TO, 64).nullable().comment('Buyer name');

    // Additional info
    table.text(FIELDS.COMMENTS).nullable().comment('Additional comments about the car');

    // References to lookup tables (no FK constraints for now)
    table.integer(FIELDS.BODY_TYPE_ID).notNullable().defaultTo(0).comment('Reference to car_body_types');

    table
      .integer(FIELDS.TRANSMISSION_TYPE_ID)
      .notNullable()
      .defaultTo(0)
      .comment('Reference to car_transmission_types');

    table.integer(FIELDS.ENGINE_TYPE_ID).notNullable().defaultTo(0).comment('Reference to car_engine_types');

    table.integer(FIELDS.MAKE_ID).notNullable().defaultTo(0).comment('Reference to vehicle_makes');

    // Transfer/ownership tracking
    table.uuid(FIELDS.FIRST_RECORD_ID).nullable().comment('Reference to original car record if transferred');

    table.integer(FIELDS.OWNER_NUMBER).notNullable().defaultTo(1).comment('Owner sequence number (1 for first owner)');

    // Attachment reference
    table.uuid(FIELDS.ENTITY_ATTACHMENT_ID).comment('Reference to primary car image/attachment');
    table
      .uuid(FIELDS.UPLOADED_FILE_ID)
      .comment('The main image of the vehicle. Reference to a file in the storage microservice');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: false,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.USER_ID]);

    table.comment('User vehicles with specifications, purchase/sale info, and ownership tracking');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CARS);
