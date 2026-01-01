// ./src/core/validators/expenseExpenseTagValidators.ts
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
  expenseId: [
    {
      rule: 'array',
      message: 'Expense IDs should be an array of UUIDs',
    },
  ],
  expenseTagId: [
    {
      rule: 'array',
      message: 'Expense tag IDs should be an array of UUIDs',
    },
  ],
});

const rulesCreate = new Checkit({
  expenseId: [
    {
      rule: 'required',
      message: 'Expense ID is required',
    },
    {
      rule: 'uuid',
      message: 'Expense ID should be a valid UUID',
    },
  ],
  expenseTagId: [
    {
      rule: 'required',
      message: 'Expense tag ID is required',
    },
    {
      rule: 'uuid',
      message: 'Expense tag ID should be a valid UUID',
    },
  ],
  orderNo: [
    {
      rule: 'integer',
      message: 'Order number should be an integer',
    },
  ],
});

const rulesUpdate = new Checkit({
  orderNo: [
    {
      rule: 'integer',
      message: 'Order number should be an integer',
    },
  ],
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { expenseId, expenseTagId } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

  if (expenseId) {
    const expenseBase = await opt.core.getGateways().expenseBaseGw.get(expenseId);

    if (!expenseBase) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('expenseId', 'Expense not found'), {}];
    }

    if (expenseBase.accountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('expenseId', 'Expense not found'), {}];
    }

    dependencies['expenseBase'] = expenseBase;
  }

  if (expenseTagId) {
    const expenseTag = await opt.core.getGateways().expenseTagGw.get(expenseTagId);

    if (!expenseTag) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('expenseTagId', 'Expense tag not found'),
        {},
      ];
    }

    if (expenseTag.accountId !== accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('expenseTagId', 'Expense tag not found'),
        {},
      ];
    }

    dependencies['expenseTag'] = expenseTag;
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
