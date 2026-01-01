// ./src/database/migrations/20251216000000_021_car_body_type_l10n.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_BODY_TYPE_L10N, (table) => {
    table.string(FIELDS.ID, 128).primary().notNullable();

    table.integer(FIELDS.CAR_BODY_TYPE_ID).notNullable().comment(`Reference to ${TABLES.CAR_BODY_TYPES}`);
    table.string(FIELDS.LANG, 8).notNullable().comment('ISO 639-1 language code (e.g., en, uk, es)');

    table.string(FIELDS.NAME, 128).notNullable().comment('Localized body type name');

    table.primary([FIELDS.CAR_BODY_TYPE_ID, FIELDS.LANGUAGE_CODE]);

    table.comment('Localization table for car body type names');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_BODY_TYPE_L10N);
