// ./src/database/migrations/20251216000000_600_car_total_summaries.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_TOTAL_SUMMARIES, (table) => {
    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.string(FIELDS.HOME_CURRENCY, 3).notNullable().comment('Home currency for this summary (ISO 4217)');

    table
      .decimal(FIELDS.LATEST_KNOWN_MILEAGE, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Latest known mileage for the car');

    table.uuid(FIELDS.LATEST_REFUEL_ID).nullable().comment('Reference to latest refuel record');

    table.uuid(FIELDS.LATEST_EXPENSE_ID).nullable().comment('Reference to latest expense record');

    table.uuid(FIELDS.LATEST_TRAVEL_ID).nullable().comment('Reference to latest travel record');

    table.integer(FIELDS.TOTAL_REFUELS_COUNT).notNullable().defaultTo(0).comment('Total number of refuel records');

    table.integer(FIELDS.TOTAL_EXPENSES_COUNT).notNullable().defaultTo(0).comment('Total number of expense records');

    table.decimal(FIELDS.REFUELS_TAXES, 19, 4).nullable().comment('Total refuel taxes in home currency');
    table.decimal(FIELDS.TOTAL_REFUELS_COST, 19, 4).nullable().comment('Total cost of all refuels in home currency');

    table.decimal(FIELDS.EXPENSES_FEES, 19, 4).nullable().comment('Total expenses fees in home currency');
    table.decimal(FIELDS.EXPENSES_TAXES, 19, 4).nullable().comment('Total expenses taxes in home currency');
    table.decimal(FIELDS.TOTAL_EXPENSES_COST, 19, 4).nullable().comment('Total cost of all expenses in home currency');

    table
      .decimal(FIELDS.TOTAL_REFUELS_VOLUME, 20, 10)
      .notNullable()
      .defaultTo(0)
      .comment('Total volume of fuel purchased');

    table.datetime(FIELDS.FIRST_RECORD_AT).nullable().comment('Date/time of first expense/refuel record');

    table.datetime(FIELDS.LAST_RECORD_AT).nullable().comment('Date/time of last expense/refuel record');

    table.datetime(FIELDS.UPDATED_AT).nullable().comment('When this summary was last updated');

    table.primary([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY]);

    table.comment('Aggregated totals for each car by currency');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_TOTAL_SUMMARIES);
