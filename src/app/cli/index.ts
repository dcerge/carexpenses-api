import yargs from 'yargs';
import { createContext } from '../../context';

import { HEADERS, dbReset } from '@sdflc/backend-helpers';

import config from '../../config';
import knexHandle from 'knexConfig';

import { loadTest } from '../../utils/simpleLoadTester';

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

const runloadTest = async () => {
  const context = await getContext();

  await loadTest({ mode: 'burst', requestsPerSecond: 20, totalRequests: 10000 });
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
    'load-test',
    'Do simple load testing by making multiple form submissions a second',
    (yargs) => {
      return yargs;
    },
    runloadTest,
  )
  .strict()
  .help('h')
  .parse();
