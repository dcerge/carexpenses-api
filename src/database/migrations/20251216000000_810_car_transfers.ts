// ./src/database/migrations/20251216000000_810_car_transfers.ts
import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_TRANSFERS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Car transfer ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars (original car)');

    table
      .bigInteger(FIELDS.WHAT_TO_TRANSFER)
      .notNullable()
      .defaultTo(0)
      .comment('Bitmask defining what data to transfer');

    table.datetime(FIELDS.WHEN_SENT).notNullable().comment('When the transfer request was sent');

    table.uuid(FIELDS.FROM_USER_ID).notNullable().comment('User ID of the sender - references ms_auth user');

    table.uuid(FIELDS.TO_USER_ID).notNullable().comment('User ID of the recipient - references ms_auth user');

    table
      .integer(FIELDS.TRANSFER_STATUS)
      .notNullable()
      .defaultTo(1)
      .comment('Transfer status: 1=Pending, 2=Accepted, 3=Rejected, 4=Cancelled');

    table.datetime(FIELDS.STATUS_DATE).notNullable().comment('When the status was last changed');

    table.string(FIELDS.COMMENTS, 512).nullable().comment('Optional message with the transfer request');

    table
      .uuid(FIELDS.NEW_CAR_ID)
      .nullable()
      .comment('Reference to new car record created for recipient after transfer');

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.FROM_USER_ID]);
    table.index([FIELDS.TO_USER_ID]);
    table.index([FIELDS.WHEN_SENT]);

    table.comment('Car ownership transfer requests between users');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_TRANSFERS);
