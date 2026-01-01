import { dbSeed } from '@sdflc/backend-helpers';

import config from '../../config';
import knexHandle from '../../knexHandle';

import { filesToSeed } from './filesToSeed.json';

const seedFiles = filesToSeed;

const seed = () => {
  return dbSeed(__dirname, seedFiles, knexHandle, config);
};

export { seed };
