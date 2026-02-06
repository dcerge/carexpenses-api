// ./src/database/migrations/20260204000002_1300_vehicle_recall_statuses.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.VEHICLE_RECALL_STATUSES, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Vehicle recall status ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table
      .uuid(FIELDS.CAR_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.CARS}`)
      .comment('Reference to the user vehicle');

    table
      .uuid(FIELDS.VEHICLE_RECALL_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.VEHICLE_RECALLS}`)
      .onDelete('CASCADE')
      .comment('Reference to the shared recall record');

    table
      .datetime(FIELDS.DISMISSED_AT)
      .nullable()
      .comment('When the user dismissed this recall');

    table
      .datetime(FIELDS.RESOLVED_AT)
      .nullable()
      .comment('When the user marked this recall as resolved/repaired');

    table
      .text(FIELDS.NOTES)
      .nullable()
      .comment('User notes about this recall (e.g. repair details, dealer info)');

    // Standard audit fields
    // status: 100 = Active (open recall, needs attention), 5000 = Disabled (dismissed by user), 10000 = Removed (resolved/repaired)
    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Unique constraint: one status record per car per recall
    table.unique(
      [FIELDS.ACCOUNT_ID, FIELDS.CAR_ID, FIELDS.VEHICLE_RECALL_ID],
      { indexName: 'uq_vehicle_recall_statuses_account_car_recall' }
    );

    // Indexes
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.VEHICLE_RECALL_ID]);

    table.comment(
      'Per-user, per-vehicle link to the shared vehicle_recalls catalog. Tracks whether a recall is open (100), dismissed (5000), or resolved (10000) for a specific user vehicle. Only table in the recalls system that has account_id.'
    );
  });

  // Partial index for efficient dashboard queries: find open recalls for an account
  await knex.raw(`
    CREATE INDEX idx_vehicle_recall_statuses_open
    ON ${dbSchema}.${TABLES.VEHICLE_RECALL_STATUSES} (${FIELDS.ACCOUNT_ID}, ${FIELDS.CAR_ID})
    WHERE (${FIELDS.REMOVED_AT} IS NULL AND ${FIELDS.STATUS} = 100)
  `);
};

export const down = async (knex: Knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${dbSchema}.idx_vehicle_recall_statuses_open`);
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.VEHICLE_RECALL_STATUSES);
};