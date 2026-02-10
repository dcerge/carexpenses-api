// ./src/index.ts
import express from 'express';
import { logger } from './logger';
import config from './config';
import { telegramNotifier } from './telegram';

import configureApp from './app';

const shutdownSignals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

const run = async () => {
  const app = express();

  const httpServer = await configureApp(app);

  // --- Process error handlers ---

  process.on('uncaughtException', async (error: Error) => {
    logger.error('Uncaught Exception:', error);
    await telegramNotifier.sendCrash(error);
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Rejection:', error);
    await telegramNotifier.sendCrash(error);
    process.exit(1);
  });

  for (const signal of shutdownSignals) {
    process.on(signal, async () => {
      logger.log(`${signal} received, shutting down gracefully...`);
      await telegramNotifier.sendStopped(signal);
      process.exit(0);
    });
  }

  // --- Start server ---

  app.listen(config.port, async () => {
    await telegramNotifier.sendStarted();
    logger.log(`Server started on port ${config.port}`);
  });
};

run();