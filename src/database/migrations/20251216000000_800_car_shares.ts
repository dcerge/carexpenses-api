// ./src/database/migrations/20251216000000_800_car_shares.ts
import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.CAR_SHARES, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('Car share ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.uuid(FIELDS.CAR_ID).notNullable().comment('Reference to cars');

    table.bigInteger(FIELDS.WHAT_TO_SHARE).notNullable().defaultTo(0).comment('Bitmask defining what data to share');

    table.datetime(FIELDS.CREATED_AT).notNullable().comment('When the share invitation was sent');

    table.uuid(FIELDS.FROM_USER_ID).notNullable().comment('User ID of the sender - references ms_auth user');

    table.uuid(FIELDS.TO_USER_ID).notNullable().comment('User ID of the recipient - references ms_auth user');

    table.string(FIELDS.FROM_USER_NAME, 64).nullable().comment('Display name of the sender');

    table.string(FIELDS.TO_USER_NAME, 64).nullable().comment('Display name of the recipient');

    table
      .integer(FIELDS.SHARE_ROLE_ID)
      .notNullable()
      .defaultTo(3)
      .comment('Role to grant: 1=Owner, 2=Editor, 3=Viewer');

    table
      .integer(FIELDS.SHARE_STATUS)
      .notNullable()
      .defaultTo(1)
      .comment('Share status: 1=Pending, 2=Accepted, 3=Rejected, 4=Cancelled');

    table.datetime(FIELDS.STATUS_DATE).notNullable().comment('When the status was last changed');

    table.string(FIELDS.COMMENTS, 512).nullable().comment('Optional message with the share invitation');

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CAR_ID]);
    table.index([FIELDS.FROM_USER_ID]);
    table.index([FIELDS.TO_USER_ID]);
    table.index([FIELDS.CREATED_AT]);

    table.comment('Car sharing invitations between users');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.CAR_SHARES);
