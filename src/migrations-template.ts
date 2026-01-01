// import { dbFieldAddDefaults } from '@sdflc/backend-helpers';

// import config from 'config';
// import { FIELDS } from 'database/helpers';

// const { dbSchema } = config;

// exports.up = (knex) =>
//   knex.schema.withSchema(dbSchema).createTable('new_table', (table: any) => {
//     table.uuid(FIELDS.id).primary().defaultTo(knex.raw('NEWSEQUENTIALID()'));

//     table.uuid('account_id').notNullable();
//     table.foreign('account_id').references('account.id').onUpdate('CASCADE').onDelete('CASCADE');

//     table.text('username');
//     table.text('password');
//     table.text('first_name');
//     table.text('last_name');

//     dbFieldAddDefaults(table, { addUserInfo: false });

//     table.unique(['username', 'removed_at_str']);

//     table.comment('Users');
//   });

// exports.down = (knex) => knex.schema.withSchema(dbSchema).dropTable('usnew_tableer');
