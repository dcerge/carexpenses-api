// ./src/app/cli/index.ts
import yargs, { exit } from 'yargs';
import { createContext } from '../../context';

import { HEADERS, dbReset } from '@sdflc/backend-helpers';

import config from '../../config';
import knexHandle from '../../knexConfig';
import { logger } from '../../logger';
import { redisClient } from '../../redisClient';

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

const runExpenseSchedules = async () => {
  const context = await getContext();

  try {
    logger.log('Running expense schedules...');
    await context.cores.expenseScheduleCore.processScheduledExpenses({
      batchSize: 100,
      maxSchedules: 10000,
    });

    logger.log('Recalculation complete.');
  } finally {
    process.exit(0);
  }
};

const transferFiles = async () => {
  const context = await getContext();

  try {
    if (redisClient) {
      await redisClient.connect();
    }

    logger.log('Transferring files starts now...');
    await context.cores.dataTransferCore.transferFiles({});

    logger.log('Transferring files complete.');
  } finally {
    process.exit(0);
  }
};

const transferCarImages = async () => {
  const context = await getContext();

  try {
    if (redisClient) {
      await redisClient.connect();
    }

    logger.log('Transferring car images starts now...');
    await context.cores.dataTransferCore.transferCarImages({});

    logger.log('Transferring car images complete.');
  } finally {
    process.exit(0);
  }
};

const fetchVehicleRecalls = async () => {
  const context = await getContext();

  try {
    if (redisClient) {
      await redisClient.connect();
    }

    logger.log('Ensuring recall lookups exist for all vehicles...');
    const ensureResult = await context.cores.vehicleRecallCore.ensureLookups({});
    logger.log('Ensure lookups result:', ensureResult?.data);

    logger.log('Fetching stale vehicle recalls from external APIs...');
    const fetchResult = await context.cores.vehicleRecallCore.fetchStaleRecalls({});
    logger.log('Fetch recalls result:', fetchResult?.data);

    logger.log('Vehicle recalls fetch complete.');
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
  .command(
    'runschedules',
    'Runs expense schedules',
    (yargs) => {
      return yargs;
    },
    runExpenseSchedules,
  )
  .command(
    'transfer-files',
    'Transfers entity attachment files from old storage to new storate',
    (yargs) => {
      return yargs;
    },
    transferFiles,
  )
  .command(
    'transfer-car-images',
    'Transfers cars images from old storage to new storate',
    (yargs) => {
      return yargs;
    },
    transferCarImages,
  )
  .command(
    'fetch-recalls',
    'Fetches vehicle safety recalls from NHTSA and Transport Canada for all vehicles',
    (yargs) => {
      return yargs;
    },
    fetchVehicleRecalls,
  )
  .strict()
  .help('h')
  .parse();
