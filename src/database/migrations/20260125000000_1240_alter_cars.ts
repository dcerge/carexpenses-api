// ./src/database/migrations/20260125000000_1240_alter_cars.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CARS, (table) => {
    // Drive type
    table
      .string(FIELDS.DRIVE_TYPE, 8)
      .nullable()
      .comment('Drive type: fwd, rwd, awd, 4wd, 4x4');

    // License plate
    table
      .string(FIELDS.LICENSE_PLATE, 32)
      .nullable()
      .comment('Vehicle license plate number');

    // Main tank fields (replacing type_of_fuel and tank_volume)
    table
      .string(FIELDS.MAIN_TANK_FUEL_TYPE, 16)
      .nullable()
      .comment('Main tank fuel type: gasoline, diesel, electric, lpg, cng, hydrogen, e85, biodiesel, etc.');

    table
      .decimal(FIELDS.MAIN_TANK_VOLUME, 10, 2)
      .nullable()
      .comment(`Main tank volume in liters (or kWh for electric vehicles). If ${FIELDS.MAIN_TANK_VOLUME_ENTERED_IN} is in 'gal-us' then it was converted to liters and needs to be converted back to 'gal-us' when returning data to UI`);

    table
      .string(FIELDS.MAIN_TANK_VOLUME_ENTERED_IN, 8)
      .nullable()
      .comment('Unit the main tank volume was entered in: l, gal-us, gal-uk, kwh');

    table
      .string(FIELDS.MAIN_TANK_DEFAULT_GRADE, 16)
      .nullable()
      .comment('Default fuel grade for main tank: regular, midgrade, premium, diesel, etc.');

    // Additional tank fields (replacing additional_tank_volume)
    table
      .string(FIELDS.ADDL_TANK_FUEL_TYPE, 16)
      .nullable()
      .comment('Additional tank fuel type: gasoline, diesel, electric, lpg, cng, hydrogen, e85, biodiesel, etc.');

    table
      .decimal(FIELDS.ADDL_TANK_VOLUME, 10, 2)
      .nullable()
      .comment(`Additional tank volume in liters (or kWh for electric vehicles). If ${FIELDS.MAIN_TANK_VOLUME_ENTERED_IN} is in 'gal - us' then it was converted to liters and needs to be converted back to 'gal - us' when returning data to UI`);

    table
      .string(FIELDS.ADDL_TANK_VOLUME_ENTERED_IN, 8)
      .nullable()
      .comment('Unit the additional tank volume was entered in: l, gal-us, gal-uk, kwh');

    table
      .string(FIELDS.ADDL_TANK_DEFAULT_GRADE, 16)
      .nullable()
      .comment('Default fuel grade for additional tank: regular, midgrade, premium, diesel, etc.');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.CARS, (table) => {
    table.dropColumn(FIELDS.DRIVE_TYPE);
    table.dropColumn(FIELDS.LICENSE_PLATE);
    table.dropColumn(FIELDS.MAIN_TANK_FUEL_TYPE);
    table.dropColumn(FIELDS.MAIN_TANK_VOLUME);
    table.dropColumn(FIELDS.MAIN_TANK_VOLUME_ENTERED_IN);
    table.dropColumn(FIELDS.MAIN_TANK_DEFAULT_GRADE);
    table.dropColumn(FIELDS.ADDL_TANK_FUEL_TYPE);
    table.dropColumn(FIELDS.ADDL_TANK_VOLUME);
    table.dropColumn(FIELDS.ADDL_TANK_VOLUME_ENTERED_IN);
    table.dropColumn(FIELDS.ADDL_TANK_DEFAULT_GRADE);
  });