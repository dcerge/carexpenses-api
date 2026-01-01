const { dbRunMigrations } = require('@sdflc/backend-helpers');

const config = require('./src/config');
const knexHandle = require('./src/knexHandle');

const runMigrations = () => {
  return dbRunMigrations(knexHandle, config);
};

module.exports = runMigrations;
