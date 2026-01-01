// ./src/database/migrations/20251216000000_040_car_transmission_types.ts
import { Knex } from 'knex';
import { addOrderNoNum, dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_TRANSMISSION_TYPES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Transmission type ID');

    addOrderNoNum(table);

    table.string(FIELDS.CODE, 64).notNullable().comment('Transmission type code (e.g., MANUAL, AUTOMATIC, CVT)');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.comment('Lookup table for car transmission types (manual, automatic, CVT, etc.)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_TRANSMISSION_TYPES);
