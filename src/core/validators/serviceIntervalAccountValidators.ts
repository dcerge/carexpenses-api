// ./src/core/validators/serviceIntervalAccountValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
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
  intervalType: [
    {
      rule: 'array',
      message: 'Interval types should be an array of integers',
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
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  kindId: [
    {
      rule: 'integer',
      message: 'Kind ID should be an integer',
    },
  ],
  intervalType: [
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
  ...ruleStatus(),
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

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
