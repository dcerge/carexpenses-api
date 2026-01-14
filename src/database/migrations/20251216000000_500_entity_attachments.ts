// ./src/database/migrations/20251216000000_500_entity_attachments.ts
import { Knex } from 'knex';
import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

import config from '../../config';
import { dbNewId, FIELDS, TABLES, STATUS } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.ENTITY_ATTACHMENTS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Entity attachment ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.string(FIELDS.DESCRIPTION, 64).notNullable().defaultTo('').comment('Attachment description');

    table.integer(FIELDS.ATTACHMENT_TYPE).notNullable().comment('Type of attachment (image, document, etc.)');

    table
      .string(FIELDS.ATTACHMENT_PATH, 256)
      .notNullable()
      .comment('File path or URL to attachment - reference to a file to relocate');

    table.bigInteger(FIELDS.ATTACHMENT_SIZE).notNullable().defaultTo(0).comment('File size in bytes');

    table
      .integer(FIELDS.ACCESS_LEVEL)
      .notNullable()
      .defaultTo(1)
      .comment('Access level: 1=Private, 2=Shared, 3=Public');

    table.integer(FIELDS.FOR_ENTITY_TYPE_ID).notNullable().comment('Entity type: 1=Car, 2=Expense, 3=Refuel, 4=Travel');

    table.string(FIELDS.COORDINATES, 64).nullable().comment('GPS coordinates where attachment was created');

    table.uuid(FIELDS.UPLOADED_FILE_ID).nullable().comment('Reference to ms_storage uploaded file');

    dbFieldAddDefaults(table, {
      addUserInfo: true,
      addStatus: true,
      addVersion: false,
      skipRemovedAtStr: true,
    });

    table.bigInteger('car_orig_id').comment('Reference to original car ID as integer => cars.orig_id');
    table.uuid('account_id').comment('Reference user account');

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.CAR_ID]);

    table.comment('File attachments for cars, expenses, refuels, and travels');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.ENTITY_ATTACHMENTS);
