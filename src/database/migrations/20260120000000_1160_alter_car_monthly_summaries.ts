import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

exports.up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CAR_MONTHLY_SUMMARIES, (table) => {
    // -------------------------------------------------------------------------
    // Revenue tracking
    // -------------------------------------------------------------------------
    table.integer(FIELDS.REVENUES_COUNT).notNullable().defaultTo(0).comment('Number of revenues in this month');

    table.decimal(FIELDS.REVENUES_AMOUNT, 19, 4).nullable().comment('Total revenue amount in home currency');

    // -------------------------------------------------------------------------
    // Maintenance tracking (expenses where is_it_maintenance = true)
    // -------------------------------------------------------------------------
    table
      .integer(FIELDS.MAINTENANCE_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Number of maintenance expense records in this month');

    table
      .decimal(FIELDS.MAINTENANCE_COST, 19, 4)
      .nullable()
      .comment('Total cost of maintenance expenses in home currency');

    // -------------------------------------------------------------------------
    // Consumption tracking
    // -------------------------------------------------------------------------
    table
      .decimal(FIELDS.CONSUMPTION_VOLUME, 20, 10)
      .notNullable()
      .defaultTo(0)
      .comment('Fuel volume for consumption calc (excludes first refuel if in this month)');

    table
      .boolean(FIELDS.IS_FIRST_REFUEL_MONTH)
      .notNullable()
      .defaultTo(false)
      .comment('True if this month contains the first refuel for the car');

    // -------------------------------------------------------------------------
    // Checkpoint tracking
    // -------------------------------------------------------------------------
    table
      .integer(FIELDS.CHECKPOINTS_COUNT)
      .notNullable()
      .defaultTo(0)
      .comment('Number of checkpoint records in this month');

    // -------------------------------------------------------------------------
    // Travel tracking
    // -------------------------------------------------------------------------
    table.integer(FIELDS.TRAVELS_COUNT).notNullable().defaultTo(0).comment('Number of travel records in this month');

    table
      .decimal(FIELDS.TRAVELS_DISTANCE, 19, 4)
      .notNullable()
      .defaultTo(0)
      .comment('Total distance from completed travels in this month');
  });

exports.down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CAR_MONTHLY_SUMMARIES, (table) => {
    // Revenue tracking
    table.dropColumn(FIELDS.REVENUES_COUNT);
    table.dropColumn(FIELDS.REVENUES_AMOUNT);

    // Maintenance tracking
    table.dropColumn(FIELDS.MAINTENANCE_COUNT);
    table.dropColumn(FIELDS.MAINTENANCE_COST);

    // Consumption tracking
    table.dropColumn(FIELDS.CONSUMPTION_VOLUME);
    table.dropColumn(FIELDS.IS_FIRST_REFUEL_MONTH);

    // Checkpoint tracking
    table.dropColumn(FIELDS.CHECKPOINTS_COUNT);

    // Travel tracking
    table.dropColumn(FIELDS.TRAVELS_COUNT);
    table.dropColumn(FIELDS.TRAVELS_DISTANCE);
  });