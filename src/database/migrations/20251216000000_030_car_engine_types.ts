// ./src/database/migrations/20251216000000_030_car_engine_types.ts
import { Knex } from 'knex';
import { addOrderNoNum, dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_ENGINE_TYPES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Engine type ID');

    addOrderNoNum(table);

    table.string(FIELDS.CODE, 64).notNullable().comment('Engine type code (e.g., GASOLINE, DIESEL, ELECTRIC, HYBRID)');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.comment('Lookup table for car engine types (gasoline, diesel, electric, hybrid, etc.)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_ENGINE_TYPES);
