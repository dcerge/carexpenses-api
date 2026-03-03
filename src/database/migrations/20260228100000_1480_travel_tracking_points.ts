import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.TRAVEL_TRACKING_POINTS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Tracking point ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');
    table.uuid(FIELDS.TRAVEL_ID).notNullable().comment('Travel ID - no FK constraint for insert performance');

    table.smallint(FIELDS.SEGMENT_ID).notNullable().defaultTo(0).comment('Segment index, incremented on each pause/resume cycle');
    table.integer(FIELDS.SEQ).notNullable().comment('Monotonically increasing sequence number, global per travel');

    // Coordinates
    table.decimal(FIELDS.LATITUDE, 10, 7).notNullable().comment('GPS latitude');
    table.decimal(FIELDS.LONGITUDE, 10, 7).notNullable().comment('GPS longitude');
    table.decimal(FIELDS.ALTITUDE, 7, 2).nullable().comment('Altitude in meters above sea level');

    // Motion data
    table.decimal(FIELDS.SPEED, 6, 2).nullable().comment('Speed in m/s from GPS');
    table.decimal(FIELDS.HEADING, 5, 2).nullable().comment('Heading in degrees 0-360 from GPS');
    table.decimal(FIELDS.ACCURACY, 6, 2).nullable().comment('GPS accuracy in meters');

    // Timestamps
    table.datetime(FIELDS.RECORDED_AT).notNullable().comment('When the GPS reading was taken on the device');
    table.datetime(FIELDS.CREATED_AT).defaultTo(knex.fn.now()).notNullable().comment('When the record was inserted into the database');

    // Indexes
    table.index([FIELDS.CREATED_AT]);
    table.index([FIELDS.TRAVEL_ID, FIELDS.SEQ]);
    table.index([FIELDS.ACCOUNT_ID, FIELDS.TRAVEL_ID]);

    table.comment('GPS tracking points collected during live travel tracking. Auto-generated data, no soft deletes. Hard-deleted by retention job after N days.');
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.TRAVEL_TRACKING_POINTS);
};