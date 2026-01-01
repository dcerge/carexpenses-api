// ./src/core/validators/expenseTagValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  tagName: [
    {
      rule: 'array',
      message: 'Tag names should be an array of strings',
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
  tagName: [
    {
      rule: 'required',
      message: 'Tag name is required',
    },
    {
      rule: 'string',
      message: 'Tag name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Tag name should not exceed 64 characters',
    },
  ],
  tagColor: [
    {
      rule: 'string',
      message: 'Tag color should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Tag color should not exceed 16 characters',
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  tagName: [
    {
      rule: 'string',
      message: 'Tag name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Tag name should not exceed 64 characters',
    },
  ],
  tagColor: [
    {
      rule: 'string',
      message: 'Tag color should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Tag color should not exceed 16 characters',
    },
  ],
  ...ruleStatus(),
});

const validateCreate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateCreateCommon({ rules: rulesCreate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  return [true, {}];
};

const validateUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateUpdateCommon({ rules: rulesUpdate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  return [true, {}];
};

const validators = {
  list: validateList({ rules: rulesList }),
  create: validateCreate,
  update: validateUpdate,
};

export { validators };
