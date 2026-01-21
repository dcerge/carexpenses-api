import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

exports.up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_MONTHLY_REVENUES, (table) => {
    table.uuid(FIELDS.CAR_MONTHLY_SUMMARY_ID).notNullable().comment('Reference to car_monthly_summaries');

    table.integer(FIELDS.REVENUE_KIND_ID).notNullable().comment('Reference to revenue_kinds');

    table
      .integer(FIELDS.RECORDS_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Number of revenue records of this kind in this month');

    table.decimal(FIELDS.AMOUNT, 19, 4).nullable().comment('Total amount received for this revenue kind in home currency');

    table.primary([FIELDS.CAR_MONTHLY_SUMMARY_ID, FIELDS.REVENUE_KIND_ID]);

    table.index([FIELDS.CAR_MONTHLY_SUMMARY_ID]);

    table.comment('Monthly revenue totals by kind linked to car_monthly_summaries');
  });

exports.down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_MONTHLY_REVENUES);