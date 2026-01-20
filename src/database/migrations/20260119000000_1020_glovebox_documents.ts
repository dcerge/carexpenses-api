// ./src/database/migrations/20260119000000_1002_glovebox_documents.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.GLOVEBOX_DOCUMENTS, (table) => {
    table
      .uuid(FIELDS.ID)
      .primary()
      .defaultTo(knex.raw(dbNewId))
      .comment('Glovebox document ID');

    table
      .bigInteger(FIELDS.ORIG_ID)
      .nullable()
      .comment('Original integer ID from legacy database');

    table
      .uuid(FIELDS.ACCOUNT_ID)
      .notNullable()
      .comment('Account ID - references ms_auth account');

    // Ownership: document can belong to a vehicle, a user (driver), or both
    table
      .uuid(FIELDS.CAR_ID)
      .nullable()
      .comment('Reference to cars table - for vehicle documents');

    table
      .uuid(FIELDS.USER_ID)
      .nullable()
      .comment('Reference to ms_auth user - for driver documents (license, permits)');

    // Document type
    table
      .integer(FIELDS.DOC_TYPE_ID)
      .notNullable()
      .comment('Reference to glovebox_doc_types');

    table
      .string(FIELDS.CUSTOM_TYPE_NAME, 128)
      .nullable()
      .comment('User-defined document type name (required when doc_type is "custom")');

    // Core document fields (shown based on doc_type flags)
    table
      .string(FIELDS.DOCUMENT_NUMBER, 64)
      .nullable()
      .comment('Document/policy/license number');

    table
      .date(FIELDS.ISSUED_AT)
      .nullable()
      .comment('Date when document was issued');

    table
      .date(FIELDS.EFFECTIVE_AT)
      .nullable()
      .comment('Date when document becomes effective/valid');

    table
      .date(FIELDS.EXPIRES_AT)
      .nullable()
      .comment('Document expiration date');

    table
      .string(FIELDS.ISSUING_AUTHORITY, 128)
      .nullable()
      .comment('Issuing authority/organization (DMV, insurance company, etc.)');

    // Financial fields
    table
      .decimal(FIELDS.COST, 19, 4)
      .nullable()
      .comment('Cost/fee/premium paid for the document');

    table
      .string(FIELDS.COST_CURRENCY, 3)
      .nullable()
      .comment('Currency of cost (ISO 4217 code)');

    table
      .decimal(FIELDS.COVERAGE_AMOUNT, 19, 4)
      .nullable()
      .comment('Coverage amount (for insurance documents)');

    table
      .string(FIELDS.COVERAGE_CURRENCY, 3)
      .nullable()
      .comment('Currency of coverage amount (ISO 4217 code)');

    // Reminder settings
    table
      .integer(FIELDS.REMIND_BEFORE_DAYS)
      .nullable()
      .comment('Days before expiration to send reminder notification (null = no reminder)');

    // Additional info
    table
      .text(FIELDS.NOTES)
      .nullable()
      .comment('Additional notes about the document');

    table
      .uuid(FIELDS.UPLOADED_FILE_ID)
      .nullable()
      .comment('Reference to ms_storage uploaded file');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: false,
    });

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.ACCOUNT_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.DOC_TYPE_ID]);
    table.index([FIELDS.EXPIRES_AT]);

    table.comment('User glovebox documents (insurance, registration, licenses, etc.) with expiration tracking');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.GLOVEBOX_DOCUMENTS);