// ./src/utils/postSubmissionTaskProcessor.ts

import { logger } from '../logger';
import { createContext } from '../context';
import { QueueTask } from './NotificationQueue';

/**
 * Process a post-submission task by creating a fresh database context and executing
 * the complete post-submission flow with submissionProcessingCore
 * @param task - The queued task to process
 */
export const processPostSubmissionTask = async (task: QueueTask): Promise<void> => {
  const { data, name } = task;
  const { requestId, form, filesCnt } = data;

  logger.log(`Processing post-submission task ${name} for submission ${requestId}`);

  // Create a mock request object for context creation
  const mockReq = {
    headers: {},
    cookies: {},
    connection: {
      remoteAddress: 'background-task',
    },
  };

  // Create fresh context with new database connection
  // Note: We do NOT call context.db.destroy() here because the Database class
  // uses a shared knex connection pool (singleton pattern via knexHandles).
  // Destroying it would break all other requests using the same pool.
  // The connection is automatically returned to the pool when the query completes.
  const context = await createContext({ req: mockReq });

  await context.cores.submisstionPostProcessingCore.postProcess({
    data,
    name,
  });
};
