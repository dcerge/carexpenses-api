// ./src/database/migrations/20251216000000_710_service_interval_nexts.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.SERVICE_INTERVAL_NEXTS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Service interval next ID');

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
      .comment('Mileage interval used for calculation');

    table.integer(FIELDS.DAYS_INTERVAL).notNullable().defaultTo(0).comment('Days interval used for calculation');

    table.datetime(FIELDS.MAX_WHEN_DONE).notNullable().comment('Date of last service of this kind');

    table.decimal(FIELDS.MAX_ODOMETER, 19, 4).nullable().comment('Odometer reading at last service of this kind');

    table.datetime(FIELDS.NEXT_WHEN_DO).nullable().comment('Calculated next service date');

    table.decimal(FIELDS.NEXT_ODOMETER, 19, 4).nullable().comment('Calculated next service mileage');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CAR_ID]);

    // Unique constraint: one next interval per car/kind combination
    table.unique([FIELDS.CAR_ID, FIELDS.KIND_ID]);

    table.comment('Calculated next service dates/mileages for each car and service kind');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.SERVICE_INTERVAL_NEXTS);
