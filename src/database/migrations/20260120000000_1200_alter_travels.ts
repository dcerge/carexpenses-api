import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

exports.up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.TRAVELS, (table) => {
    table.string(FIELDS.ODOMETER_IN, 8).notNullable().defaultTo('km').comment('Odometer entered in: km, mi');

    table.decimal(FIELDS.DISTANCE, 19, 4).nullable().comment('Distance of the trip - calculated based on first and last odometer or just entered manually for cases when odomoter reading is not used');
    table.string(FIELDS.DISTANCE_IN, 8).nullable().defaultTo('km').comment('Distance entered in: km, mi');
    table.decimal(FIELDS.DISTANCE_KM, 19, 4).nullable().comment('Distance of the trip - calculated based on first and last odometer or just entered manually for cases when odomoter reading is not used');
  });

exports.down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CAR_MONTHLY_SUMMARIES, (table) => {
    table.dropColumn(FIELDS.ODOMETER_IN);
    table.dropColumn(FIELDS.DISTANCE);
    table.dropColumn(FIELDS.DISTANCE_IN);
    table.dropColumn(FIELDS.DISTANCE_KM);
  });