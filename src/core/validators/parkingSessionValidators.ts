// ./src/core/validators/parkingSessionValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { PARKING_SESSION_STATUS } from '../../database';

// Valid statuses for parking sessions
const validStatuses = Object.values(PARKING_SESSION_STATUS);

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  travelId: [
    {
      rule: 'array',
      message: 'Travel IDs should be an array of UUIDs',
    },
  ],
  expenseId: [
    {
      rule: 'array',
      message: 'Expense IDs should be an array of UUIDs',
    },
  ],
  startedBy: [
    {
      rule: 'array',
      message: 'Started by user IDs should be an array of UUIDs',
    },
  ],
  endedBy: [
    {
      rule: 'array',
      message: 'Ended by user IDs should be an array of UUIDs',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
    },
  ],
  startTimeFrom: [
    {
      rule: 'string',
      message: 'Start time from should be a valid datetime string',
    },
  ],
  startTimeTo: [
    {
      rule: 'string',
      message: 'Start time to should be a valid datetime string',
    },
  ],
  endTimeFrom: [
    {
      rule: 'string',
      message: 'End time from should be a valid datetime string',
    },
  ],
  endTimeTo: [
    {
      rule: 'string',
      message: 'End time to should be a valid datetime string',
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
  startTime: [
    {
      rule: 'string',
      message: 'Start time should be a valid datetime string',
    },
  ],
  durationMinutes: [
    {
      rule: 'integer',
      message: 'Duration minutes should be an integer',
    },
  ],
  initialPrice: [
    {
      rule: 'numeric',
      message: 'Initial price should be a number',
    },
  ],
  finalPrice: [
    {
      rule: 'numeric',
      message: 'Final price should be a number',
    },
  ],
  currency: [
    {
      rule: 'string',
      message: 'Currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Currency should not exceed 3 characters',
    },
  ],
  latitude: [
    {
      rule: 'numeric',
      message: 'Latitude should be a number',
    },
  ],
  longitude: [
    {
      rule: 'numeric',
      message: 'Longitude should be a number',
    },
  ],
  formattedAddress: [
    {
      rule: 'string',
      message: 'Formatted address should be a string',
    },
  ],
  uploadedFileId: [
    {
      rule: 'uuid',
      message: 'Uploaded file ID should be a valid UUID',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  travelId: [
    {
      rule: 'uuid',
      message: 'Travel ID should be a valid UUID',
    },
  ],
  ...ruleStatus([PARKING_SESSION_STATUS.ACTIVE]),
});

const rulesUpdate = new Checkit({
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  startTime: [
    {
      rule: 'string',
      message: 'Start time should be a valid datetime string',
    },
  ],
  endTime: [
    {
      rule: 'string',
      message: 'End time should be a valid datetime string',
    },
  ],
  durationMinutes: [
    {
      rule: 'integer',
      message: 'Duration minutes should be an integer',
    },
  ],
  initialPrice: [
    {
      rule: 'numeric',
      message: 'Initial price should be a number',
    },
  ],
  finalPrice: [
    {
      rule: 'numeric',
      message: 'Final price should be a number',
    },
  ],
  currency: [
    {
      rule: 'string',
      message: 'Currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Currency should not exceed 3 characters',
    },
  ],
  latitude: [
    {
      rule: 'numeric',
      message: 'Latitude should be a number',
    },
  ],
  longitude: [
    {
      rule: 'numeric',
      message: 'Longitude should be a number',
    },
  ],
  formattedAddress: [
    {
      rule: 'string',
      message: 'Formatted address should be a string',
    },
  ],
  uploadedFileId: [
    {
      rule: 'uuid',
      message: 'Uploaded file ID should be a valid UUID',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  travelId: [
    {
      rule: 'uuid',
      message: 'Travel ID should be a valid UUID',
    },
  ],
  ...ruleStatus([PARKING_SESSION_STATUS.ACTIVE, PARKING_SESSION_STATUS.COMPLETED]),
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, travelId, durationMinutes, initialPrice, finalPrice, latitude, longitude, startTime, endTime } =
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
          'Cannot create parking session for a removed car',
        ),
        {},
      ];
    }

    dependencies['car'] = car;
  }

  // Validate travel exists and belongs to account
  if (travelId) {
    const travel = await opt.core.getGateways().travelGw.get(travelId);

    if (!travel) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('travelId', 'Travel not found'),
        {},
      ];
    }

    if (travel.accountId !== accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('travelId', 'Travel not found'),
        {},
      ];
    }

    dependencies['travel'] = travel;
  }

  // Validate duration is positive
  if (durationMinutes != null && durationMinutes <= 0) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'durationMinutes',
        'Duration must be a positive number of minutes',
      ),
      {},
    ];
  }

  // Validate prices are non-negative
  if (initialPrice != null && initialPrice < 0) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'initialPrice',
        'Initial price cannot be negative',
      ),
      {},
    ];
  }

  if (finalPrice != null && finalPrice < 0) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'finalPrice',
        'Final price cannot be negative',
      ),
      {},
    ];
  }

  // Validate latitude range
  if (latitude != null && (latitude < -90 || latitude > 90)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'latitude',
        'Latitude must be between -90 and 90',
      ),
      {},
    ];
  }

  // Validate longitude range
  if (longitude != null && (longitude < -180 || longitude > 180)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'longitude',
        'Longitude must be between -180 and 180',
      ),
      {},
    ];
  }

  // Validate end time is after start time
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'endTime',
          'End time must be after start time',
        ),
        {},
      ];
    }
  }

  // Validate status
  const status = args?.params?.status;

  if (status != null && !validStatuses.includes(status)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'status',
        `Status must be one of: ${validStatuses.join(', ')} (100=Active, 200=Completed)`,
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