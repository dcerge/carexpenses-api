import Checkit from 'checkit';
import dayjs from 'dayjs';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus, ruleTravelStatus } from './commonRules';
import { TRAVEL_TYPES } from '../../database';

// Valid travel types for tax categorization
const validTravelTypes = Object.values(TRAVEL_TYPES);

// Valid distance/odometer units
const validDistanceUnits = ['km', 'mi'];

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
  isActive: [
    {
      rule: 'boolean',
      message: 'Is active should be a boolean',
    },
  ],
  purpose: [
    {
      rule: 'array',
      message: 'Purposes should be an array of strings',
    },
  ],
  destination: [
    {
      rule: 'array',
      message: 'Destinations should be an array of strings',
    },
  ],
  // Tax/type filters
  travelType: [
    {
      rule: 'array',
      message: 'Travel types should be an array of strings',
    },
  ],
  isRoundTrip: [
    {
      rule: 'boolean',
      message: 'Is round trip should be a boolean',
    },
  ],
  // Date range filters
  firstDttmFrom: [
    {
      rule: 'string',
      message: 'First datetime from should be a valid datetime string',
    },
  ],
  firstDttmTo: [
    {
      rule: 'string',
      message: 'First datetime to should be a valid datetime string',
    },
  ],
  lastDttmFrom: [
    {
      rule: 'string',
      message: 'Last datetime from should be a valid datetime string',
    },
  ],
  lastDttmTo: [
    {
      rule: 'string',
      message: 'Last datetime to should be a valid datetime string',
    },
  ],
  // Tag filter
  tagId: [
    {
      rule: 'array',
      message: 'Tag IDs should be an array of UUIDs',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
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
  isActive: [
    {
      rule: 'boolean',
      message: 'Is active should be a boolean',
    },
  ],
  // Distance tracking
  distance: [
    {
      rule: 'numeric',
      message: 'Distance should be a number',
    },
  ],
  distanceIn: [
    {
      rule: 'string',
      message: 'Distance unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Distance unit should not exceed 8 characters',
    },
  ],
  // Travel details
  purpose: [
    {
      rule: 'string',
      message: 'Purpose should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Purpose should not exceed 128 characters',
    },
  ],
  destination: [
    {
      rule: 'string',
      message: 'Destination should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Destination should not exceed 128 characters',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  // Tax categorization
  travelType: [
    {
      rule: 'string',
      message: 'Travel type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Travel type should not exceed 32 characters',
    },
  ],
  isRoundTrip: [
    {
      rule: 'boolean',
      message: 'Is round trip should be a boolean',
    },
  ],
  // Reimbursement tracking
  reimbursementRate: [
    {
      rule: 'numeric',
      message: 'Reimbursement rate should be a number',
    },
  ],
  reimbursementRateCurrency: [
    {
      rule: 'string',
      message: 'Reimbursement rate currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Reimbursement rate currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  // Time tracking (for profitability)
  activeMinutes: [
    {
      rule: 'integer',
      message: 'Active minutes should be an integer',
    },
  ],
  totalMinutes: [
    {
      rule: 'integer',
      message: 'Total minutes should be an integer',
    },
  ],
  // Tags
  tagIds: [
    {
      rule: 'array',
      message: 'Tag IDs should be an array of UUIDs',
    },
  ],
  ...ruleTravelStatus(),
});

const rulesUpdate = new Checkit({
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  isActive: [
    {
      rule: 'boolean',
      message: 'Is active should be a boolean',
    },
  ],
  // Distance tracking
  distance: [
    {
      rule: 'numeric',
      message: 'Distance should be a number',
    },
  ],
  distanceIn: [
    {
      rule: 'string',
      message: 'Distance unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Distance unit should not exceed 8 characters',
    },
  ],
  // Travel details
  purpose: [
    {
      rule: 'string',
      message: 'Purpose should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Purpose should not exceed 128 characters',
    },
  ],
  destination: [
    {
      rule: 'string',
      message: 'Destination should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Destination should not exceed 128 characters',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  // Tax categorization
  travelType: [
    {
      rule: 'string',
      message: 'Travel type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Travel type should not exceed 32 characters',
    },
  ],
  isRoundTrip: [
    {
      rule: 'boolean',
      message: 'Is round trip should be a boolean',
    },
  ],
  // Reimbursement tracking
  reimbursementRate: [
    {
      rule: 'numeric',
      message: 'Reimbursement rate should be a number',
    },
  ],
  reimbursementRateCurrency: [
    {
      rule: 'string',
      message: 'Reimbursement rate currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Reimbursement rate currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  // Time tracking (for profitability)
  activeMinutes: [
    {
      rule: 'integer',
      message: 'Active minutes should be an integer',
    },
  ],
  totalMinutes: [
    {
      rule: 'integer',
      message: 'Total minutes should be an integer',
    },
  ],
  // Tags
  tagIds: [
    {
      rule: 'array',
      message: 'Tag IDs should be an array of UUIDs',
    },
  ],
  ...ruleTravelStatus(),
});

/**
 * Validate a datetime string
 * @returns true if valid, error message if invalid
 */
const validateDatetime = (value: string, fieldName: string): true | string => {
  if (!value) {
    return true; // Empty is OK, not required
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return `${fieldName} is not a valid datetime`;
  }

  // Check for reasonable date range (not before 1900, not more than 10 years in future)
  const year = parsed.year();
  const currentYear = dayjs().year();

  if (year < 1900) {
    return `${fieldName} year cannot be before 1900`;
  }

  if (year > currentYear + 10) {
    return `${fieldName} year cannot be more than 10 years in the future`;
  }

  return true;
};

/**
 * Validate odometer value
 * @returns true if valid, error message if invalid
 */
const validateOdometer = (value: number | null | undefined, fieldName: string): true | string => {
  if (value == null) {
    return true; // Empty is OK, not required
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return `${fieldName} should be a number`;
  }

  if (value < 0) {
    return `${fieldName} cannot be negative`;
  }

  // Reasonable max: 2 million km/mi (most vehicles won't exceed this)
  if (value > 2000000) {
    return `${fieldName} value seems unreasonably high`;
  }

  return true;
};

/**
 * Validate nested firstRecord input
 */
const validateFirstRecord = (firstRecord: any): OpResult | true => {
  if (!firstRecord) {
    return true;
  }

  const errors: Array<{ field: string; message: string }> = [];

  // Validate odometer
  const odometerCheck = validateOdometer(firstRecord.odometer, 'First record odometer');
  if (odometerCheck !== true) {
    errors.push({ field: 'firstRecord.odometer', message: odometerCheck });
  }

  // Validate whenDone
  const whenDoneCheck = validateDatetime(firstRecord.whenDone, 'First record date/time');
  if (whenDoneCheck !== true) {
    errors.push({ field: 'firstRecord.whenDone', message: whenDoneCheck });
  }

  // Validate location length
  if (firstRecord.location && firstRecord.location.length > 128) {
    errors.push({ field: 'firstRecord.location', message: 'First record location should not exceed 128 characters' });
  }

  // Validate whereDone length
  if (firstRecord.whereDone && firstRecord.whereDone.length > 128) {
    errors.push({ field: 'firstRecord.whereDone', message: 'First record place should not exceed 128 characters' });
  }

  // Validate pointType
  if (firstRecord.pointType) {
    const validPointTypes = ['home', 'office', 'client', 'other'];
    if (!validPointTypes.includes(firstRecord.pointType)) {
      errors.push({
        field: 'firstRecord.pointType',
        message: `First record point type must be one of: ${validPointTypes.join(', ')}`,
      });
    }
  }

  if (errors.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    errors.forEach((err) => opResult.addError(err.field, err.message));
    return opResult;
  }

  return true;
};

/**
 * Validate nested lastRecord input
 */
const validateLastRecord = (lastRecord: any): OpResult | true => {
  if (!lastRecord) {
    return true;
  }

  const errors: Array<{ field: string; message: string }> = [];

  // Validate odometer
  const odometerCheck = validateOdometer(lastRecord.odometer, 'Last record odometer');
  if (odometerCheck !== true) {
    errors.push({ field: 'lastRecord.odometer', message: odometerCheck });
  }

  // Validate whenDone
  const whenDoneCheck = validateDatetime(lastRecord.whenDone, 'Last record date/time');
  if (whenDoneCheck !== true) {
    errors.push({ field: 'lastRecord.whenDone', message: whenDoneCheck });
  }

  // Validate location length
  if (lastRecord.location && lastRecord.location.length > 128) {
    errors.push({ field: 'lastRecord.location', message: 'Last record location should not exceed 128 characters' });
  }

  // Validate whereDone length
  if (lastRecord.whereDone && lastRecord.whereDone.length > 128) {
    errors.push({ field: 'lastRecord.whereDone', message: 'Last record place should not exceed 128 characters' });
  }

  // Validate pointType
  if (lastRecord.pointType) {
    const validPointTypes = ['home', 'office', 'client', 'other'];
    if (!validPointTypes.includes(lastRecord.pointType)) {
      errors.push({
        field: 'lastRecord.pointType',
        message: `Last record point type must be one of: ${validPointTypes.join(', ')}`,
      });
    }
  }

  if (errors.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    errors.forEach((err) => opResult.addError(err.field, err.message));
    return opResult;
  }

  return true;
};

/**
 * Validate consistency between firstRecord and lastRecord
 */
const validateRecordsConsistency = (
  firstRecord: any,
  lastRecord: any,
  existingTravel?: any,
): OpResult | true => {
  const errors: Array<{ field: string; message: string }> = [];

  // Get odometer values (from input or existing travel)
  const firstOdometer = firstRecord?.odometer ?? existingTravel?.firstOdometer;
  const lastOdometer = lastRecord?.odometer ?? existingTravel?.lastOdometer;

  // Get datetime values (from input or existing travel)
  const firstDttm = firstRecord?.whenDone ?? existingTravel?.firstDttm;
  const lastDttm = lastRecord?.whenDone ?? existingTravel?.lastDttm;

  // Validate: lastOdometer >= firstOdometer
  if (firstOdometer != null && lastOdometer != null) {
    if (lastOdometer < firstOdometer) {
      errors.push({
        field: 'lastRecord.odometer',
        message: `Last odometer (${lastOdometer}) cannot be less than first odometer (${firstOdometer})`,
      });
    }
  }

  // Validate: lastDttm >= firstDttm
  if (firstDttm && lastDttm) {
    const firstDate = dayjs(firstDttm);
    const lastDate = dayjs(lastDttm);

    if (firstDate.isValid() && lastDate.isValid()) {
      if (lastDate.isBefore(firstDate)) {
        errors.push({
          field: 'lastRecord.whenDone',
          message: 'Last record date/time cannot be before first record date/time',
        });
      }
    }
  }

  if (errors.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    errors.forEach((err) => opResult.addError(err.field, err.message));
    return opResult;
  }

  return true;
};

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, travelType, distanceIn, tagIds, firstRecord, lastRecord } = args?.params || {};
  const { where } = args || {};
  const { accountId } = opt.core.getContext();

  const dependencies: any = {};

  // Validate car exists and belongs to account
  if (carId) {
    const car = await opt.core.getGateways().carGw.get(carId);

    if (!car) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    if (car.accountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    dependencies['car'] = car;
  }

  // Validate travel type
  if (travelType) {
    if (!validTravelTypes.includes(travelType)) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'travelType',
          `Travel type must be one of: ${validTravelTypes.join(', ')}`,
        ),
        {},
      ];
    }
  }

  // Validate distance unit
  if (distanceIn) {
    if (!validDistanceUnits.includes(distanceIn)) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'distanceIn',
          `Distance unit must be one of: ${validDistanceUnits.join(', ')}`,
        ),
        {},
      ];
    }
  }

  // Validate firstRecord
  const firstRecordValidation = validateFirstRecord(firstRecord);
  if (firstRecordValidation !== true) {
    return [firstRecordValidation, {}];
  }

  // Validate lastRecord
  const lastRecordValidation = validateLastRecord(lastRecord);
  if (lastRecordValidation !== true) {
    return [lastRecordValidation, {}];
  }

  // For updates, get existing travel for consistency checks
  let existingTravel: any = null;
  if (isUpdate && where?.id) {
    existingTravel = await opt.core.getGateways().travelGw.get(where.id);

    if (existingTravel && existingTravel.accountId !== accountId) {
      existingTravel = null; // Not accessible
    }

    dependencies['existingTravel'] = existingTravel;
  }

  // Validate consistency between first and last records
  const consistencyValidation = validateRecordsConsistency(firstRecord, lastRecord, existingTravel);
  if (consistencyValidation !== true) {
    return [consistencyValidation, {}];
  }

  // Validate tags exist and belong to the account
  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    const existingTags = await opt.core.getGateways().expenseTagGw.list({
      id: tagIds,
      accountId,
    });

    const existingTagIds = existingTags.map((t: any) => t.id);
    const invalidTags = tagIds.filter((tagId: string) => !existingTagIds.includes(tagId));

    if (invalidTags.length > 0) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'tagIds',
          `Invalid tag IDs: ${invalidTags.join(', ')}`,
        ),
        {},
      ];
    }

    dependencies['tags'] = existingTags;
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