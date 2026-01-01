// ./src/database/migrations/20251216000000_080_service_interval_defaults.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.SERVICE_INTERVAL_DEFAULTS, (table) => {
    table.integer(FIELDS.ID).primary().comment('Service interval default ID');

    table
      .integer(FIELDS.KIND_ID)
      .notNullable()
      .unique()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.EXPENSE_KINDS}`)
      .onDelete('RESTRICT')
      .comment('Reference to expense_kinds');

    table
      .integer(FIELDS.INTERVAL_TYPE)
      .notNullable()
      .comment('Interval type: 1=Mileage only, 2=Days only, 3=Mileage or Days, 4=Mileage and Days');

    table
      .decimal(FIELDS.MILEAGE_INTERVAL, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Mileage interval for service reminder');

    table.integer(FIELDS.DAYS_INTERVAL).notNullable().defaultTo(0).comment('Days interval for service reminder');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.comment('Default service intervals for each expense kind');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.SERVICE_INTERVAL_DEFAULTS);
