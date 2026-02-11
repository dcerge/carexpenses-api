// ./src/core/validators/vehicleTaskValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { SCHEDULE_TYPES, VEHICLE_TASK_STATUS, VEHICLE_TASK_PRIORITY } from '../../database';

// Valid schedule types
const validScheduleTypes = Object.values(SCHEDULE_TYPES);

// Valid statuses for vehicle tasks
const validStatuses = Object.values(VEHICLE_TASK_STATUS);

// Valid priorities for vehicle tasks
const validPriorities = Object.values(VEHICLE_TASK_PRIORITY);

// Regex patterns for schedule_days validation (shared with expense schedules)
const WEEKLY_DAYS_PATTERN = /^[1-7](,[1-7])*$/;
const MONTHLY_DAYS_PATTERN = /^(last|[1-9]|[12]\d|3[01])(,(last|[1-9]|[12]\d|3[01]))*$/;
const YEARLY_DAYS_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(,(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))*$/;
const ONE_TIME_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  assignedToUserId: [
    {
      rule: 'array',
      message: 'Assigned to user IDs should be an array of UUIDs',
    },
  ],
  createdByUserId: [
    {
      rule: 'array',
      message: 'Created by user IDs should be an array of UUIDs',
    },
  ],
  completedByUserId: [
    {
      rule: 'array',
      message: 'Completed by user IDs should be an array of UUIDs',
    },
  ],
  priority: [
    {
      rule: 'array',
      message: 'Priorities should be an array of integers',
    },
  ],
  category: [
    {
      rule: 'array',
      message: 'Categories should be an array of strings',
    },
  ],
  scheduleType: [
    {
      rule: 'array',
      message: 'Schedule types should be an array of strings',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
    },
  ],
  dueDateFrom: [
    {
      rule: 'string',
      message: 'Due date from should be a valid datetime string',
    },
  ],
  dueDateTo: [
    {
      rule: 'string',
      message: 'Due date to should be a valid datetime string',
    },
  ],
  reminderDateFrom: [
    {
      rule: 'string',
      message: 'Reminder date from should be a valid datetime string',
    },
  ],
  reminderDateTo: [
    {
      rule: 'string',
      message: 'Reminder date to should be a valid datetime string',
    },
  ],
  linkedExpenseId: [
    {
      rule: 'array',
      message: 'Linked expense IDs should be an array of UUIDs',
    },
  ],
  searchKeyword: [
    {
      rule: 'string',
      message: 'Search keyword should be a string',
    },
  ],
});

const rulesCreate = new Checkit({
  title: [
    {
      rule: 'required',
      message: 'Title is required',
    },
    {
      rule: 'string',
      message: 'Title should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Title should not exceed 256 characters',
    },
  ],
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  assignedToUserId: [
    {
      rule: 'uuid',
      message: 'Assigned to user ID should be a valid UUID',
    },
  ],
  priority: [
    {
      rule: 'integer',
      message: 'Priority should be an integer',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  category: [
    {
      rule: 'string',
      message: 'Category should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Category should not exceed 128 characters',
    },
  ],
  dueDate: [
    {
      rule: 'string',
      message: 'Due date should be a valid datetime string',
    },
  ],
  reminderDate: [
    {
      rule: 'string',
      message: 'Reminder date should be a valid datetime string',
    },
  ],
  scheduleType: [
    {
      rule: 'string',
      message: 'Schedule type should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Schedule type should not exceed 16 characters',
    },
  ],
  scheduleDays: [
    {
      rule: 'string',
      message: 'Schedule days should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Schedule days should not exceed 64 characters',
    },
  ],
  linkedExpenseId: [
    {
      rule: 'uuid',
      message: 'Linked expense ID should be a valid UUID',
    },
  ],
  ...ruleStatus([VEHICLE_TASK_STATUS.TODO, VEHICLE_TASK_STATUS.IN_PROGRESS, VEHICLE_TASK_STATUS.COMPLETE]),
});

const rulesUpdate = new Checkit({
  title: [
    {
      rule: 'string',
      message: 'Title should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Title should not exceed 256 characters',
    },
  ],
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  assignedToUserId: [
    {
      rule: 'uuid',
      message: 'Assigned to user ID should be a valid UUID',
    },
  ],
  priority: [
    {
      rule: 'integer',
      message: 'Priority should be an integer',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  category: [
    {
      rule: 'string',
      message: 'Category should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Category should not exceed 128 characters',
    },
  ],
  dueDate: [
    {
      rule: 'string',
      message: 'Due date should be a valid datetime string',
    },
  ],
  reminderDate: [
    {
      rule: 'string',
      message: 'Reminder date should be a valid datetime string',
    },
  ],
  scheduleType: [
    {
      rule: 'string',
      message: 'Schedule type should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Schedule type should not exceed 16 characters',
    },
  ],
  scheduleDays: [
    {
      rule: 'string',
      message: 'Schedule days should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Schedule days should not exceed 64 characters',
    },
  ],
  completedAt: [
    {
      rule: 'string',
      message: 'Completed at should be a valid datetime string',
    },
  ],
  completedByUserId: [
    {
      rule: 'uuid',
      message: 'Completed by user ID should be a valid UUID',
    },
  ],
  linkedExpenseId: [
    {
      rule: 'uuid',
      message: 'Linked expense ID should be a valid UUID',
    },
  ],
  ...ruleStatus([VEHICLE_TASK_STATUS.TODO, VEHICLE_TASK_STATUS.IN_PROGRESS, VEHICLE_TASK_STATUS.COMPLETE]),
});

// ===========================================================================
// Dashboard Input Validation
// ===========================================================================

const rulesDashboard = new Checkit({
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  dueSoonDays: [
    {
      rule: 'integer',
      message: 'Due soon days should be an integer',
    },
  ],
  limit: [
    {
      rule: 'integer',
      message: 'Limit should be an integer',
    },
  ],
});

/**
 * Validate schedule_days format based on schedule_type.
 * Shared logic with expense schedule validators.
 */
const validateScheduleDaysFormat = (scheduleType: string, scheduleDays: string): string | null => {
  if (!scheduleType || !scheduleDays) {
    return null;
  }

  switch (scheduleType) {
    case SCHEDULE_TYPES.WEEKLY:
      if (!WEEKLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Weekly schedule days must be comma-separated numbers 1-7 (1=Monday, 7=Sunday). Example: "1,3,5"';
      }
      {
        const weekDays = scheduleDays.split(',');
        if (new Set(weekDays).size !== weekDays.length) {
          return 'Weekly schedule days must not contain duplicates';
        }
      }
      break;

    case SCHEDULE_TYPES.MONTHLY:
      if (!MONTHLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Monthly schedule days must be comma-separated numbers 1-31 or "last". Example: "1,15,last"';
      }
      {
        const monthDays = scheduleDays.split(',');
        if (new Set(monthDays).size !== monthDays.length) {
          return 'Monthly schedule days must not contain duplicates';
        }
      }
      break;

    case SCHEDULE_TYPES.YEARLY:
      if (!YEARLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Yearly schedule days must be comma-separated MM-DD dates. Example: "01-15,06-15"';
      }
      {
        const yearDays = scheduleDays.split(',');
        if (new Set(yearDays).size !== yearDays.length) {
          return 'Yearly schedule days must not contain duplicates';
        }
        for (const date of yearDays) {
          const [month, day] = date.split('-').map(Number);
          const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (day > maxDays[month - 1]) {
            return `Invalid date in yearly schedule: ${date}. Day ${day} is not valid for month ${month}`;
          }
        }
      }
      break;

    case SCHEDULE_TYPES.ONE_TIME:
      if (scheduleDays && !ONE_TIME_DATE_PATTERN.test(scheduleDays)) {
        return 'One-time schedule must be a single YYYY-MM-DD date. Example: "2026-06-20"';
      }
      if (scheduleDays) {
        const dateObj = new Date(scheduleDays);
        if (isNaN(dateObj.getTime())) {
          return `Invalid one-time date: ${scheduleDays}`;
        }
      }
      break;

    default:
      return `Invalid schedule type: ${scheduleType}. Must be one of: ${validScheduleTypes.join(', ')}`;
  }

  return null;
};

/**
 * Validate that reminder date is before or equal to due date
 */
const validateReminderDate = (dueDate: string, reminderDate: string): string | null => {
  if (!reminderDate) {
    return null;
  }

  const reminder = new Date(reminderDate);
  if (isNaN(reminder.getTime())) {
    return 'Reminder date is not a valid date';
  }

  if (dueDate) {
    const due = new Date(dueDate);
    if (!isNaN(due.getTime()) && reminder > due) {
      return 'Reminder date must be on or before the due date';
    }
  }

  return null;
};

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, priority, scheduleType, scheduleDays, dueDate, reminderDate, linkedExpenseId, status } =
    args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

  // Validate car exists and belongs to account
  if (carId) {
    const car = await opt.core.getGateways().carGw.get(carId);

    if (!car) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    if (car.accountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    if (car.removedAt) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'carId',
          'Cannot create task for a removed car',
        ),
        {},
      ];
    }

    dependencies['car'] = car;
  }

  // Validate linked expense exists and belongs to account
  if (linkedExpenseId) {
    const expense = await opt.core.getGateways().expenseGw.get(linkedExpenseId);

    if (!expense) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('linkedExpenseId', 'Expense not found'),
        {},
      ];
    }

    if (expense.accountId !== accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('linkedExpenseId', 'Expense not found'),
        {},
      ];
    }

    dependencies['expense'] = expense;
  }

  // Validate priority
  if (priority != null && !validPriorities.includes(priority)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'priority',
        `Priority must be one of: ${validPriorities.join(', ')} (100=Low, 200=Medium, 300=High)`,
      ),
      {},
    ];
  }

  // Validate schedule type
  if (scheduleType && !validScheduleTypes.includes(scheduleType)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'scheduleType',
        `Schedule type must be one of: ${validScheduleTypes.join(', ')}`,
      ),
      {},
    ];
  }

  // Validate schedule days format matches schedule type
  if (scheduleType && scheduleDays) {
    const scheduleDaysError = validateScheduleDaysFormat(scheduleType, scheduleDays);
    if (scheduleDaysError) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('scheduleDays', scheduleDaysError),
        {},
      ];
    }
  }

  // Validate reminder date against due date
  if (reminderDate) {
    const reminderError = validateReminderDate(dueDate, reminderDate);
    if (reminderError) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('reminderDate', reminderError),
        {},
      ];
    }
  }

  // Validate status
  if (status != null && !validStatuses.includes(status)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'status',
        `Status must be one of: ${validStatuses.join(', ')} (100=Todo, 200=In Progress, 300=Complete, 10000=Removed)`,
      ),
      {},
    ];
  }

  return [true, dependencies];
};

const validateCreate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateCreateCommon({ rules: rulesCreate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  const [dependenciesCheck, dependencies] = await checkDependencies(args, opt);

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateUpdateCommon({ rules: rulesUpdate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  const [dependenciesCheck, dependencies] = await checkDependencies(args, opt, true);

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

/**
 * Validate dashboard input params.
 * Runs Checkit rules then applies semantic checks:
 * - dueSoonDays must be positive if provided
 * - limit must be between 1 and 100 if provided
 */
const validateDashboard = async (args: any, opt: BaseCoreActionsInterface) => {
  const { params } = args || {};

  // Run Checkit field-level rules
  try {
    await rulesDashboard.run(params || {});
  } catch (err: any) {
    const result = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });

    if (err.errors) {
      for (const [field, messages] of Object.entries(err.errors)) {
        const msgArray = Array.isArray(messages) ? messages : [messages];
        for (const msg of msgArray) {
          result.addError(field, String(msg));
        }
      }
    }

    return [result, {}];
  }

  // Semantic validations
  if (params?.dueSoonDays != null && params.dueSoonDays <= 0) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'dueSoonDays',
        'Due soon days must be a positive integer',
      ),
      {},
    ];
  }

  if (params?.limit != null) {
    if (params.limit <= 0 || params.limit > 100) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'limit',
          'Limit must be between 1 and 100',
        ),
        {},
      ];
    }
  }

  return [true, {}];
};

const validators = {
  list: validateList({ rules: rulesList }),
  create: validateCreate,
  update: validateUpdate,
  dashboard: validateDashboard,
};

export { validators };