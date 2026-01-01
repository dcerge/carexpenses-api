// ./src/database/migrations/20251216000000_400_expense_expense_tags.ts
import { Knex } from 'knex';
import { addOrderNoNum } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.EXPENSE_EXPENSE_TAGS, (table) => {
    table.uuid(FIELDS.EXPENSE_ID).notNullable().comment('Reference to expense_bases');

    table.uuid(FIELDS.EXPENSE_TAG_ID).notNullable().comment('Reference to expense_tags');

    addOrderNoNum(table);

    table.primary([FIELDS.EXPENSE_ID, FIELDS.EXPENSE_TAG_ID]);

    table.index([FIELDS.EXPENSE_ID]);
    table.index([FIELDS.EXPENSE_TAG_ID]);

    table.comment('Junction table linking expenses to tags (many-to-many)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.EXPENSE_EXPENSE_TAGS);
