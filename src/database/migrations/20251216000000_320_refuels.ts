// ./src/database/migrations/20251216000000_320_refuels.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.REFUELS, (table) => {
    table.uuid(FIELDS.ID).primary().comment('Refuel ID - should match expense_bases ID');

    table.decimal(FIELDS.REFUEL_VOLUME, 19, 4).notNullable().defaultTo(0).comment('Volume of fuel added');

    table.string(FIELDS.VOLUME_ENTERED_IN, 8).notNullable().defaultTo('l').comment('Volume unit (l, gal)');

    table.decimal(FIELDS.PRICE_PER_VOLUME, 19, 4).nullable().comment('Price per unit volume');

    table.boolean(FIELDS.IS_FULL_TANK).notNullable().defaultTo(false).comment('Whether tank was filled completely');

    table.decimal(FIELDS.REMAINING_IN_TANK_BEFORE, 19, 4).nullable().comment('Estimated fuel remaining before refuel');

    table.string(FIELDS.FUEL_GRADE, 16).nullable().comment('Fuel grade/type (e.g., Regular, Premium, Diesel)');

    table.comment('Refuel-specific details (extends expense_bases)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.REFUELS);
