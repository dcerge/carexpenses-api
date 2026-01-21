import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

exports.up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_TOTAL_REVENUES, (table) => {
    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.string(FIELDS.HOME_CURRENCY, 3).notNullable().comment('Home currency for this summary (ISO 4217)');

    table.integer(FIELDS.REVENUE_KIND_ID).notNullable().comment('Reference to revenue_kinds');

    table.integer(FIELDS.RECORDS_COUNT).notNullable().defaultTo(0).comment('Number of revenue records of this kind');

    table.decimal(FIELDS.AMOUNT, 19, 4).nullable().comment('Total amount received for this revenue kind in home currency');

    table.primary([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY, FIELDS.REVENUE_KIND_ID]);

    table.index([FIELDS.CAR_ID, FIELDS.HOME_CURRENCY]);

    table.comment('Aggregated revenue totals by kind for each car by currency');
  });

exports.down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_TOTAL_REVENUES);