// ./src/database/migrations/20251216000000_510_entity_entity_attachments.ts
import { Knex } from 'knex';
import { addOrderNoNum } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.ENTITY_ENTITY_ATTACHMENTS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Entity-entity attachment ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.integer(FIELDS.ENTITY_TYPE_ID).notNullable().comment('Entity type: 1=Car, 2=Expense, 3=Refuel, 4=Travel');

    table.uuid(FIELDS.ENTITY_ID).notNullable().comment('Reference to the entity (car, expense, refuel, or travel)');

    table.uuid(FIELDS.ENTITY_ATTACHMENT_ID).notNullable().comment('Reference to entity_attachments');

    table.uuid(FIELDS.UPLOADED_FILE_ID).nullable().comment('Reference to ms_storage uploaded file');

    addOrderNoNum(table);

    table
      .bigInteger('entity_orig_id')
      .comment("Reference to entity's original id: cars.orig_id, expense_bases.orig_id, etc");
    table.bigInteger('entity_attachment_orig_id').comment('Reference to entity_attachment.orig_id');
    table
      .integer('process_status')
      .comment(
        'when is null then the record was not yet processed to move files. if it is 1 then success, if 2 then error',
      );

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.ENTITY_ID]);
    table.index([FIELDS.ENTITY_ATTACHMENT_ID]);
    table.index([FIELDS.ENTITY_TYPE_ID, FIELDS.ENTITY_ID]);

    table.comment('Junction table linking entities to their attachments (polymorphic many-to-many)');
  });

export const down = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.ENTITY_ENTITY_ATTACHMENTS);
