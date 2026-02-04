// ./src/logger.ts
import { Logger } from '@sdflc/utils';
import config from './config';

const logger = new Logger({
  level: config.logLevel,
});

export { logger };
