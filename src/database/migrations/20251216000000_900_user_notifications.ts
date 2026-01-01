// ./src/database/migrations/20251216000000_900_user_notifications.ts
import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.USER_NOTIFICATIONS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('User notification ID');

    table.uuid(FIELDS.ACCOUNT_ID).notNullable().comment('Account ID - references ms_auth account');

    table.uuid(FIELDS.USER_ID).notNullable().comment('User ID - references ms_auth user');

    table.uuid(FIELDS.CAR_ID).nullable().comment('Reference to cars (if notification is car-related)');

    table.bigInteger(FIELDS.ENTITY_ORIG_ID).nullable().comment('Original reference to entity ID from legacy database');

    table.uuid(FIELDS.ENTITY_ID).nullable().comment('Reference to related entity (expense, refuel, travel, etc.)');

    table.uuid(FIELDS.ENTITY_UID).nullable().comment('UID of related entity for external reference');

    table.datetime(FIELDS.CREATED_AT).notNullable().comment('When the notification was created');

    table.datetime(FIELDS.READ_AT).nullable().comment('When the notification was read by the user');

    table
      .integer(FIELDS.NOTIFICATION_TYPE)
      .notNullable()
      .comment('Notification type: 1=Car shared, 2=Transfer request, 3=Service reminder, etc.');

    table.string(FIELDS.MESSAGE, 512).nullable().comment('Notification message text');

    table.string(FIELDS.SENDER, 64).nullable().comment('Sender identifier or name');

    table.string(FIELDS.ACTION_INFO, 64).nullable().comment('Action info for deep linking or navigation');

    // Indexes
    table.index([FIELDS.ENTITY_ORIG_ID]);
    table.index([FIELDS.USER_ID]);
    table.index([FIELDS.CREATED_AT]);

    table.comment('User notifications for shares, transfers, service reminders, etc.');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.USER_NOTIFICATIONS);
