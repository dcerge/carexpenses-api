// ./src/database/migrations/20260119000000_1003_glovebox_document_files.ts
import { Knex } from 'knex';
import { addOrderNoNum } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.GLOVEBOX_DOCUMENT_FILES, (table) => {
    table
      .uuid(FIELDS.ID)
      .primary()
      .defaultTo(knex.raw(dbNewId))
      .comment('Glovebox document file ID');

    table
      .uuid(FIELDS.GLOVEBOX_DOCUMENT_ID)
      .notNullable()
      .references(FIELDS.ID)
      .inTable(`${dbSchema}.${TABLES.GLOVEBOX_DOCUMENTS}`)
      .onDelete('CASCADE')
      .comment('Reference to glovebox_documents');

    addOrderNoNum(table);

    table
      .uuid(FIELDS.UPLOADED_FILE_ID)
      .notNullable()
      .comment('Reference to ms_storage uploaded file');


    // Indexes
    table.index([FIELDS.GLOVEBOX_DOCUMENT_ID]);
    table.index([FIELDS.UPLOADED_FILE_ID]);

    table.comment('Junction table linking glovebox documents to their file attachments (scans, PDFs, images)');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.GLOVEBOX_DOCUMENT_FILES);