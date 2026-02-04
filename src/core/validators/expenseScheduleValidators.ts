// ./src/core/validators/expenseScheduleValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { SCHEDULE_TYPES, EXPENSE_SCHEDULE_STATUS } from '../../database';

// Valid schedule types
const validScheduleTypes = Object.values(SCHEDULE_TYPES);

// Valid statuses for expense schedules
const validStatuses = Object.values(EXPENSE_SCHEDULE_STATUS);

// Regex patterns for schedule_days validation
const WEEKLY_DAYS_PATTERN = /^[1-7](,[1-7])*$/;
const MONTHLY_DAYS_PATTERN = /^(last|[1-9]|[12]\d|3[01])(,(last|[1-9]|[12]\d|3[01]))*$/;
const YEARLY_DAYS_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(,(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))*$/;
const ONE_TIME_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  userId: [
    {
      rule: 'array',
      message: 'User IDs should be an array of UUIDs',
    },
  ],
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  kindId: [
    {
      rule: 'array',
      message: 'Kind IDs should be an array of integers',
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
  nextScheduledAtFrom: [
    {
      rule: 'string',
      message: 'Next scheduled at from should be a valid datetime string',
    },
  ],
  nextScheduledAtTo: [
    {
      rule: 'string',
      message: 'Next scheduled at to should be a valid datetime string',
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
  carId: [
    {
      rule: 'required',
      message: 'Car ID is required',
    },
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  kindId: [
    {
      rule: 'required',
      message: 'Kind ID is required',
    },
    {
      rule: 'integer',
      message: 'Kind ID should be an integer',
    },
  ],
  scheduleType: [
    {
      rule: 'required',
      message: 'Schedule type is required',
    },
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
      rule: 'required',
      message: 'Schedule days is required',
    },
    {
      rule: 'string',
      message: 'Schedule days should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Schedule days should not exceed 64 characters',
    },
  ],
  startAt: [
    {
      rule: 'required',
      message: 'Start date is required',
    },
    {
      rule: 'string',
      message: 'Start date should be a valid datetime string',
    },
  ],
  endAt: [
    {
      rule: 'string',
      message: 'End date should be a valid datetime string',
    },
  ],
  whereDone: [
    {
      rule: 'string',
      message: 'Where done should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Where done should not exceed 128 characters',
    },
  ],
  costWork: [
    {
      rule: 'numeric',
      message: 'Cost of work should be a number',
    },
  ],
  costParts: [
    {
      rule: 'numeric',
      message: 'Cost of parts should be a number',
    },
  ],
  tax: [
    {
      rule: 'numeric',
      message: 'Tax should be a number',
    },
  ],
  fees: [
    {
      rule: 'numeric',
      message: 'Fees should be a number',
    },
  ],
  subtotal: [
    {
      rule: 'numeric',
      message: 'Subtotal should be a number',
    },
  ],
  totalPrice: [
    {
      rule: 'numeric',
      message: 'Total price should be a number',
    },
  ],
  paidInCurrency: [
    {
      rule: 'string',
      message: 'Paid in currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Paid in currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  shortNote: [
    {
      rule: 'string',
      message: 'Short note should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Short note should not exceed 128 characters',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  kindId: [
    {
      rule: 'integer',
      message: 'Kind ID should be an integer',
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
  startAt: [
    {
      rule: 'string',
      message: 'Start date should be a valid datetime string',
    },
  ],
  endAt: [
    {
      rule: 'string',
      message: 'End date should be a valid datetime string',
    },
  ],
  whereDone: [
    {
      rule: 'string',
      message: 'Where done should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Where done should not exceed 128 characters',
    },
  ],
  costWork: [
    {
      rule: 'numeric',
      message: 'Cost of work should be a number',
    },
  ],
  costParts: [
    {
      rule: 'numeric',
      message: 'Cost of parts should be a number',
    },
  ],
  tax: [
    {
      rule: 'numeric',
      message: 'Tax should be a number',
    },
  ],
  fees: [
    {
      rule: 'numeric',
      message: 'Fees should be a number',
    },
  ],
  subtotal: [
    {
      rule: 'numeric',
      message: 'Subtotal should be a number',
    },
  ],
  totalPrice: [
    {
      rule: 'numeric',
      message: 'Total price should be a number',
    },
  ],
  paidInCurrency: [
    {
      rule: 'string',
      message: 'Paid in currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Paid in currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  shortNote: [
    {
      rule: 'string',
      message: 'Short note should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Short note should not exceed 128 characters',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  ...ruleStatus(),
});

/**
 * Validate schedule_days format based on schedule_type
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
      // Check for duplicates
      const weekDays = scheduleDays.split(',');
      if (new Set(weekDays).size !== weekDays.length) {
        return 'Weekly schedule days must not contain duplicates';
      }
      break;

    case SCHEDULE_TYPES.MONTHLY:
      if (!MONTHLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Monthly schedule days must be comma-separated numbers 1-31 or "last". Example: "1,15,last"';
      }
      // Check for duplicates
      const monthDays = scheduleDays.split(',');
      if (new Set(monthDays).size !== monthDays.length) {
        return 'Monthly schedule days must not contain duplicates';
      }
      break;

    case SCHEDULE_TYPES.YEARLY:
      if (!YEARLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Yearly schedule days must be comma-separated MM-DD dates. Example: "01-15,06-15"';
      }
      // Check for duplicates
      const yearDays = scheduleDays.split(',');
      if (new Set(yearDays).size !== yearDays.length) {
        return 'Yearly schedule days must not contain duplicates';
      }
      // Validate each date is valid (e.g., no 02-31)
      for (const date of yearDays) {
        const [month, day] = date.split('-').map(Number);
        const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > maxDays[month - 1]) {
          return `Invalid date in yearly schedule: ${date}. Day ${day} is not valid for month ${month}`;
        }
      }
      break;

    case SCHEDULE_TYPES.ONE_TIME:
      if (!ONE_TIME_DATE_PATTERN.test(scheduleDays)) {
        return 'One-time schedule must be a single YYYY-MM-DD date. Example: "2026-06-20"';
      }
      // Validate the date is valid
      const dateObj = new Date(scheduleDays);
      if (isNaN(dateObj.getTime())) {
        return `Invalid one-time date: ${scheduleDays}`;
      }
      break;

    default:
      return `Invalid schedule type: ${scheduleType}. Must be one of: ${validScheduleTypes.join(', ')}`;
  }

  return null;
};

/**
 * Validate that startAt is not in the past (for new schedules)
 */
const validateStartDate = (startAt: string, isUpdate: boolean): string | null => {
  if (!startAt) {
    return null;
  }

  const startDate = new Date(startAt);
  if (isNaN(startDate.getTime())) {
    return 'Start date is not a valid date';
  }

  // For new schedules, start date should not be in the past
  // if (!isUpdate) {
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
  //   if (startDate < today) {
  //     return 'Start date cannot be in the past';
  //   }
  // }

  return null;
};

/**
 * Validate that endAt is after startAt
 */
const validateEndDate = (startAt: string, endAt: string): string | null => {
  if (!endAt) {
    return null;
  }

  const endDate = new Date(endAt);
  if (isNaN(endDate.getTime())) {
    return 'End date is not a valid date';
  }

  if (startAt) {
    const startDate = new Date(startAt);
    if (endDate <= startDate) {
      return 'End date must be after start date';
    }
  }

  return null;
};

/**
 * Validate one-time schedule date is not in the past
 */
const validateOneTimeDate = (scheduleType: string, scheduleDays: string): string | null => {
  if (scheduleType !== SCHEDULE_TYPES.ONE_TIME) {
    return null;
  }

  const scheduleDate = new Date(scheduleDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scheduleDate < today) {
    return 'One-time schedule date cannot be in the past';
  }

  return null;
};

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, kindId, scheduleType, scheduleDays, startAt, endAt, status } = args?.params || {};
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

    // Check car is not sold or removed
    if (car.removedAt) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Cannot create schedule for a removed car'),
        {},
      ];
    }

    if (car.whenSold) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Cannot create schedule for a sold car'),
        {},
      ];
    }

    dependencies['car'] = car;
  }

  // Validate expense kind exists
  if (kindId) {
    const expenseKind = await opt.core.getGateways().expenseKindGw.get(kindId);

    if (!expenseKind) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('kindId', 'Expense kind not found'),
        {},
      ];
    }

    dependencies['expenseKind'] = expenseKind;
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

  // Validate start date
  if (startAt) {
    const startDateError = validateStartDate(startAt, !!isUpdate);
    if (startDateError) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('startAt', startDateError),
        {},
      ];
    }
  }

  // Validate end date
  if (endAt) {
    const endDateError = validateEndDate(startAt, endAt);
    if (endDateError) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('endAt', endDateError),
        {},
      ];
    }
  }

  // Validate one-time date is not in the past
  if (scheduleType === SCHEDULE_TYPES.ONE_TIME && scheduleDays) {
    const oneTimeError = validateOneTimeDate(scheduleType, scheduleDays);
    if (oneTimeError) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('scheduleDays', oneTimeError),
        {},
      ];
    }
  }

  // Validate status
  if (status != null && !validStatuses.includes(status)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'status',
        `Status must be one of: ${validStatuses.join(', ')} (50=Paused, 100=Active, 200=Completed)`,
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

const validators = {
  list: validateList({ rules: rulesList }),
  create: validateCreate,
  update: validateUpdate,
};

export { validators };