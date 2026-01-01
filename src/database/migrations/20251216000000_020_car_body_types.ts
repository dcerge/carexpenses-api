// ./src/database/migrations/20251216000000_020_car_body_types.ts
import { Knex } from 'knex';
import { addOrderNoNum, dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_BODY_TYPES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Body type ID');

    addOrderNoNum(table);

    table.string(FIELDS.CODE, 64).notNullable().comment('Body type code (e.g., SEDAN, SUV, HATCHBACK)');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.comment('Lookup table for car body types (sedan, SUV, hatchback, etc.)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_BODY_TYPES);
