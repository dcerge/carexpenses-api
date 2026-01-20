// ./src/database/migrations/20260119000000_1000_glovebox_doc_types.ts
import { Knex } from 'knex';
import { addOrderNoNum } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.GLOVEBOX_DOC_TYPES, (table) => {
    table.integer(FIELDS.ID).primary().comment('Document type ID');

    table
      .string(FIELDS.CODE, 32)
      .notNullable()
      .unique()
      .comment('Document type code (e.g., REGISTRATION, INSURANCE_POLICY, DRIVERS_LICENSE)');

    table
      .string(FIELDS.CATEGORY, 32)
      .notNullable()
      .comment('Document category: vehicle, driver, other');

    addOrderNoNum(table);

    // Field visibility flags
    table
      .boolean(FIELDS.HAS_DOCUMENT_NUMBER)
      .notNullable()
      .defaultTo(true)
      .comment('Whether this document type has a document/policy/license number');

    table
      .boolean(FIELDS.HAS_ISSUE_DATE)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has an issue date');

    table
      .boolean(FIELDS.HAS_EFFECTIVE_DATE)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has an effective/valid-from date');

    table
      .boolean(FIELDS.HAS_EXPIRATION)
      .notNullable()
      .defaultTo(true)
      .comment('Whether this document type can expire');

    table
      .boolean(FIELDS.HAS_ISSUING_AUTHORITY)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has an issuing authority/organization');

    table
      .boolean(FIELDS.HAS_COST)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has an associated cost/fee/premium');

    table
      .boolean(FIELDS.HAS_COVERAGE_AMOUNT)
      .notNullable()
      .defaultTo(false)
      .comment('Whether this document type has a coverage amount (insurance-specific)');

    table
      .string(FIELDS.DOCUMENT_NUMBER_LABEL_KEY, 64)
      .nullable()
      .comment('Translation key override for document number field label');

    table
      .integer(FIELDS.STATUS)
      .notNullable()
      .defaultTo(STATUS.ACTIVE)
      .comment('Record status: 100=Active, 200=Inactive, 300=Deleted');

    table.index([FIELDS.CATEGORY]);
    table.index([FIELDS.STATUS]);

    table.comment('Lookup table for glovebox document types (registration, insurance, license, etc.)');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.GLOVEBOX_DOC_TYPES);