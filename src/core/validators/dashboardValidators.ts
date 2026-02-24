// ./src/core/validators/dashboardValidators.ts
import Checkit from 'checkit';
import { BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

// =============================================================================
// dashboardGet validator
// =============================================================================

const rulesGet = new Checkit({
  carIds: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  timezoneOffset: [
    {
      rule: 'integer',
      message: 'Timezone offset should be an integer',
    },
  ],
  avgMonths: [
    {
      rule: 'integer',
      message: 'Average months should be an integer',
    },
  ],
  includeCars: [
    {
      rule: 'boolean',
      message: 'Include cars should be a boolean',
    },
  ],
  includeBreakdowns: [
    {
      rule: 'boolean',
      message: 'Include breakdowns should be a boolean',
    },
  ],
});

const validateGet = async (args: any, opt: BaseCoreActionsInterface) => {
  const params = args?.params || {};

  try {
    await rulesGet.run(params);
  } catch (err: any) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    const errors = err.toJSON ? err.toJSON() : err;

    for (const field of Object.keys(errors)) {
      opResult.addError(field, errors[field]?.message || errors[field]);
    }

    return [opResult, {}];
  }

  if (Array.isArray(params.carIds) && params.carIds.length > 0) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const carId of params.carIds) {
      if (!uuidRegex.test(carId)) {
        return [
          new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
            'carIds',
            `Invalid car ID: ${carId}. Each car ID should be a valid UUID`,
          ),
          {},
        ];
      }
    }
  }

  if (params.timezoneOffset != null) {
    if (params.timezoneOffset < -720 || params.timezoneOffset > 840) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'timezoneOffset',
          'Timezone offset should be between -720 and 840 minutes',
        ),
        {},
      ];
    }
  }

  if (params.avgMonths != null) {
    if (params.avgMonths < 1 || params.avgMonths > 12) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'avgMonths',
          'Average months should be between 1 and 12',
        ),
        {},
      ];
    }
  }

  return [true, {}];
};

// =============================================================================
// dashboardFleetSummaryGet validator
// =============================================================================

const rulesGetFleetSummary = new Checkit({
  year: [
    {
      rule: 'integer',
      message: 'Year should be an integer',
    },
  ],
  month: [
    {
      rule: 'integer',
      message: 'Month should be an integer',
    },
  ],
  timezoneOffset: [
    {
      rule: 'integer',
      message: 'Timezone offset should be an integer',
    },
  ],
});

const validateGetFleetSummary = async (args: any, opt: BaseCoreActionsInterface) => {
  const params = args?.params || {};

  try {
    await rulesGetFleetSummary.run(params);
  } catch (err: any) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    const errors = err.toJSON ? err.toJSON() : err;

    for (const field of Object.keys(errors)) {
      opResult.addError(field, errors[field]?.message || errors[field]);
    }

    return [opResult, {}];
  }

  if (params.timezoneOffset != null) {
    if (params.timezoneOffset < -720 || params.timezoneOffset > 840) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'timezoneOffset',
          'Timezone offset should be between -720 and 840 minutes',
        ),
        {},
      ];
    }
  }

  if (params.month != null) {
    if (params.month < 1 || params.month > 12) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'month',
          'Month should be between 1 and 12',
        ),
        {},
      ];
    }
  }

  if (params.year != null) {
    if (params.year < 2000 || params.year > 2100) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'year',
          'Year should be between 2000 and 2100',
        ),
        {},
      ];
    }
  }

  // Year and month must both be provided or both omitted
  if ((params.year != null) !== (params.month != null)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'year',
        'Year and month must both be provided or both omitted',
      ),
      {},
    ];
  }

  return [true, {}];
};

// =============================================================================
// Export
// =============================================================================

const validators = {
  get: validateGet,
  getFleetSummary: validateGetFleetSummary,
};

export { validators };