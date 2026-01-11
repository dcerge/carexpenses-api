// ./src/core/validators/serviceIntervalNextValidators.ts
import Checkit from 'checkit';
import { BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

// =============================================================================
// Validation Rules
// =============================================================================

const rulesList = new Checkit({
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array',
    },
  ],
  kindId: [
    {
      rule: 'array',
      message: 'Kind IDs should be an array of integers',
    },
  ],
  intervalType: [
    {
      rule: 'array',
      message: 'Interval types should be an array of integers',
    },
  ],
  urgencyStatus: [
    {
      rule: 'array',
      message: 'Urgency statuses should be an array of strings',
    },
  ],
});

const rulesGet = new Checkit({
  id: [
    {
      rule: 'required',
      message: 'ID is required',
    },
    {
      rule: 'uuid',
      message: 'ID should be a valid UUID',
    },
  ],
});

const rulesUpdateWhere = new Checkit({
  id: [
    {
      rule: 'required',
      message: 'ID is required',
    },
    {
      rule: 'uuid',
      message: 'ID should be a valid UUID',
    },
  ],
});

const rulesUpdateParams = new Checkit({
  nextWhenDo: [
    {
      rule: 'string',
      message: 'Next when do should be a valid date string',
    },
  ],
  nextOdometer: [
    {
      rule: 'numeric',
      message: 'Next odometer should be a number',
    },
  ],
});

// =============================================================================
// Dependency Checks
// =============================================================================

const checkDependenciesForList = async (args: any, opt: BaseCoreActionsInterface) => {
  const { filter } = args || {};
  const { carId, urgencyStatus } = filter || {};
  const { accountId } = opt.core.getContext();

  const dependencies: Record<string, any> = {};

  // Validate urgency status values if provided
  if (urgencyStatus) {
    const validStatuses = ['overdue', 'due_soon', 'upcoming', 'ok'];
    const statusArray = Array.isArray(urgencyStatus) ? urgencyStatus : [urgencyStatus];

    for (const status of statusArray) {
      if (!validStatuses.includes(status)) {
        return [
          new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
            'urgencyStatus',
            `Invalid urgency status: ${status}. Valid values are: ${validStatuses.join(', ')}`,
          ),
          {},
        ];
      }
    }
  }

  // If carId is provided, verify ownership
  if (carId) {
    const carIds = Array.isArray(carId) ? carId : [carId];

    const cars = await opt.core.getGateways().carGw.list({ filter: { id: carIds } });
    const ownedCarIds = new Set(
      (cars || []).filter((car: any) => car.accountId === accountId).map((car: any) => car.id),
    );

    // Check all provided car IDs are owned by the user
    for (const id of carIds) {
      if (!ownedCarIds.has(id)) {
        return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
      }
    }

    dependencies['ownedCarIds'] = ownedCarIds;
    dependencies['cars'] = cars;
  }

  return [true, dependencies];
};

const checkDependenciesForGet = async (args: any, opt: BaseCoreActionsInterface) => {
  const { id } = args || {};
  const { accountId } = opt.core.getContext();

  const dependencies: Record<string, any> = {};

  // Fetch the record with security filter through cars
  const records = await opt.core.getGateways().serviceIntervalNextGw.list({
    filter: { id, accountId },
  });

  if (!records || records.length === 0) {
    return [new OpResult({ code: OP_RESULT_CODES.NOT_FOUND }).addError('id', 'Service interval not found'), {}];
  }

  dependencies['record'] = records[0];

  return [true, dependencies];
};

const checkDependenciesForGetMany = async (args: any, opt: BaseCoreActionsInterface) => {
  const { ids } = args || {};
  const { accountId } = opt.core.getContext();

  const dependencies: Record<string, any> = {};

  if (!ids || ids.length === 0) {
    dependencies['records'] = [];
    return [true, dependencies];
  }

  // Validate each ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const id of ids) {
    if (!uuidRegex.test(id)) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('ids', `Invalid UUID: ${id}`), {}];
    }
  }

  // Fetch records with security filter
  const records = await opt.core.getGateways().serviceIntervalNextGw.list({
    filter: { id: ids, accountId },
  });

  // Check all IDs were found
  const foundIds = new Set((records || []).map((r: any) => r.id));
  for (const id of ids) {
    if (!foundIds.has(id)) {
      return [
        new OpResult({ code: OP_RESULT_CODES.NOT_FOUND }).addError('ids', `Service interval with id ${id} not found`),
        {},
      ];
    }
  }

  dependencies['records'] = records;

  return [true, dependencies];
};

const checkDependenciesForUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const { where, params } = args || {};
  const { id } = where || {};
  const { nextWhenDo, nextOdometer } = params || {};
  const { accountId } = opt.core.getContext();

  const dependencies: Record<string, any> = {};

  // Verify record exists and belongs to user's car
  const records = await opt.core.getGateways().serviceIntervalNextGw.list({
    filter: { id, accountId },
  });

  if (!records || records.length === 0) {
    return [new OpResult({ code: OP_RESULT_CODES.NOT_FOUND }).addError('id', 'Service interval not found'), {}];
  }

  dependencies['record'] = records[0];

  // Validate nextWhenDo is a valid date if provided
  if (nextWhenDo !== undefined && nextWhenDo !== null) {
    const date = new Date(nextWhenDo);
    if (isNaN(date.getTime())) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('nextWhenDo', 'Invalid date format'),
        {},
      ];
    }
  }

  // Validate nextOdometer is positive if provided
  if (nextOdometer !== undefined && nextOdometer !== null && nextOdometer < 0) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'nextOdometer',
        'Next odometer must be a positive number',
      ),
      {},
    ];
  }

  return [true, dependencies];
};

// =============================================================================
// Validators
// =============================================================================

const validateList = async (args: any, opt: BaseCoreActionsInterface) => {
  const { filter } = args || {};

  const [result] = rulesList.validateSync(filter || {});

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

  const [dependenciesCheck, dependencies] = await checkDependenciesForList(args, opt);

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateGet = async (args: any, opt: BaseCoreActionsInterface) => {
  const [result] = rulesGet.validateSync(args || {});

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

  const [dependenciesCheck, dependencies] = await checkDependenciesForGet(args, opt);

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateGetMany = async (args: any, opt: BaseCoreActionsInterface) => {
  const { ids } = args || {};

  if (!ids) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('ids', 'IDs are required');
    return [opResult, {}];
  }

  if (!Array.isArray(ids)) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('ids', 'IDs should be an array');
    return [opResult, {}];
  }

  const [dependenciesCheck, dependencies] = await checkDependenciesForGetMany(args, opt);

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const { where, params } = args || {};

  // Validate where clause
  if (!where || Object.keys(where).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('where', 'Where clause is required');
    return [opResult, {}];
  }

  const [whereResult] = rulesUpdateWhere.validateSync(where);

  if (whereResult) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    Object.keys(whereResult?.errors || {}).forEach((key) => {
      const obj = whereResult.errors[key];
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

  // Validate params
  if (!params || Object.keys(params).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('params', 'Update parameters are required');
    return [opResult, {}];
  }

  // Check at least one valid update field is provided
  const { nextWhenDo, nextOdometer } = params;
  if (nextWhenDo === undefined && nextOdometer === undefined) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('params', 'At least one of nextWhenDo or nextOdometer is required');
    return [opResult, {}];
  }

  const [paramsResult] = rulesUpdateParams.validateSync(params);

  if (paramsResult) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    Object.keys(paramsResult?.errors || {}).forEach((key) => {
      const obj = paramsResult.errors[key];
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

  const [dependenciesCheck, dependencies] = await checkDependenciesForUpdate(args, opt);

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

// =============================================================================
// Export
// =============================================================================

const validators = {
  list: validateList,
  get: validateGet,
  getMany: validateGetMany,
  update: validateUpdate,
};

export { validators };
