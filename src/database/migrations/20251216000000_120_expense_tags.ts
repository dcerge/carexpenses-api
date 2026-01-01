// ./src/database/migrations/20251216000000_120_expense_tags.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_TAGS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Expense tag ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.string(FIELDS.TAG_NAME, 64).notNullable().comment('Tag name');

    table
      .string(FIELDS.NORMALIZED_NAME, 64)
      .notNullable()
      .comment('Lowercased tag name for case-insensitive uniqueness');

    table.string(FIELDS.TAG_COLOR, 16).nullable().comment('Tag color (hex or color name)');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: true,
      skipRemovedAtStr: false,
    });

    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.ACCOUNT_ID]);

    // Unique constraint: normalized_name must be unique per account (with soft delete support)
    table.unique([FIELDS.ACCOUNT_ID, FIELDS.NORMALIZED_NAME, FIELDS.REMOVED_AT_STR]);

    table.comment('User-defined tags for categorizing expenses and travels');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_TAGS);
