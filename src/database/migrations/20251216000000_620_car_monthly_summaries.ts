// ./src/database/migrations/20251216000000_620_car_monthly_summaries.ts
import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_MONTHLY_SUMMARIES, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Car monthly summary ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.string(FIELDS.HOME_CURRENCY, 3).notNullable().comment('Home currency for this summary (ISO 4217)');

    table.integer(FIELDS.YEAR).notNullable().comment('Year of the summary');

    table.integer(FIELDS.MONTH).notNullable().comment('Month of the summary (1-12)');

    table.decimal(FIELDS.START_MILEAGE, 19, 4).notNullable().defaultTo(0).comment('Mileage at start of month');

    table.decimal(FIELDS.END_MILEAGE, 19, 4).notNullable().defaultTo(0).comment('Mileage at end of month');

    table.integer(FIELDS.REFUELS_COUNT).notNullable().defaultTo(0).comment('Number of refuels in this month');

    table.integer(FIELDS.EXPENSES_COUNT).notNullable().defaultTo(0).comment('Number of expenses in this month');

    table.decimal(FIELDS.REFUELS_TAXES, 19, 4).nullable().comment('Total refuel taxes in home currency');
    table.decimal(FIELDS.REFUELS_COST, 19, 4).nullable().comment('Total refuel cost in home currency');

    table.decimal(FIELDS.EXPENSES_FEES, 19, 4).nullable().comment('Total expenses fees in home currency');
    table.decimal(FIELDS.EXPENSES_TAXES, 19, 4).nullable().comment('Total expenses taxes in home currency');
    table.decimal(FIELDS.EXPENSES_COST, 19, 4).nullable().comment('Total expenses cost in home currency');

    table
      .decimal(FIELDS.REFUELS_VOLUME, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Total fuel volume purchased in this month');

    table.datetime(FIELDS.FIRST_RECORD_AT).nullable().comment('Date/time of first record in this month');

    table.datetime(FIELDS.LAST_RECORD_AT).nullable().comment('Date/time of last record in this month');

    table.datetime(FIELDS.UPDATED_AT).nullable().comment('When this summary was last updated');

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY]);

    // Unique constraint: one summary per car/currency/year/month
    table.unique([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY, FIELDS.YEAR, FIELDS.MONTH]);

    table.comment('Monthly aggregated summaries for each car by currency');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_MONTHLY_SUMMARIES);
