// ./src/database/migrations/20251216000000_700_service_interval_accounts.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.SERVICE_INTERVAL_ACCOUNTS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Service interval account ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.integer(FIELDS.KIND_ID).notNullable().comment('Reference to expense_kinds');

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
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CAR_ID]);

    // Unique constraint: one interval per car/kind combination
    table.unique([FIELDS.CAR_ID, FIELDS.KIND_ID]);

    table.comment('User-customized service intervals per car (overrides defaults)');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.SERVICE_INTERVAL_ACCOUNTS);
