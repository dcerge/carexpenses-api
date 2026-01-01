import express from 'express';
import { logger } from './logger';
import config from './config';

import configureApp from './app';

const run = async () => {
  const app = express();

  configureApp(app);

  app.listen(config.port, async () => {
    logger.log(`Server started on port ${config.port}`);
  });
};

run();
