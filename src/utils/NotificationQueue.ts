// ./src/utils/NotificationQueue.ts
import { logger } from '../logger';

export interface UploadedFileInfo {
  /** Field name the file was uploaded from */
  fieldName: string;

  /** Original filename */
  fileName: string;

  /** Reference to uploaded file in internal storage (null for external storage) */
  uploadedFileId?: string;

  /** URL to access the file */
  fileUrl: string;

  /** Storage path/key for external storage (blob name, S3 key, GCS object name) - enables URL regeneration */
  storagePath?: string | null | undefined;

  /** Connector ID used for external storage (null for internal storage) */
  connectorId?: string | null | undefined;

  /** True if file was uploaded to internal storage due to external connector failure */
  isFallback?: boolean | null | undefined;

  /** MIME type of the file */
  mimeType: string;

  /** File size in bytes */
  fileSize: number;
}

export interface QueueTaskData {
  // Submission info
  submissionId: string;
  requestId: string;
  formId: string;

  // Form data (serializable)
  formData: Record<string, any>;
  formFiles: Record<string, any>;

  // Form config (serializable)
  form: {
    id: string;
    accountId: string;
    path: string;
    name: string;
    subject: string;
    accountEmailId?: string;
    connectorId?: string;
    filesConnectorId?: string;
    emailConnectorId?: string;
    workflowId?: string;
    sendConfirmation?: boolean;
    thankYouMessage?: string;
    notificationTemplateId?: string;
    confirmationTemplateId?: string;
    createdBy?: string;
  };

  // Submission record (serializable)
  submission: {
    id: string;
    requestId: string;
    submissionDttm: string;
    remoteIp?: string;
    userAgent?: string;
    referrer?: string;
  };

  // Additional context
  replyTo?: string;
  formFields: Array<{
    id: string;
    formId: string;
    name: string;
    label?: string;
    fieldType: string;
  }>;

  // File info
  filesCnt: number;
  filesSize: number;

  // Space/auth context
  spaceId?: string;
  accountId?: string;
}

export interface QueueTask {
  id: string;
  name: string;
  data: QueueTaskData;
  createdAt: Date;
}

export interface QueueStats {
  queueSize: number;
  processing: number;
  totalProcessed: number;
  totalFailed: number;
  maxConcurrent: number;
}

// Task processor function type - will be set by the application
export type TaskProcessor = (task: QueueTask) => Promise<void>;

/**
 * In-memory queue for post-submission processing with concurrency control.
 *
 * IMPORTANT: Tasks only contain serializable data, not database connections or core instances.
 * The task processor is responsible for creating fresh database contexts.
 *
 * Features:
 * - Configurable concurrency limit to prevent system overload
 * - Task naming for better logging and debugging
 * - Basic statistics for monitoring
 * - Graceful error handling per task
 * - Serializable task data for future migration to external queues
 */
class NotificationQueueClass {
  private queue: QueueTask[] = [];
  private processing: number = 0;
  private maxConcurrent: number = 5;
  private totalProcessed: number = 0;
  private totalFailed: number = 0;
  private isShuttingDown: boolean = false;
  private taskProcessor: TaskProcessor | null = null;

  /**
   * Configure the queue settings
   */
  configure(options: { maxConcurrent?: number }): void {
    if (options.maxConcurrent !== undefined && options.maxConcurrent > 0) {
      this.maxConcurrent = options.maxConcurrent;
      logger.log(`NotificationQueue configured with maxConcurrent: ${this.maxConcurrent}`);
    }
  }

  /**
   * Set the task processor function.
   * This should be called once during application startup.
   * The processor is responsible for creating fresh database contexts and executing tasks.
   */
  setTaskProcessor(processor: TaskProcessor): void {
    this.taskProcessor = processor;
    logger.log('NotificationQueue: Task processor configured');
  }

  /**
   * Enqueue a post-submission task for background processing
   *
   * @param name - Descriptive name for logging (e.g., "post-submission:202411301234-ABCD")
   * @param data - Serializable task data
   */
  enqueue(name: string, data: QueueTaskData): void {
    if (this.isShuttingDown) {
      logger.error(`NotificationQueue is shutting down, rejecting task: ${name}`);
      return;
    }

    if (!this.taskProcessor) {
      logger.error(`NotificationQueue: No task processor configured, rejecting task: ${name}`);
      return;
    }

    const task: QueueTask = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      data,
      createdAt: new Date(),
    };

    this.queue.push(task);
    logger.log(`NotificationQueue: Enqueued task "${name}" (queue size: ${this.queue.length})`);

    // Start processing if not at capacity
    this.processNext();
  }

  /**
   * Process the next task in the queue
   */
  private async processNext(): Promise<void> {
    // Check if we can process more tasks
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    if (!this.taskProcessor) {
      logger.error('NotificationQueue: No task processor configured');
      return;
    }

    // Get next task
    const task = this.queue.shift();
    if (!task) {
      return;
    }

    this.processing++;

    const startTime = Date.now();
    logger.log(
      `NotificationQueue: Processing task "${task.name}" (processing: ${this.processing}/${this.maxConcurrent})`,
    );

    try {
      await this.taskProcessor(task);
      this.totalProcessed++;

      const duration = Date.now() - startTime;
      logger.log(`NotificationQueue: Task "${task.name}" completed in ${duration}ms`);
    } catch (error: any) {
      this.totalFailed++;

      const duration = Date.now() - startTime;
      logger.error(`NotificationQueue: Task "${task.name}" failed after ${duration}ms:`, error.message || error);
    } finally {
      this.processing--;

      // Process next task in queue
      this.processNext();
    }
  }

  /**
   * Get current queue statistics
   */
  getStats(): QueueStats {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Check if queue is empty and no tasks are processing
   */
  isIdle(): boolean {
    return this.queue.length === 0 && this.processing === 0;
  }

  /**
   * Graceful shutdown - stop accepting new tasks and wait for current tasks to complete
   *
   * @param timeoutMs - Maximum time to wait for tasks to complete (default: 30 seconds)
   * @returns Promise that resolves when queue is drained or timeout reached
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true;
    logger.log(`NotificationQueue: Initiating shutdown (${this.queue.length} queued, ${this.processing} processing)`);

    // Clear pending queue - these won't be processed
    const droppedTasks = this.queue.length;
    this.queue = [];

    if (droppedTasks > 0) {
      logger.log(`NotificationQueue: Dropped ${droppedTasks} pending tasks during shutdown`);
    }

    // Wait for currently processing tasks to complete
    const startTime = Date.now();
    while (this.processing > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.processing > 0) {
      logger.error(`NotificationQueue: Shutdown timeout - ${this.processing} tasks still processing`);
    } else {
      logger.log('NotificationQueue: Shutdown complete');
    }
  }

  /**
   * Reset the queue (mainly for testing)
   */
  reset(): void {
    this.queue = [];
    this.processing = 0;
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.isShuttingDown = false;
  }
}

// Export singleton instance
export const NotificationQueue = new NotificationQueueClass();
