import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { FINANCING_TYPES, VEHICLE_FINANCING_STATUS, SCHEDULE_TYPES } from '../../database';

// Valid financing types
const validFinancingTypes = Object.values(FINANCING_TYPES);

// Valid statuses for vehicle financing
const validStatuses = Object.values(VEHICLE_FINANCING_STATUS);

// Valid mileage allowance units
const validMileageUnits = ['km', 'mi'];

// Valid schedule types (for nested expenseSchedule validation)
const validScheduleTypes = Object.values(SCHEDULE_TYPES);

// Regex patterns for schedule_days validation (reused from expenseScheduleValidators)
const WEEKLY_DAYS_PATTERN = /^[1-7](,[1-7])*$/;
const MONTHLY_DAYS_PATTERN = /^(last|[1-9]|[12]\d|3[01])(,(last|[1-9]|[12]\d|3[01]))*$/;
const YEARLY_DAYS_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(,(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))*$/;
const ONE_TIME_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// ---------------------------------------------------------------------------
// List filter rules
// ---------------------------------------------------------------------------

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
  financingType: [
    {
      rule: 'array',
      message: 'Financing types should be an array of strings',
    },
  ],
  expenseScheduleId: [
    {
      rule: 'array',
      message: 'Expense schedule IDs should be an array of UUIDs',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
    },
  ],
  searchKeyword: [
    {
      rule: 'string',
      message: 'Search keyword should be a string',
    },
  ],
});

// ---------------------------------------------------------------------------
// Create rules
// ---------------------------------------------------------------------------

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
  financingType: [
    {
      rule: 'required',
      message: 'Financing type is required',
    },
    {
      rule: 'string',
      message: 'Financing type should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Financing type should not exceed 16 characters',
    },
  ],
  lenderName: [
    {
      rule: 'string',
      message: 'Lender name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Lender name should not exceed 128 characters',
    },
  ],
  agreementNumber: [
    {
      rule: 'string',
      message: 'Agreement number should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Agreement number should not exceed 64 characters',
    },
  ],
  startDate: [
    {
      rule: 'required',
      message: 'Start date is required',
    },
    {
      rule: 'string',
      message: 'Start date should be a valid datetime string',
    },
  ],
  endDate: [
    {
      rule: 'string',
      message: 'End date should be a valid datetime string',
    },
  ],
  termMonths: [
    {
      rule: 'integer',
      message: 'Term months should be an integer',
    },
  ],
  totalAmount: [
    {
      rule: 'numeric',
      message: 'Total amount should be a number',
    },
  ],
  financingCurrency: [
    {
      rule: 'string',
      message: 'Financing currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Financing currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  interestRate: [
    {
      rule: 'numeric',
      message: 'Interest rate should be a number',
    },
  ],
  downPayment: [
    {
      rule: 'numeric',
      message: 'Down payment should be a number',
    },
  ],
  residualValue: [
    {
      rule: 'numeric',
      message: 'Residual value should be a number',
    },
  ],
  mileageAllowance: [
    {
      rule: 'numeric',
      message: 'Mileage allowance should be a number',
    },
  ],
  mileageAllowanceUnit: [
    {
      rule: 'string',
      message: 'Mileage allowance unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Mileage allowance unit should not exceed 8 characters',
    },
  ],
  mileageOverageCost: [
    {
      rule: 'numeric',
      message: 'Mileage overage cost should be a number',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  ...ruleStatus(),
  // Note: expenseSchedule is a nested object validated separately in checkDependencies
});

// ---------------------------------------------------------------------------
// Update rules (same fields but none required)
// ---------------------------------------------------------------------------

const rulesUpdate = new Checkit({
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  financingType: [
    {
      rule: 'string',
      message: 'Financing type should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Financing type should not exceed 16 characters',
    },
  ],
  lenderName: [
    {
      rule: 'string',
      message: 'Lender name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Lender name should not exceed 128 characters',
    },
  ],
  agreementNumber: [
    {
      rule: 'string',
      message: 'Agreement number should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Agreement number should not exceed 64 characters',
    },
  ],
  startDate: [
    {
      rule: 'string',
      message: 'Start date should be a valid datetime string',
    },
  ],
  endDate: [
    {
      rule: 'string',
      message: 'End date should be a valid datetime string',
    },
  ],
  termMonths: [
    {
      rule: 'integer',
      message: 'Term months should be an integer',
    },
  ],
  totalAmount: [
    {
      rule: 'numeric',
      message: 'Total amount should be a number',
    },
  ],
  financingCurrency: [
    {
      rule: 'string',
      message: 'Financing currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Financing currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  interestRate: [
    {
      rule: 'numeric',
      message: 'Interest rate should be a number',
    },
  ],
  downPayment: [
    {
      rule: 'numeric',
      message: 'Down payment should be a number',
    },
  ],
  residualValue: [
    {
      rule: 'numeric',
      message: 'Residual value should be a number',
    },
  ],
  mileageAllowance: [
    {
      rule: 'numeric',
      message: 'Mileage allowance should be a number',
    },
  ],
  mileageAllowanceUnit: [
    {
      rule: 'string',
      message: 'Mileage allowance unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Mileage allowance unit should not exceed 8 characters',
    },
  ],
  mileageOverageCost: [
    {
      rule: 'numeric',
      message: 'Mileage overage cost should be a number',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  ...ruleStatus(),
  // Note: expenseSchedule is a nested object validated separately in checkDependencies
});

// ---------------------------------------------------------------------------
// Custom validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate that startDate is a valid date
 */
const validateStartDate = (startDate: string): string | null => {
  if (!startDate) {
    return null;
  }

  const date = new Date(startDate);
  if (isNaN(date.getTime())) {
    return 'Start date is not a valid date';
  }

  return null;
};

/**
 * Validate that endDate is after startDate
 */
const validateEndDate = (startDate: string, endDate: string): string | null => {
  if (!endDate) {
    return null;
  }

  const end = new Date(endDate);
  if (isNaN(end.getTime())) {
    return 'End date is not a valid date';
  }

  if (startDate) {
    const start = new Date(startDate);
    if (end <= start) {
      return 'End date must be after start date';
    }
  }

  return null;
};

/**
 * Validate financing type is a known value
 */
const validateFinancingType = (financingType: string): string | null => {
  if (!financingType) {
    return null;
  }

  if (!(validFinancingTypes as readonly string[]).includes(financingType)) {
    return `Financing type must be one of: ${validFinancingTypes.join(', ')}`;
  }

  return null;
};

/**
 * Validate interest rate is within a reasonable range
 */
const validateInterestRate = (interestRate: number | null | undefined): string | null => {
  if (interestRate == null) {
    return null;
  }

  if (interestRate < 0) {
    return 'Interest rate cannot be negative';
  }

  if (interestRate > 100) {
    return 'Interest rate cannot exceed 100%';
  }

  return null;
};

/**
 * Validate term months is a positive number within a reasonable range
 */
const validateTermMonths = (termMonths: number | null | undefined): string | null => {
  if (termMonths == null) {
    return null;
  }

  if (termMonths < 1) {
    return 'Term months must be at least 1';
  }

  if (termMonths > 120) {
    return 'Term months cannot exceed 120 (10 years)';
  }

  return null;
};

/**
 * Validate mileage allowance unit is a known value
 */
const validateMileageAllowanceUnit = (unit: string | null | undefined): string | null => {
  if (!unit) {
    return null;
  }

  if (!validMileageUnits.includes(unit)) {
    return `Mileage allowance unit must be one of: ${validMileageUnits.join(', ')}`;
  }

  return null;
};

/**
 * Validate that numeric amounts are not negative
 */
const validateNonNegative = (value: number | null | undefined, fieldName: string): string | null => {
  if (value == null) {
    return null;
  }

  if (value < 0) {
    return `${fieldName} cannot be negative`;
  }

  return null;
};

/**
 * Validate lease-specific fields: mileage allowance requires mileage allowance unit and vice versa
 */
const validateLeaseFields = (params: any): string | null => {
  const { financingType, mileageAllowance, mileageAllowanceUnit } = params || {};

  // If mileage allowance is set, unit must be set too (and vice versa)
  if (mileageAllowance != null && !mileageAllowanceUnit) {
    return 'Mileage allowance unit is required when mileage allowance is specified';
  }

  if (mileageAllowanceUnit && mileageAllowance == null) {
    return 'Mileage allowance is required when mileage allowance unit is specified';
  }

  // Residual value and mileage fields are lease-specific
  if (financingType === FINANCING_TYPES.LOAN) {
    if (mileageAllowance != null) {
      return 'Mileage allowance is only applicable to leases';
    }
  }

  return null;
};

/**
 * Validate schedule_days format based on schedule_type.
 * Replicates the logic from expenseScheduleValidators for inline validation
 * of the nested expenseSchedule input.
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
      const weekDays = scheduleDays.split(',');
      if (new Set(weekDays).size !== weekDays.length) {
        return 'Weekly schedule days must not contain duplicates';
      }
      break;

    case SCHEDULE_TYPES.MONTHLY:
      if (!MONTHLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Monthly schedule days must be comma-separated numbers 1-31 or "last". Example: "1,15,last"';
      }
      const monthDays = scheduleDays.split(',');
      if (new Set(monthDays).size !== monthDays.length) {
        return 'Monthly schedule days must not contain duplicates';
      }
      break;

    case SCHEDULE_TYPES.YEARLY:
      if (!YEARLY_DAYS_PATTERN.test(scheduleDays)) {
        return 'Yearly schedule days must be comma-separated MM-DD dates. Example: "01-15,06-15"';
      }
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
      break;

    case SCHEDULE_TYPES.ONE_TIME:
      if (!ONE_TIME_DATE_PATTERN.test(scheduleDays)) {
        return 'One-time schedule must be a single YYYY-MM-DD date. Example: "2026-06-20"';
      }
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
 * Validate the nested expenseSchedule input object.
 * Since this is an embedded object, Checkit can't validate it at the top level.
 * We validate its fields here in checkDependencies.
 */
const validateExpenseScheduleInput = (expenseSchedule: any): OpResult | null => {
  if (!expenseSchedule || typeof expenseSchedule !== 'object') {
    return null; // expenseSchedule is optional
  }

  const { scheduleType, scheduleDays, totalPrice, costWork, costParts, tax, fees, paidInCurrency, shortNote, whereDone } =
    expenseSchedule;

  // If provided, scheduleType must be valid
  if (scheduleType && !validScheduleTypes.includes(scheduleType)) {
    return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
      'expenseSchedule.scheduleType',
      `Schedule type must be one of: ${validScheduleTypes.join(', ')}`,
    );
  }

  // If scheduleType is provided, scheduleDays is required
  if (scheduleType && !scheduleDays) {
    return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
      'expenseSchedule.scheduleDays',
      'Schedule days is required when schedule type is specified',
    );
  }

  // Validate scheduleDays format matches scheduleType
  if (scheduleType && scheduleDays) {
    const scheduleDaysError = validateScheduleDaysFormat(scheduleType, scheduleDays);
    if (scheduleDaysError) {
      return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'expenseSchedule.scheduleDays',
        scheduleDaysError,
      );
    }
  }

  // Validate numeric fields are non-negative
  const numericFields = [
    { value: totalPrice, field: 'expenseSchedule.totalPrice', label: 'Payment amount' },
    { value: costWork, field: 'expenseSchedule.costWork', label: 'Labor cost' },
    { value: costParts, field: 'expenseSchedule.costParts', label: 'Parts cost' },
    { value: tax, field: 'expenseSchedule.tax', label: 'Tax' },
    { value: fees, field: 'expenseSchedule.fees', label: 'Fees' },
  ];

  for (const check of numericFields) {
    if (check.value != null) {
      if (typeof check.value !== 'number' || isNaN(check.value)) {
        return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          check.field,
          `${check.label} should be a number`,
        );
      }
      if (check.value < 0) {
        return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          check.field,
          `${check.label} cannot be negative`,
        );
      }
    }
  }

  // Validate currency format
  if (paidInCurrency != null) {
    if (typeof paidInCurrency !== 'string' || paidInCurrency.length > 3) {
      return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'expenseSchedule.paidInCurrency',
        'Payment currency should be a valid ISO 4217 code (3 characters)',
      );
    }
  }

  // Validate string field lengths
  if (shortNote != null && typeof shortNote === 'string' && shortNote.length > 128) {
    return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
      'expenseSchedule.shortNote',
      'Short note should not exceed 128 characters',
    );
  }

  if (whereDone != null && typeof whereDone === 'string' && whereDone.length > 128) {
    return new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
      'expenseSchedule.whereDone',
      'Where done should not exceed 128 characters',
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// Dependency checks
// ---------------------------------------------------------------------------

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const {
    carId,
    financingType,
    startDate,
    endDate,
    termMonths,
    totalAmount,
    interestRate,
    downPayment,
    residualValue,
    mileageAllowance,
    mileageAllowanceUnit,
    mileageOverageCost,
    expenseSchedule,
    status,
  } = args?.params || {};

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
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Cannot create financing for a removed car'),
        {},
      ];
    }

    if (car.whenSold) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Cannot create financing for a sold car'),
        {},
      ];
    }

    dependencies['car'] = car;
  }

  // Check no other active financing exists for this car (only on create)
  if (!isUpdate && carId) {
    const existingFinancing = await opt.core.getGateways().vehicleFinancingGw.list({
      carId,
      accountId,
      status: [VEHICLE_FINANCING_STATUS.ACTIVE],
    });

    if (existingFinancing?.data?.length > 0) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'carId',
          'This vehicle already has an active financing record. Please complete or remove the existing financing first.',
        ),
        {},
      ];
    }
  }

  // Validate financing type
  const financingTypeError = validateFinancingType(financingType);
  if (financingTypeError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('financingType', financingTypeError),
      {},
    ];
  }

  // Validate start date
  const startDateError = validateStartDate(startDate);
  if (startDateError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('startDate', startDateError),
      {},
    ];
  }

  // Validate end date is after start date
  const endDateError = validateEndDate(startDate, endDate);
  if (endDateError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('endDate', endDateError),
      {},
    ];
  }

  // Validate term months
  const termMonthsError = validateTermMonths(termMonths);
  if (termMonthsError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('termMonths', termMonthsError),
      {},
    ];
  }

  // Validate interest rate
  const interestRateError = validateInterestRate(interestRate);
  if (interestRateError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('interestRate', interestRateError),
      {},
    ];
  }

  // Validate non-negative amounts
  const nonNegativeChecks = [
    { value: totalAmount, field: 'totalAmount', label: 'Total amount' },
    { value: downPayment, field: 'downPayment', label: 'Down payment' },
    { value: residualValue, field: 'residualValue', label: 'Residual value' },
    { value: mileageAllowance, field: 'mileageAllowance', label: 'Mileage allowance' },
    { value: mileageOverageCost, field: 'mileageOverageCost', label: 'Mileage overage cost' },
  ];

  for (const check of nonNegativeChecks) {
    const error = validateNonNegative(check.value, check.label);
    if (error) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(check.field, error),
        {},
      ];
    }
  }

  // Validate mileage allowance unit
  const mileageUnitError = validateMileageAllowanceUnit(mileageAllowanceUnit);
  if (mileageUnitError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('mileageAllowanceUnit', mileageUnitError),
      {},
    ];
  }

  // Validate lease-specific field consistency
  const leaseFieldsError = validateLeaseFields(args?.params);
  if (leaseFieldsError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('financingType', leaseFieldsError),
      {},
    ];
  }

  // Validate nested expenseSchedule input
  const expenseScheduleError = validateExpenseScheduleInput(expenseSchedule);
  if (expenseScheduleError) {
    return [expenseScheduleError, {}];
  }

  // Validate status
  if (status != null && !validStatuses.includes(status)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'status',
        `Status must be one of: ${validStatuses.join(', ')} (100=Active, 200=Completed, 10000=Removed)`,
      ),
      {},
    ];
  }

  return [true, dependencies];
};

// ---------------------------------------------------------------------------
// Exported validators
// ---------------------------------------------------------------------------

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