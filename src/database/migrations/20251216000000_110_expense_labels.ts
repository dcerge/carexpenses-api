// ./src/database/migrations/20251216000000_110_expense_labels.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_LABELS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Expense label ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.string(FIELDS.LABEL_NAME, 64).notNullable().comment('Label name');

    table
      .string(FIELDS.NORMALIZED_NAME, 64)
      .notNullable()
      .comment('Lowercased label name for case-insensitive uniqueness');

    table.string(FIELDS.LABEL_COLOR, 16).nullable().comment('Label color (hex or color name)');

    table
      .datetime(FIELDS.LAST_TIME_USED)
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('Last time this label was used');

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

    table.comment('User-defined labels for categorizing expenses');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_LABELS);
