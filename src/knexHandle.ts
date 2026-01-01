import knex from 'knex';
import knexConfig from './knexConfig';

export default knex({
  ...knexConfig,
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    //propagateCreateError: false,
  },
  acquireConnectionTimeout: 30000,
});
