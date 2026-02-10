import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = async (knex: Knex) => {
  await knex.schema.withSchema(dbSchema).createTable(TABLES.TIRE_BRANDS, (table) => {
    table.increments(FIELDS.ID).primary().comment('Tire brand ID');

    table.string(FIELDS.NAME, 128).notNullable().comment('Brand name (e.g., Michelin, Continental)');

    table.string(FIELDS.WEBSITE, 256).nullable().comment('Brand website URL for tire registration');

    dbFieldAddDefaults(table, {
      addUserInfo: false,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.comment(
      'Lookup table for tire brand names with website URLs for registration. ' +
      'Used for autocomplete when users add tire sets.'
    );
  });
};

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.TIRE_BRANDS);