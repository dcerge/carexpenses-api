import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

const TABLE = TABLES.TRAVELS;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLE, (table) => {
    table
      .smallint(FIELDS.TRACKING_STATUS)
      .notNullable()
      .defaultTo(0)
      .comment('Live tracking status: 0=none, 1=active, 2=paused, 3=completed');

    table
      .smallint(FIELDS.CURRENT_SEGMENT_ID)
      .notNullable()
      .defaultTo(0)
      .comment('Current segment counter, incremented on each resume after pause');

    table
      .decimal(FIELDS.GPS_DISTANCE, 12, 3)
      .nullable()
      .comment('Total GPS-derived distance in km, accumulated from raw readings on the client');

    table
      .text(FIELDS.ENCODED_POLYLINE)
      .nullable()
      .comment('Google Encoded Polyline of the simplified route, generated on trip completion');

    table
      .uuid(FIELDS.ROUTE_UPLOADED_FILE_ID)
      .nullable()
      .comment('Reference to ms_storage document containing the static route map PNG');

    table
      .datetime(FIELDS.TRACKING_STARTED_AT)
      .nullable()
      .comment('When live tracking was first started for this travel');

    table
      .datetime(FIELDS.TRACKING_ENDED_AT)
      .nullable()
      .comment('When live tracking was stopped or completed');
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).alterTable(TABLE, (table) => {
    table.dropColumn(FIELDS.TRACKING_ENDED_AT);
    table.dropColumn(FIELDS.TRACKING_STARTED_AT);
    table.dropColumn(FIELDS.ROUTE_UPLOADED_FILE_ID);
    table.dropColumn(FIELDS.ENCODED_POLYLINE);
    table.dropColumn(FIELDS.GPS_DISTANCE);
    table.dropColumn(FIELDS.CURRENT_SEGMENT_ID);
    table.dropColumn(FIELDS.TRACKING_STATUS);
  });
};