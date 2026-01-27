// ./src/database/migrations/20260126000000_1250_alter_refuels.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.REFUELS, (table) => {
    // Which tank was refueled
    table
      .string(FIELDS.TANK_TYPE, 8)
      .notNullable()
      .defaultTo('main')
      .comment('Which tank was refueled: main, addl');

    // Index for filtering by tank type
    table.index([FIELDS.TANK_TYPE]);
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.REFUELS, (table) => {
    table.dropIndex([FIELDS.TANK_TYPE]);
    table.dropColumn(FIELDS.TANK_TYPE);
  });