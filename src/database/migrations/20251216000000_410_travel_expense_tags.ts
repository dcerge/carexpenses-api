// ./src/database/migrations/20251216000000_410_travel_expense_tags.ts
import { Knex } from 'knex';
import { addOrderNoNum } from '@sdflc/backend-helpers';

import config from '../../config';
import { FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.TRAVEL_EXPENSE_TAGS, (table) => {
    table.uuid(FIELDS.TRAVEL_ID).notNullable().comment('Reference to travels');

    table.uuid(FIELDS.EXPENSE_TAG_ID).notNullable().comment('Reference to expense_tags');

    addOrderNoNum(table);

    table.primary([FIELDS.TRAVEL_ID, FIELDS.EXPENSE_TAG_ID]);

    table.index([FIELDS.TRAVEL_ID]);
    table.index([FIELDS.EXPENSE_TAG_ID]);

    table.comment('Junction table linking travels to tags (many-to-many)');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.TRAVEL_EXPENSE_TAGS);
