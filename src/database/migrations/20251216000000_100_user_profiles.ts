// ./src/database/migrations/20251216000000_100_user_profiles.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.USER_PROFILES, (table) => {
    table.uuid(FIELDS.ID).primary().comment('User ID - references ms_auth user');

    table.uuid(FIELDS.ACCOUNT_ID).comment('Account ID - references ms_auth account');

    table
      .string(FIELDS.HOME_CURRENCY, 3)
      .notNullable()
      .defaultTo('USD')
      .comment('User preferred currency (ISO 4217 code)');

    table.string(FIELDS.DISTANCE_IN, 8).notNullable().defaultTo('km').comment('Distance unit preference (km, mi)');

    table
      .string(FIELDS.VOLUME_IN, 8)
      .notNullable()
      .defaultTo('l')
      .comment('Volume unit preference (l, gal-us, gal-uk)');

    table
      .string(FIELDS.CONSUMPTION_IN, 8)
      .notNullable()
      .defaultTo('l100km')
      .comment('Fuel consumption unit preference (l100km, km-l, mpg-us, mpg-uk, mi-l)');

    table
      .decimal(FIELDS.NOTIFY_IN_MILEAGE, 19, 4)
      .notNullable()
      .defaultTo(500)
      .comment('Mileage threshold for service reminders');

    table.integer(FIELDS.NOTIFY_IN_DAYS).notNullable().defaultTo(14).comment('Days threshold for service reminders');

    table.comment('User preferences and settings for the carexpenses app');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.USER_PROFILES);
