// ./src/database/migrations/20251216000000_031_car_engine_type_l10n.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_ENGINE_TYPE_L10N, (table) => {
    table.string(FIELDS.ID, 128).primary().notNullable();

    table.integer(FIELDS.CAR_ENGINE_TYPE_ID).notNullable().comment(`Reference to ${TABLES.CAR_ENGINE_TYPES}`);
    table.string(FIELDS.LANG, 8).notNullable().comment('ISO 639-1 language code (e.g., en, uk, es)');

    table.string(FIELDS.NAME, 64).notNullable().comment('Localized engine type name');

    table.primary([FIELDS.CAR_ENGINE_TYPE_ID, FIELDS.LANGUAGE_CODE]);

    table.comment('Localization table for car engine type names');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_ENGINE_TYPE_L10N);
