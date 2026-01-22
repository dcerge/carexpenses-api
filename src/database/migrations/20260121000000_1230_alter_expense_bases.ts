import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSE_BASES, (table) => {
    // Address fields
    table
      .string(FIELDS.ADDRESS_1, 128)
      .nullable()
      .comment('Street address');
    table
      .string(FIELDS.ADDRESS_2, 128)
      .nullable()
      .comment('PO Box, Apartment, Suite, etc.');
    table
      .string(FIELDS.CITY, 128)
      .nullable()
      .comment('City');
    table
      .string(FIELDS.POSTAL_CODE, 16)
      .nullable()
      .comment('Postal Code/Zip');
    table
      .string(FIELDS.STATE_PROVINCE, 128)
      .nullable()
      .comment('State or Province');
    table
      .string(FIELDS.COUNTRY, 128)
      .nullable()
      .comment('Country full name');
    table
      .string(FIELDS.COUNTRY_ID, 4)
      .nullable()
      .comment('Country code: US, CA, FR, RU, etc');

    // Coordinates
    table
      .decimal(FIELDS.LONGITUDE, 12, 7)
      .nullable()
      .comment('Location longitude');
    table
      .decimal(FIELDS.LATITUDE, 12, 7)
      .nullable()
      .comment('Location latitude');

    // Weather - temperature
    table
      .decimal(FIELDS.WEATHER_TEMP_C, 5, 2)
      .nullable()
      .comment('Temperature in Celsius');
    table
      .decimal(FIELDS.WEATHER_FEELS_LIKE_C, 5, 2)
      .nullable()
      .comment('Feels like temperature (wind chill/heat index) in Celsius');

    // Weather - conditions
    table
      .string(FIELDS.WEATHER_CONDITION_CODE, 32)
      .nullable()
      .comment('Weather condition code: clear, rain, snow, etc.');
    table
      .string(FIELDS.WEATHER_CONDITION_ICON, 16)
      .nullable()
      .comment('Weather provider icon code for UI display');
    table
      .string(FIELDS.WEATHER_DESCRIPTION, 128)
      .nullable()
      .comment('Human-readable weather description');

    // Weather - atmospheric
    table
      .smallint(FIELDS.WEATHER_HUMIDITY_PCT)
      .nullable()
      .comment('Humidity percentage 0-100');
    table
      .smallint(FIELDS.WEATHER_PRESSURE_HPA)
      .nullable()
      .comment('Atmospheric pressure in hectopascals');
    table
      .smallint(FIELDS.WEATHER_CLOUD_PCT)
      .nullable()
      .comment('Cloud cover percentage 0-100');
    table
      .integer(FIELDS.WEATHER_VISIBILITY_M)
      .nullable()
      .comment('Visibility in meters');

    // Weather - wind
    table
      .decimal(FIELDS.WEATHER_WIND_SPEED_MPS, 5, 2)
      .nullable()
      .comment('Wind speed in meters per second');
    table
      .smallint(FIELDS.WEATHER_WIND_DIR_DEG)
      .nullable()
      .comment('Wind direction in degrees 0-359');

    // Weather - precipitation & UV
    table
      .decimal(FIELDS.WEATHER_PRECIP_MM, 6, 2)
      .nullable()
      .comment('Precipitation in mm (last hour)');
    table
      .decimal(FIELDS.WEATHER_UV_INDEX, 4, 1)
      .nullable()
      .comment('UV index');

    // Weather - metadata
    table
      .string(FIELDS.WEATHER_PROVIDER, 32)
      .nullable()
      .comment('Weather data provider: openweathermap, weatherapi, etc.');
    table
      .datetime(FIELDS.WEATHER_FETCHED_AT)
      .nullable()
      .comment('When weather data was retrieved from provider');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).alterTable(TABLES.EXPENSE_BASES, (table) => {
    // Weather metadata
    table.dropColumn(FIELDS.WEATHER_FETCHED_AT);
    table.dropColumn(FIELDS.WEATHER_PROVIDER);

    // Weather - precipitation & UV
    table.dropColumn(FIELDS.WEATHER_UV_INDEX);
    table.dropColumn(FIELDS.WEATHER_PRECIP_MM);

    // Weather - wind
    table.dropColumn(FIELDS.WEATHER_WIND_DIR_DEG);
    table.dropColumn(FIELDS.WEATHER_WIND_SPEED_MPS);

    // Weather - atmospheric
    table.dropColumn(FIELDS.WEATHER_VISIBILITY_M);
    table.dropColumn(FIELDS.WEATHER_CLOUD_PCT);
    table.dropColumn(FIELDS.WEATHER_PRESSURE_HPA);
    table.dropColumn(FIELDS.WEATHER_HUMIDITY_PCT);

    // Weather - conditions
    table.dropColumn(FIELDS.WEATHER_DESCRIPTION);
    table.dropColumn(FIELDS.WEATHER_CONDITION_ICON);
    table.dropColumn(FIELDS.WEATHER_CONDITION_CODE);

    // Weather - temperature
    table.dropColumn(FIELDS.WEATHER_FEELS_LIKE_C);
    table.dropColumn(FIELDS.WEATHER_TEMP_C);

    // Coordinates
    table.dropColumn(FIELDS.LATITUDE);
    table.dropColumn(FIELDS.LONGITUDE);

    // Address
    table.dropColumn(FIELDS.COUNTRY_ID);
    table.dropColumn(FIELDS.COUNTRY);
    table.dropColumn(FIELDS.STATE_PROVINCE);
    table.dropColumn(FIELDS.POSTAL_CODE);
    table.dropColumn(FIELDS.CITY);
    table.dropColumn(FIELDS.ADDRESS_2);
    table.dropColumn(FIELDS.ADDRESS_1);
  });