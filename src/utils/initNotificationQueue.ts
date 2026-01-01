// ./src/utils/initNotificationQueue.ts
import { NotificationQueue } from './NotificationQueue';
import { processPostSubmissionTask } from './postSubmissionTaskProcessor';

/**
 * Initialize the notification queue with the task processor.
 * Call this once during application startup.
 *
 * @param options - Optional configuration
 * @param options.maxConcurrent - Maximum concurrent tasks (default: 5)
 */
export const initNotificationQueue = (options?: { maxConcurrent?: number }): void => {
  // Configure queue settings
  if (options?.maxConcurrent) {
    NotificationQueue.configure({
      maxConcurrent: options.maxConcurrent,
    });
  }

  // Set the task processor
  NotificationQueue.setTaskProcessor(processPostSubmissionTask);

  console.log('NotificationQueue initialized and ready');
};
