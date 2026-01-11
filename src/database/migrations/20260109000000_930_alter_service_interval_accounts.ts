import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

exports.up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.SERVICE_INTERVAL_ACCOUNTS, (table) => {
    table
      .decimal(FIELDS.MILEAGE_INTERVAL_KM, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Mileage interval in kilometers (metric) for calculations');

    table
      .string(FIELDS.DISTANCE_ENTERED_IN, 8)
      .notNullable()
      .defaultTo('km')
      .comment('Distance unit used when value was entered (km, mi)');
  });

exports.down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.SERVICE_INTERVAL_ACCOUNTS, (table) => {
    table.dropColumn(FIELDS.MILEAGE_INTERVAL_KM);
    table.dropColumn(FIELDS.DISTANCE_ENTERED_IN);
  });
