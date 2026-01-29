import Checkit from 'checkit';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

dayjs.extend(utc);

// =============================================================================
// Constants
// =============================================================================

const VALID_TRAVEL_TYPES = ['business', 'personal', 'medical', 'charity', 'commute'];

// =============================================================================
// Expense Summary Report Validators
// =============================================================================

const rulesExpenseSummary = new Checkit({
  dateFrom: [
    {
      rule: 'required',
      message: 'Date from is required',
    },
    {
      rule: 'string',
      message: 'Date from should be a string',
    },
  ],
  dateTo: [
    {
      rule: 'required',
      message: 'Date to is required',
    },
    {
      rule: 'string',
      message: 'Date to should be a string',
    },
  ],
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array',
    },
  ],
  tagId: [
    {
      rule: 'array',
      message: 'Tag IDs should be an array',
    },
  ],
});

// =============================================================================
// Yearly Report Validators
// =============================================================================

const rulesYearly = new Checkit({
  year: [
    {
      rule: 'required',
      message: 'Year is required',
    },
    {
      rule: 'integer',
      message: 'Year should be an integer',
    },
  ],
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array',
    },
  ],
});

// =============================================================================
// Travel Report Validators
// =============================================================================

const rulesTravelReport = new Checkit({
  dateFrom: [
    {
      rule: 'required',
      message: 'Date from is required',
    },
    {
      rule: 'string',
      message: 'Date from should be a string',
    },
  ],
  dateTo: [
    {
      rule: 'required',
      message: 'Date to is required',
    },
    {
      rule: 'string',
      message: 'Date to should be a string',
    },
  ],
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array',
    },
  ],
  tagId: [
    {
      rule: 'array',
      message: 'Tag IDs should be an array',
    },
  ],
  travelType: [
    {
      rule: 'array',
      message: 'Travel types should be an array',
    },
  ],
});

/**
 * Validate year range
 */
const validateYearRange = (year: number): OpResult | true => {
  const currentYear = dayjs().year();
  const minYear = 2000;
  const maxYear = currentYear + 1; // Allow next year for planning

  if (year < minYear || year > maxYear) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('year', `Year must be between ${minYear} and ${maxYear}`);
    return opResult;
  }

  return true;
};

/**
 * Validate date format and range
 */
const validateDateRange = (dateFrom: string, dateTo: string): OpResult | true => {
  const from = dayjs.utc(dateFrom);
  const to = dayjs.utc(dateTo);

  if (!from.isValid()) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('dateFrom', 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)');
    return opResult;
  }

  if (!to.isValid()) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('dateTo', 'Invalid date format. Use ISO 8601 format (e.g., 2024-12-31T23:59:59.999Z)');
    return opResult;
  }

  if (from.isAfter(to)) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('dateFrom', 'Date from must be before or equal to date to');
    return opResult;
  }

  // Optional: Limit maximum date range (e.g., 5 years)
  const maxRangeYears = 5;
  if (to.diff(from, 'year') > maxRangeYears) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('dateTo', `Date range cannot exceed ${maxRangeYears} years`);
    return opResult;
  }

  return true;
};

/**
 * Validate travel types
 */
const validateTravelTypes = (travelTypes: string[]): OpResult | true => {
  if (!travelTypes || travelTypes.length === 0) {
    return true;
  }

  const invalidTypes = travelTypes.filter((type) => !VALID_TRAVEL_TYPES.includes(type));

  if (invalidTypes.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError(
      'travelType',
      `Invalid travel type(s): ${invalidTypes.join(', ')}. Valid types are: ${VALID_TRAVEL_TYPES.join(', ')}`,
    );
    return opResult;
  }

  return true;
};

/**
 * Verify car ownership
 */
const verifyCarOwnership = async (
  carIds: string[],
  accountId: string | undefined,
  opt: BaseCoreActionsInterface,
): Promise<OpResult | true> => {
  if (!carIds || carIds.length === 0) {
    return true;
  }

  // Validate UUID format for each carId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const carId of carIds) {
    if (!uuidRegex.test(carId)) {
      const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
      opResult.addError('carId', `Invalid car ID format: ${carId}`);
      return opResult;
    }
  }

  const cars = await opt.core.getGateways().carGw.list({
    filter: { id: carIds, accountId },
  });

  const foundCarIds = new Set((cars || []).map((car: any) => car.id));
  const missingCarIds = carIds.filter((id) => !foundCarIds.has(id));

  if (missingCarIds.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('carId', 'One or more cars not found or do not belong to this account');
    return opResult;
  }

  return true;
};

/**
 * Verify tag ownership
 */
const verifyTagOwnership = async (
  tagIds: string[],
  accountId: string | undefined,
  opt: BaseCoreActionsInterface,
): Promise<OpResult | true> => {
  if (!tagIds || tagIds.length === 0) {
    return true;
  }

  // Validate UUID format for each tagId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const tagId of tagIds) {
    if (!uuidRegex.test(tagId)) {
      const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
      opResult.addError('tagId', `Invalid tag ID format: ${tagId}`);
      return opResult;
    }
  }

  const tags = await opt.core.getGateways().expenseTagGw.list({
    filter: { id: tagIds, accountId },
  });

  const foundTagIds = new Set((tags || []).map((tag: any) => tag.id));
  const missingTagIds = tagIds.filter((id) => !foundTagIds.has(id));

  if (missingTagIds.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('tagId', 'One or more tags not found or do not belong to this account');
    return opResult;
  }

  return true;
};

/**
 * Validate expense summary report filter
 */
const validateExpenseSummary = async (args: any, opt: BaseCoreActionsInterface) => {
  const { filter } = args || {};

  if (!filter || Object.keys(filter).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('filter', 'Filter is required');
    return [opResult, {}];
  }

  const { dateFrom, dateTo, carId, tagId } = filter;

  // Run Checkit validation
  const [result] = rulesExpenseSummary.validateSync(filter);

  if (result) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    Object.keys(result?.errors || {}).forEach((key) => {
      const obj = result.errors[key];
      if (Array.isArray(obj.errors)) {
        obj.errors.forEach((item: any) => {
          opResult.addError(key, item.message);
        });
      } else {
        opResult.addError(key, obj.message);
      }
    });
    return [opResult, {}];
  }

  // Validate date range
  const dateRangeResult = validateDateRange(dateFrom, dateTo);
  if (dateRangeResult !== true) {
    return [dateRangeResult, {}];
  }

  // Get account ID from context
  const { accountId } = opt.core.getContext();

  // Verify car ownership
  const carOwnershipResult = await verifyCarOwnership(carId || [], accountId, opt);
  if (carOwnershipResult !== true) {
    return [carOwnershipResult, {}];
  }

  // Verify tag ownership
  const tagOwnershipResult = await verifyTagOwnership(tagId || [], accountId, opt);
  if (tagOwnershipResult !== true) {
    return [tagOwnershipResult, {}];
  }

  // Return validated and normalized data
  const dependencies = {
    dateFrom: dayjs.utc(dateFrom).toISOString(),
    dateTo: dayjs.utc(dateTo).toISOString(),
    carIds: carId || [],
    tagIds: tagId || [],
  };

  return [true, dependencies];
};

/**
 * Validate yearly report filter
 */
const validateYearly = async (args: any, opt: BaseCoreActionsInterface) => {
  const { filter } = args || {};

  if (!filter || Object.keys(filter).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('filter', 'Filter is required');
    return [opResult, {}];
  }

  const { year, carId } = filter;

  // Run Checkit validation
  const [result] = rulesYearly.validateSync(filter);

  if (result) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    Object.keys(result?.errors || {}).forEach((key) => {
      const obj = result.errors[key];
      if (Array.isArray(obj.errors)) {
        obj.errors.forEach((item: any) => {
          opResult.addError(key, item.message);
        });
      } else {
        opResult.addError(key, obj.message);
      }
    });
    return [opResult, {}];
  }

  // Validate year range
  const yearRangeResult = validateYearRange(year);
  if (yearRangeResult !== true) {
    return [yearRangeResult, {}];
  }

  // Get account ID from context
  const { accountId } = opt.core.getContext();

  // Verify car ownership
  const carOwnershipResult = await verifyCarOwnership(carId || [], accountId, opt);
  if (carOwnershipResult !== true) {
    return [carOwnershipResult, {}];
  }

  // Return validated and normalized data
  const dependencies = {
    year,
    carIds: carId || [],
  };

  return [true, dependencies];
};

/**
 * Validate travel report filter
 */
const validateTravelReport = async (args: any, opt: BaseCoreActionsInterface) => {
  const { filter } = args || {};

  if (!filter || Object.keys(filter).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('filter', 'Filter is required');
    return [opResult, {}];
  }

  const { dateFrom, dateTo, carId, tagId, travelType } = filter;

  // Run Checkit validation
  const [result] = rulesTravelReport.validateSync(filter);

  if (result) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    Object.keys(result?.errors || {}).forEach((key) => {
      const obj = result.errors[key];
      if (Array.isArray(obj.errors)) {
        obj.errors.forEach((item: any) => {
          opResult.addError(key, item.message);
        });
      } else {
        opResult.addError(key, obj.message);
      }
    });
    return [opResult, {}];
  }

  // Validate date range
  const dateRangeResult = validateDateRange(dateFrom, dateTo);
  if (dateRangeResult !== true) {
    return [dateRangeResult, {}];
  }

  // Validate travel types
  const travelTypesResult = validateTravelTypes(travelType || []);
  if (travelTypesResult !== true) {
    return [travelTypesResult, {}];
  }

  // Get account ID from context
  const { accountId } = opt.core.getContext();

  // Verify car ownership
  const carOwnershipResult = await verifyCarOwnership(carId || [], accountId, opt);
  if (carOwnershipResult !== true) {
    return [carOwnershipResult, {}];
  }

  // Verify tag ownership
  const tagOwnershipResult = await verifyTagOwnership(tagId || [], accountId, opt);
  if (tagOwnershipResult !== true) {
    return [tagOwnershipResult, {}];
  }

  // Return validated and normalized data
  const dependencies = {
    dateFrom: dayjs.utc(dateFrom).toISOString(),
    dateTo: dayjs.utc(dateTo).toISOString(),
    carIds: carId || [],
    tagIds: tagId || [],
    travelTypes: travelType || [],
  };

  return [true, dependencies];
};

// =============================================================================
// Export all validators
// =============================================================================

const validators = {
  expenseSummary: validateExpenseSummary,
  yearly: validateYearly,
  travelReport: validateTravelReport,
  // Future reports:
  // monthlyTrend: validateMonthlyTrend,
  // fuelEfficiency: validateFuelEfficiency,
};

export { validators };