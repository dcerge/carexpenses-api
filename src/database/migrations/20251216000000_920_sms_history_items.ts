// ./src/database/migrations/20251216000000_920_sms_history_items.ts
import { Knex } from 'knex';

import config from '../../config';
import { dbNewId, FIELDS, TABLES } from '../helpers';

const { dbSchema } = config;

export const up = (knex: Knex) =>
  knex.schema.withSchema(dbSchema).createTable(TABLES.SMS_HISTORY_ITEMS, (table) => {
    table.uuid(FIELDS.ID).primary().defaultTo(knex.raw(dbNewId)).comment('SMS history item ID');

    table.bigInteger(FIELDS.ORIG_ID).nullable().comment('Original integer ID from legacy database');

    table.string(FIELDS.SID, 38).nullable().comment('External SMS service ID (e.g., Twilio SID)');

    table.datetime(FIELDS.CREATED_AT).notNullable().comment('When the message was sent/received');

    table.integer(FIELDS.DIRECTION).notNullable().comment('Direction: 1=Inbound, 2=Outbound');

    table.string(FIELDS.FROM_NUMBER, 64).nullable().comment('Sender phone number');

    table.string(FIELDS.TO_NUMBER, 64).nullable().comment('Recipient phone number');

    table.string(FIELDS.BODY, 256).nullable().comment('SMS message body');

    table.text(FIELDS.METADATA).nullable().comment('JSON with additional metadata from SMS service');

    // Indexes
    table.index([FIELDS.ORIG_ID]);
    table.index([FIELDS.CREATED_AT]);

    table.comment('SMS message history for refuel/expense logging via text');
  });

export const down = (knex: Knex) => knex.schema.withSchema(dbSchema).dropTableIfExists(TABLES.SMS_HISTORY_ITEMS);
