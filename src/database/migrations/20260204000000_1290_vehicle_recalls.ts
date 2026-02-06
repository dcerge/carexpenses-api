// ./src/database/migrations/20260204000001_1290_vehicle_recalls.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.VEHICLE_RECALLS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Vehicle recall ID');

    table
      .uuid(FIELDS.LOOKUP_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.VEHICLE_RECALL_LOOKUPS}`)
      .onDelete('CASCADE')
      .comment('Reference to the lookup that fetched this recall');

    table
      .string(FIELDS.SOURCE, 8)
      .notNullable()
      .comment('Recall data source: NHTSA (US) or TC (Canada)');

    table
      .string(FIELDS.CAMPAIGN_NUMBER, 32)
      .notNullable()
      .comment('Unique campaign/recall number from the source (e.g. NHTSA campaign number or TC recall number)');

    table
      .string(FIELDS.MANUFACTURER, 128)
      .nullable()
      .comment('Manufacturer name as reported by the source');

    table
      .string(FIELDS.COMPONENT, 256)
      .nullable()
      .comment('Affected component (NHTSA: e.g. SUSPENSION:REAR) or system type (TC)');

    table
      .string(FIELDS.SYSTEM_TYPE, 128)
      .nullable()
      .comment('System type affected (primarily used by Transport Canada)');

    table
      .text(FIELDS.SUMMARY)
      .nullable()
      .comment('Recall summary / description of the defect');

    table
      .text(FIELDS.CONSEQUENCE)
      .nullable()
      .comment('Potential consequences of the defect (NHTSA)');

    table
      .text(FIELDS.REMEDY)
      .nullable()
      .comment('Remedy / corrective action description');

    table
      .text(FIELDS.NOTES)
      .nullable()
      .comment('Additional notes from the source');

    table
      .date(FIELDS.REPORT_RECEIVED_DATE)
      .nullable()
      .comment('Date the recall report was received by the authority');

    table
      .boolean(FIELDS.PARK_IT)
      .notNullable()
      .defaultTo(false)
      .comment('NHTSA: Vehicle should not be driven until repaired (Do Not Drive)');

    table
      .boolean(FIELDS.PARK_OUTSIDE)
      .notNullable()
      .defaultTo(false)
      .comment('NHTSA: Vehicle should be parked away from structures (fire/explosion risk)');

    table
      .boolean(FIELDS.OTA_UPDATE)
      .notNullable()
      .defaultTo(false)
      .comment('NHTSA: Recall can be resolved via over-the-air software update');

    // Standard audit fields (no user info since this is system-managed data)
    // status: 100 = Active (valid recall record), 10000 = Removed
    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Unique constraint: one record per campaign number per source
    table.unique(
      [FIELDS.CAMPAIGN_NUMBER, FIELDS.SOURCE],
      { indexName: 'uq_vehicle_recalls_campaign_source' }
    );

    // Indexes
    table.index([FIELDS.LOOKUP_ID]);
    table.index([FIELDS.SOURCE]);
    table.index([FIELDS.REPORT_RECEIVED_DATE]);
    table.index([FIELDS.PARK_IT]);

    table.comment(
      'Shared catalog of vehicle safety recalls from NHTSA (US) and Transport Canada. Not tied to any account — one row per recall campaign globally. Linked to user vehicles via vehicle_recall_statuses.'
    );
  });
};

export const down = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.VEHICLE_RECALLS);
};