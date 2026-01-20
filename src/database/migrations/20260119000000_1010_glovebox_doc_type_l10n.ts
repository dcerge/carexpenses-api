// ./src/database/migrations/20260119000000_1001_glovebox_doc_type_l10n.ts
import { Knex } from 'knex';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.GLOVEBOX_DOC_TYPE_L10N, (table) => {
    table
      .string(FIELDS.ID, 128)
      .primary()
      .notNullable()
      .comment('Composite ID: doc_type_id-lang (e.g., 1-en, 1-ru)');

    table
      .integer(FIELDS.DOC_TYPE_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.GLOVEBOX_DOC_TYPES}`)
      .onDelete('RESTRICT')
      .comment('Reference to glovebox_doc_types');

    table
      .string(FIELDS.LANG, 8)
      .notNullable()
      .comment('ISO 639-1 language code (e.g., en, ru, fr, es)');

    table
      .string(FIELDS.NAME, 64)
      .notNullable()
      .comment('Localized document type name');

    table
      .string(FIELDS.DESCRIPTION, 256)
      .nullable()
      .comment('Localized document type description');

    table
      .string(FIELDS.DOCUMENT_NUMBER_LABEL, 64)
      .nullable()
      .comment('Localized label for document number field (e.g., Policy Number, License Number)');

    table.index([FIELDS.DOC_TYPE_ID]);
    table.index([FIELDS.LANG]);

    table.comment('Localization table for glovebox document type names and labels');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.GLOVEBOX_DOC_TYPE_L10N);