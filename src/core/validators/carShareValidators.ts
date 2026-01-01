// ./src/core/validators/carShareValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  fromUserId: [
    {
      rule: 'array',
      message: 'From user IDs should be an array of UUIDs',
    },
  ],
  toUserId: [
    {
      rule: 'array',
      message: 'To user IDs should be an array of UUIDs',
    },
  ],
  shareRoleId: [
    {
      rule: 'array',
      message: 'Share role IDs should be an array of integers',
    },
  ],
  shareStatus: [
    {
      rule: 'array',
      message: 'Share statuses should be an array of integers',
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
  whatToShare: [
    {
      rule: 'string',
      message: 'What to share should be a string',
    },
  ],
  toUserId: [
    {
      rule: 'required',
      message: 'To user ID is required',
    },
    {
      rule: 'uuid',
      message: 'To user ID should be a valid UUID',
    },
  ],
  toUserName: [
    {
      rule: 'string',
      message: 'To user name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'To user name should not exceed 64 characters',
    },
  ],
  shareRoleId: [
    {
      rule: 'integer',
      message: 'Share role ID should be an integer',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Comments should not exceed 512 characters',
    },
  ],
});

const rulesUpdate = new Checkit({
  whatToShare: [
    {
      rule: 'string',
      message: 'What to share should be a string',
    },
  ],
  toUserName: [
    {
      rule: 'string',
      message: 'To user name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'To user name should not exceed 64 characters',
    },
  ],
  shareRoleId: [
    {
      rule: 'integer',
      message: 'Share role ID should be an integer',
    },
  ],
  shareStatus: [
    {
      rule: 'integer',
      message: 'Share status should be an integer',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Comments should not exceed 512 characters',
    },
  ],
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
