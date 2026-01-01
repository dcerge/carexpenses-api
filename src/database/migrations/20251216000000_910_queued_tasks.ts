// ./src/database/migrations/20251216000000_910_queued_tasks.ts
import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.QUEUED_TASKS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Queued task ID');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    table
      .integer(FIELDS.TASK_TYPE)
      .notNullable()
      .comment('Task type: 1=Recalculate summaries, 2=Export data, 3=Import data');

    table
      .integer(FIELDS.TASK_STATUS)
      .notNullable()
      .defaultTo(1)
      .comment('Task status: 1=Pending, 2=Processing, 3=Completed, 4=Failed');

    table.text(FIELDS.TASK_INFO).nullable().comment('JSON with task parameters and results');

    table.datetime(FIELDS.CREATED_AT).notNullable().defaultTo(knex.fn.now()).comment('When the task was created');

    table.datetime(FIELDS.UPDATED_AT).notNullable().defaultTo(knex.fn.now()).comment('When the task was last updated');

    // Indexes
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.UPDATED_AT]);
    table.index([FIELDS.USER_ID, FIELDS.TASK_TYPE, FIELDS.TASK_STATUS]);

    table.comment('Background task queue for long-running operations');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.QUEUED_TASKS);
