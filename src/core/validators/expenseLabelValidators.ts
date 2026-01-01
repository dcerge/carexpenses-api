// ./src/core/validators/expenseLabelValidators.ts
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
  // accountId: [
  //   {
  //     rule: 'array',
  //     message: 'Account IDs should be an array of UUIDs',
  //   },
  // ],
  labelName: [
    {
      rule: 'array',
      message: 'Label names should be an array of strings',
    },
  ],
  normalizedName: [
    {
      rule: 'array',
      message: 'Normalized names should be an array of strings',
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
  labelName: [
    {
      rule: 'required',
      message: 'Label name is required',
    },
    {
      rule: 'string',
      message: 'Label name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Label name should not exceed 64 characters',
    },
  ],
  labelColor: [
    {
      rule: 'string',
      message: 'Label color should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Label color should not exceed 16 characters',
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  labelName: [
    {
      rule: 'string',
      message: 'Label name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Label name should not exceed 64 characters',
    },
  ],
  labelColor: [
    {
      rule: 'string',
      message: 'Label color should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Label color should not exceed 16 characters',
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
