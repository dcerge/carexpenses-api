// ./src/database/migrations/20260204000000_1280_vehicle_recall_lookups.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.VEHICLE_RECALL_LOOKUPS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Vehicle recall lookup ID');

    table
      .string(FIELDS.MAKE_NAME, 64)
      .notNullable()
      .comment('Vehicle make name normalized to uppercase (e.g. HONDA, FORD)');

    table
      .string(FIELDS.MODEL, 64)
      .notNullable()
      .comment('Vehicle model name normalized to uppercase (e.g. CIVIC, F-150)');

    table
      .integer(FIELDS.MODEL_YEAR)
      .notNullable()
      .comment('Vehicle model year (e.g. 2020)');

    table
      .string(FIELDS.SOURCE, 8)
      .notNullable()
      .comment('Recall data source: NHTSA (US) or TC (Canada)');

    table
      .string(FIELDS.COUNTRY_CODE, 2)
      .notNullable()
      .comment('Country code for the source: US, CA');

    table
      .datetime(FIELDS.FETCHED_AT)
      .nullable()
      .comment('When the API was last successfully called for this combination');

    table
      .datetime(FIELDS.NEXT_FETCH_AFTER)
      .nullable()
      .comment('Earliest time to re-fetch from the API (for cache TTL control)');

    table
      .integer(FIELDS.RESULTS_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Number of recall records returned from the API');

    table
      .text(FIELDS.FETCH_ERROR)
      .nullable()
      .comment('Error message if last fetch failed');

    // Standard audit fields
    // status: 300 = Pending (queued/not yet fetched), 100 = Active (successfully fetched), 1000 = Blocked (fetch error)
    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Unique constraint: one lookup record per make/model/year/source
    table.unique(
      [FIELDS.MAKE_NAME, FIELDS.MODEL, FIELDS.MODEL_YEAR, FIELDS.SOURCE],
      { indexName: 'uq_vehicle_recall_lookups_make_model_year_source' }
    );

    // Indexes
    table.index([FIELDS.NEXT_FETCH_AFTER]);
    table.index([FIELDS.FETCHED_AT]);

    table.comment(
      'Tracks which make/model/year combinations have been queried against recall APIs (NHTSA, Transport Canada). Used to deduplicate API calls across all users. Status: 300=Pending, 100=Active (fetched OK), 1000=Blocked (fetch error).'
    );
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.VEHICLE_RECALL_LOOKUPS);
};