// ./src/core/validators/travelValidators.ts
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
  labelId: [
    {
      rule: 'array',
      message: 'Label IDs should be an array of UUIDs',
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
  firstOdometer: [
    {
      rule: 'numeric',
      message: 'First odometer should be a number',
    },
  ],
  lastOdometer: [
    {
      rule: 'numeric',
      message: 'Last odometer should be a number',
    },
  ],
  firstDttm: [
    {
      rule: 'string',
      message: 'First datetime should be a valid datetime string',
    },
  ],
  lastDttm: [
    {
      rule: 'string',
      message: 'Last datetime should be a valid datetime string',
    },
  ],
  labelId: [
    {
      rule: 'uuid',
      message: 'Label ID should be a valid UUID',
    },
  ],
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
  ...ruleStatus(),
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
  firstOdometer: [
    {
      rule: 'numeric',
      message: 'First odometer should be a number',
    },
  ],
  lastOdometer: [
    {
      rule: 'numeric',
      message: 'Last odometer should be a number',
    },
  ],
  firstDttm: [
    {
      rule: 'string',
      message: 'First datetime should be a valid datetime string',
    },
  ],
  lastDttm: [
    {
      rule: 'string',
      message: 'Last datetime should be a valid datetime string',
    },
  ],
  labelId: [
    {
      rule: 'uuid',
      message: 'Label ID should be a valid UUID',
    },
  ],
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
  ...ruleStatus(),
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, labelId } = args?.params || {};
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

  if (labelId) {
    const expenseLabel = await opt.core.getGateways().expenseLabelGw.get(labelId);

    if (!expenseLabel) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('labelId', 'Expense label not found'),
        {},
      ];
    }

    if (expenseLabel.accountId !== accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('labelId', 'Expense label not found'),
        {},
      ];
    }

    dependencies['expenseLabel'] = expenseLabel;
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
