import yargs, { exit } from 'yargs';
import { createContext } from '../../context';

import { HEADERS, dbReset } from '@sdflc/backend-helpers';

import config from '../../config';
import knexHandle from 'knexConfig';
import { logger } from 'logger';

const resetFromCLI = () => {
  dbReset(knexHandle, config).then(() => knexHandle.destroy());
};

const getContext = () =>
  createContext({
    res: {},
    req: {
      connection: {
        remoteAddress: 'LOCAL',
      },
      headers: {
        [HEADERS.SPACE_ID]: 'develop',
        [HEADERS.API_KEY]: 'APIKEY1!',
        [HEADERS.ACCOUNT_ID]: 'test-account',
        [HEADERS.USER_ID]: 'test-user',
      },
    },
    headers: {},
  });

const recalculateStats = async () => {
  const context = await getContext();

  try {
    logger.log('Recalculating all vehicles stats...');
    await context.cores.expenseCore.recalculateAll({});

    logger.log('Recalculating upcoming services...');
    await context.cores.serviceIntervalNextCore.recalculateAll({});

    logger.log('Recalculation complete.');
  } finally {
    process.exit(0);
  }
};

yargs(process.argv.splice(2))
  .command(
    'reset',
    'Resets Database',
    (yargs) => {
      return yargs;
    },
    resetFromCLI,
  )
  .command(
    'recalculate',
    'Does recalculation of all the stats and upcoming service interals',
    (yargs) => {
      return yargs;
    },
    recalculateStats,
  )
  .strict()
  .help('h')
  .parse();
