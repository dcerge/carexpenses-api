import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import cookieParser from 'cookie-parser';
import http from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginUsageReportingDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';

import { expressMiddleware } from '@as-integrations/express5';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { HEADERS } from '@sdflc/backend-helpers';

import typeDefs from './app/graphql/types';
import resolvers from './app/graphql/resolvers';

import { createContext } from './context';

import config from './config';

import * as controllers from './app/restapi';
import { redisClient } from './redisClient';

import packageJson from '../package.json';
import { initNotificationQueue, cleanupOrphanedTempFiles, NotificationQueue } from './utils';
// import { logger } from './logger';
// import knexConfig from './knexConfig';

const corsOptions = {
  origin: (origin, callback) => {
    // on allowed:
    callback(null, true);
    // on forbidden:
    // callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  // Wait for queue to finish processing (max 30 seconds)
  await NotificationQueue.shutdown(30000);

  // Close server, database connections, etc.
  process.exit(0);
});

const configureApp = async (app) => {
  //logger.log('Knex Config:', knexConfig);

  cleanupOrphanedTempFiles();

  initNotificationQueue({ maxConcurrent: 5 });

  app.disable('x-powered-by');

  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: config.maxReqBodySize }));
  app.use(express.urlencoded({ limit: config.maxReqBodySize, extended: true }));
  app.use(cookieParser());
  app.use(cors(corsOptions));

  app.get('/', (req, res) => {
    // This is app health-check entry point
    res.json(
      new OpResult({
        data: {
          version: packageJson.version || 'N/A',
          name: packageJson.name || 'N/A',
          utcDateTime: dayjs().toISOString(),
          utcOffsetMin: dayjs().utcOffset(),
          remoteIp: req.headers[HEADERS.IP_ADDRESS] || req.connection.remoteAddress,
        },
      }).toJS(),
    );
  });

  app.use(async (req, res, next) => {
    if (req.path !== '/graphql') {
      req.context = await createContext({ req });
    }
    next();
  });

  // REST API
  // Set entry point API handlers
  Object.keys(controllers).forEach((key) => {
    const controller = new controllers[key]();
    controller.init({ app });
  });

  // GRAPHQL API
  // Create HTTP server
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs, resolvers: resolvers as any }]),
    introspection: !config.isProduction,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginUsageReportingDisabled(),
      ApolloServerPluginInlineTraceDisabled(),
      // {
      //   async requestDidStart(requestContext) {
      //     /* Within this returned object, define functions that respond
      //         to request-specific lifecycle events. */
      //     return {
      //       async willSendResponse(requestContext) {
      //         if (requestContext.contextValue.db) {
      //           requestContext.contextValue.db.destroy();
      //         }
      //       },
      //     };
      //   },
      // },
    ],
  });

  if (redisClient) {
    await redisClient.connect();
  }

  await apolloServer.start();

  // Apply Apollo middleware
  app.use(
    config.graphqlUrl,
    cors(corsOptions),
    express.json(),
    expressMiddleware(apolloServer, {
      context: createContext,
    }),
  );

  // OLD VERSION
  // TODO: How to set request size in new Apollo GraphQL?
  // apolloServer.applyMiddleware({
  //   app,
  //   path: config.graphqlUrl,
  //   cors: corsOptions,
  //   bodyParserConfig: {
  //     limit: config.maxReqBodySize,
  //   },
  // });

  app.use((req, res) => {
    // This is app's not found handler
    res
      .status(404)
      .json(
        new OpResult()
          .addError('', `This API Entry point is not supported: '${req.originalUrl}'`, OP_RESULT_CODES.EXCEPTION)
          .toJS(),
      );
  });

  app.use((err, req, res, next) => {
    console.log('An error has occured when processing the request:', err);

    // This is the app's error handler which returns OpResult object to the client
    if (err instanceof OpResult) {
      res.status(500).json(err.toJS());
    } else if (typeof err === 'string') {
      res.status(500).json(new OpResult().addError('', err, OP_RESULT_CODES.FAILED).toJS());
    } else if (err instanceof Error) {
      res.status(500).json(new OpResult().addError('', err.message, OP_RESULT_CODES.FAILED).toJS());
    } else {
      res
        .status(500)
        .json(
          new OpResult()
            .setData(err)
            .addError('', 'An error has occurred when processing this request', OP_RESULT_CODES.FAILED)
            .toJS(),
        );
    }
  });

  return httpServer;
};

export default configureApp;
