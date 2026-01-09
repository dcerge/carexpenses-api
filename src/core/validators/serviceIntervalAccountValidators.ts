// ./src/core/validators/serviceIntervalAccountValidators.ts
import Checkit from 'checkit';
import { BaseCoreActionsInterface, validateList as validateListCommon } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

const rulesList = new Checkit({
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
});

const rulesSet = new Checkit({
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
  intervalType: [
    {
      rule: 'required',
      message: 'Interval type is required',
    },
    {
      rule: 'integer',
      message: 'Interval type should be an integer',
    },
  ],
  mileageInterval: [
    {
      rule: 'numeric',
      message: 'Mileage interval should be a number',
    },
  ],
  daysInterval: [
    {
      rule: 'integer',
      message: 'Days interval should be an integer',
    },
  ],
});

const rulesRemove = new Checkit({
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
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, source: 'filter' | 'params' | 'where') => {
  const data = args?.[source] || {};
  const { carId, kindId } = data;
  const { accountId } = opt.core.getContext();

  const dependencies: Record<string, any> = {};

  // Check car ownership
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

  // Verify kindId exists in service_interval_defaults (only for set operation)
  if (kindId && source === 'params') {
    const defaults = await opt.core.getGateways().expenseKindGw.list({
      filter: { kindId },
    });

    if (!defaults || defaults.length === 0) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'kindId',
          'Invalid expense kind for service interval',
        ),
        {},
      ];
    }

    dependencies['defaultInterval'] = defaults[0];
  }

  return [true, dependencies];
};

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

  const [dependenciesCheck, dependencies] = await checkDependencies(args, opt, 'filter');

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateSet = async (args: any, opt: BaseCoreActionsInterface) => {
  const { params } = args || {};

  if (!params || Object.keys(params).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('', 'No params received');
    return [opResult, {}];
  }

  const [result] = rulesSet.validateSync(params);

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

  const [dependenciesCheck, dependencies] = await checkDependencies(args, opt, 'params');

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateRemove = async (args: any, opt: BaseCoreActionsInterface) => {
  const { where } = args || {};

  if (!where || Object.keys(where).length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('', 'No params received');
    return [opResult, {}];
  }

  const [result] = rulesRemove.validateSync(where);

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

  const [dependenciesCheck, dependencies] = await checkDependencies(args, opt, 'where');

  if (dependenciesCheck !== true) {
    return [dependenciesCheck, dependencies];
  }

  return [true, dependencies];
};

const validateRemoveMany = async (args: any, opt: BaseCoreActionsInterface) => {
  const { where } = args || {};

  if (!Array.isArray(where) || where.length === 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('where', 'Where clause is required and must be a non-empty array');
    return [opResult, {}];
  }

  // Validate each where item
  for (const item of where) {
    const [result] = rulesRemove.validateSync(item || {});

    if (result) {
      const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
      Object.keys(result?.errors || {}).forEach((key) => {
        const obj = result.errors[key];
        if (Array.isArray(obj.errors)) {
          obj.errors.forEach((err: any) => {
            opResult.addError(key, err.message);
          });
        } else {
          opResult.addError(key, obj.message);
        }
      });
      return [opResult, {}];
    }
  }

  // Batch verify car ownership
  const { accountId } = opt.core.getContext();
  const carIds = [...new Set(where.map((item: any) => item?.carId).filter(Boolean))];

  const cars = await opt.core.getGateways().carGw.list({ filter: { id: carIds } });
  const ownedCarIds = new Set((cars || []).filter((car: any) => car.accountId === accountId).map((car: any) => car.id));

  // Check all cars are owned
  for (const item of where) {
    if (!ownedCarIds.has(item.carId)) {
      const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
      opResult.addError('carId', 'Car not found');
      return [opResult, {}];
    }
  }

  return [true, { ownedCarIds }];
};

const validators = {
  list: validateList,
  set: validateSet,
  remove: validateRemove,
  removeMany: validateRemoveMany,
};

export { validators };
