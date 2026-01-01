import { createContextDefault, Database } from '@sdflc/backend-helpers';
import { STATUSES } from '@sdflc/utils';

import config from './config';
import * as cores from './core';
import * as gateways from './gateways';
import knexConfig from './knexConfig';
import { redisClient } from './redisClient';
import { logger } from './logger';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// const database = new Database({
//   dbType: config.dbType,
//   dbSchema: config.dbSchema,
//   knexConfig,
//   logger,
// });

/**
 * Creates a GraphQL context object with all avilable cores.
 * @returns {object} A context object with all available cores
 */
export const createContext = async (args: any) => {
  return await createContextDefault({
    //db: database,
    req: args.req,
    dbSchema: config.dbSchema,
    cores,
    gateways,
    knexConfig,
    isProduction: config.isProduction,
    logger,
    doAuth: true,
    interserviceApiKey: config.interserviceApiKey,
    jwtSecret: config.jwtSecret,
    verifyTokenArgs: {
      algorithms: undefined,
      audience: undefined,
      issuer: undefined,
      ignoreExpiration: false,
      ignoreNotBefore: false,
      subject: undefined,
      clockTolerance: undefined,
      maxAge: undefined,
      clockTimestamp: undefined,
      nonce: undefined,
    },
    getGatewayContext: () => {
      return {
        redisClient,
        cacheTtl: config.cacheTtl,
        activeStatuses: [STATUSES.ACTIVE],
      };
    },
    extendContext: ({ context }) => {
      context.nowUtc = dayjs().utc().toDate();
      context.space = {
        cookieName: config.cookieName,
        fingerprintCookieName: config.fingerprintCookieName,
      };

      //context.gateways.signalRGw.setConnectionString(config.signalrConnectionString);
      //context.accountId = '00000000-0000-0000-0000-000000000001';
    },
  });
};
