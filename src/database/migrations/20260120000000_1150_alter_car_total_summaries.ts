import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

exports.up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CAR_TOTAL_SUMMARIES, (table) => {
    // -------------------------------------------------------------------------
    // Revenue tracking
    // -------------------------------------------------------------------------
    table.integer(FIELDS.TOTAL_REVENUES_COUNT).notNullable().defaultTo(0).comment('Total number of revenue records');

    table.decimal(FIELDS.TOTAL_REVENUES_AMOUNT, 19, 4).nullable().comment('Total revenue amount in home currency');

    table.uuid(FIELDS.LATEST_REVENUE_ID).nullable().comment('Reference to latest revenue record');

    // -------------------------------------------------------------------------
    // Maintenance tracking (expenses where is_it_maintenance = true)
    // -------------------------------------------------------------------------
    table
      .integer(FIELDS.TOTAL_MAINTENANCE_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Total number of maintenance expense records');

    table
      .decimal(FIELDS.TOTAL_MAINTENANCE_COST, 19, 4)
      .nullable()
      .comment('Total cost of maintenance expenses in home currency');

    // -------------------------------------------------------------------------
    // First refuel tracking (for consumption calculation)
    // -------------------------------------------------------------------------
    table.uuid(FIELDS.FIRST_REFUEL_ID).nullable().comment('Reference to first refuel record (for consumption calc)');

    table
      .decimal(FIELDS.FIRST_REFUEL_ODOMETER, 19, 4)
      .nullable()
      .comment('Odometer reading at first refuel (consumption distance baseline)');

    table
      .decimal(FIELDS.FIRST_REFUEL_VOLUME, 20, 10)
      .nullable()
      .comment('Volume of first refuel (excluded from consumption calculation)');

    // -------------------------------------------------------------------------
    // Consumption metrics (excluding first refuel)
    // -------------------------------------------------------------------------
    table
      .decimal(FIELDS.CONSUMPTION_VOLUME, 20, 10)
      .notNullable()
      .defaultTo(0)
      .comment('Total fuel volume excluding first refuel (for consumption calc)');

    table
      .decimal(FIELDS.CONSUMPTION_DISTANCE, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Distance from first refuel to latest mileage (for consumption calc)');

    // -------------------------------------------------------------------------
    // Checkpoint tracking
    // -------------------------------------------------------------------------
    table
      .integer(FIELDS.TOTAL_CHECKPOINTS_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Total number of checkpoint records');

    // -------------------------------------------------------------------------
    // Travel tracking
    // -------------------------------------------------------------------------
    table.integer(FIELDS.TOTAL_TRAVELS_COUNT).notNullable().defaultTo(0).comment('Total number of travel records');

    table
      .decimal(FIELDS.TOTAL_TRAVELS_DISTANCE, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Total distance from completed travels');
  });

exports.down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CAR_TOTAL_SUMMARIES, (table) => {
    // Revenue tracking
    table.dropColumn(FIELDS.TOTAL_REVENUES_COUNT);
    table.dropColumn(FIELDS.TOTAL_REVENUES_AMOUNT);
    table.dropColumn(FIELDS.LATEST_REVENUE_ID);

    // Maintenance tracking
    table.dropColumn(FIELDS.TOTAL_MAINTENANCE_COUNT);
    table.dropColumn(FIELDS.TOTAL_MAINTENANCE_COST);

    // First refuel tracking
    table.dropColumn(FIELDS.FIRST_REFUEL_ID);
    table.dropColumn(FIELDS.FIRST_REFUEL_ODOMETER);
    table.dropColumn(FIELDS.FIRST_REFUEL_VOLUME);

    // Consumption metrics
    table.dropColumn(FIELDS.CONSUMPTION_VOLUME);
    table.dropColumn(FIELDS.CONSUMPTION_DISTANCE);

    // Checkpoint tracking
    table.dropColumn(FIELDS.TOTAL_CHECKPOINTS_COUNT);

    // Travel tracking
    table.dropColumn(FIELDS.TOTAL_TRAVELS_COUNT);
    table.dropColumn(FIELDS.TOTAL_TRAVELS_DISTANCE);
  });