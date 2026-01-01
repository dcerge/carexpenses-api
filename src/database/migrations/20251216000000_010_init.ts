// ./src/database/migrations/20251216000000_010_init.ts
import config from '../../config';

const { dbSchema } = config;

// for PostgreSQL
exports.up = (knex) => {
  if (config.dbType == 'pg') {
    return knex.schema.withSchema(dbSchema).raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;');
  }
};

exports.down = (knex) => {
  if (config.dbType == 'pg') {
    return knex.schema.withSchema(dbSchema).raw('DROP EXTENSION IF NOT EXISTS "uuid-ossp";');
  }
};
