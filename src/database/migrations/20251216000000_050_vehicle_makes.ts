// ./src/database/migrations/20251216000000_050_vehicle_makes.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.VEHICLE_MAKES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Vehicle make ID');

    table.string(FIELDS.MAKE_NAME, 128).notNullable().unique().comment('Vehicle make name (e.g., Toyota, Honda, BMW)');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.comment('Lookup table for vehicle manufacturers/makes');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.VEHICLE_MAKES);
