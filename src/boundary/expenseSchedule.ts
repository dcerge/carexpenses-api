// ./src/boundary/expenseSchedule.ts
export const SCHEDULE_CONSTANTS = {
  // Iteration limits for date calculations
  MAX_MISSED_DATES_ITERATIONS: 366,
  MAX_SCHEDULED_DATES_ITERATIONS: 2000,
  MAX_RANGE_ITERATIONS: 1000,

  // Batch processing limits
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_MAX_SCHEDULES: 10000,
  MAX_EXPENSES_PER_SCHEDULE: 5000,

  // Weekly days (ISO format)
  WEEKLY_DAY_MIN: 1,
  WEEKLY_DAY_MAX: 7,

  // Monthly days
  MONTHLY_DAY_MIN: 1,
  MONTHLY_DAY_MAX: 31,

  // Search limits for finding next occurrence
  WEEKLY_SEARCH_DAYS: 8,
  MONTHLY_SEARCH_DAYS: 62,
  YEARLY_SEARCH_YEARS: 2,

  // Error limits in response
  MAX_ERRORS_IN_RESPONSE: 100,
} as const;