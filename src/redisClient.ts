// ./src/redisClient.ts
import { createRedisClient } from '@sdflc/backend-helpers';
import config from './config';
import { logger } from './logger';

const redisClient = config.redisHost
  ? createRedisClient({
    redisHost: config.redisHost,
    redisPort: config.redisPort,
    redisPassword: config.redisPassword,
    redisSsl: config.redisSsl,
    retryAttempts: 10,
    firstTimeout: 100,
    pingInterval: 5000,
    connectionTimeout: 5000,
    onConnecting: () => {
      logger.log('Redis connecting');
    },
    onConnected: () => {
      logger.log('Redis connected');
    },
    onDisconnected: () => {
      logger.log('Redis disconnected');
    },
    onReconnecting: () => {
      logger.log('Redis reconnecting');
    },
    onError: (err: any) => {
      logger.log('Redis error:', err);
    },
  })
  : null;

export { redisClient };
