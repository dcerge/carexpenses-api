import { buildKnexConfig } from '@sdflc/backend-helpers';

import config from './config';
import { logger } from './logger';

const knexConfig = buildKnexConfig(__dirname, {
  ...config,
  migrationsFolder: 'database/migrations',
  seedsFolder: 'database/seeds',
  migrationsTemplateFileName: 'migrations-template.ts',
  useSchemaForMigrationsTable: true,
});

knexConfig.connection.connectionTimeout = 30000;
knexConfig.connection.port = Number(knexConfig.connection.port);

if (config.dbType === 'mssql') {
  knexConfig.connection.options = {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
  };
} else if (config.dbType === 'pg') {
  knexConfig.searchPath = [config.dbSchema, 'public'];
}

knexConfig.pool = 40;

export default knexConfig;
