// ./src/database/migrations/20251216000000_210_user_cars.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.USER_CARS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('User-car relationship ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.integer(FIELDS.ROLE_ID).notNullable().defaultTo(1).comment('User role: 1=Owner, 2=Editor, 3=Viewer');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.CAR_ID]);

    table.unique([FIELDS.ACCOUNT_ID, FIELDS.USER_ID, FIELDS.CAR_ID]);

    table.comment('Junction table linking users to cars with role-based access');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.USER_CARS);
