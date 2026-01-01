// ./src/core/validators/workflowValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  accountId: [
    {
      rule: 'array',
      message: 'Account IDs should be an array of UUIDs',
    },
  ],
  normalizedWorkflowName: [
    {
      rule: 'array',
      message: 'Normalized workflow names should be an array of strings',
    },
  ],
});

const rulesCreate = new Checkit({
  accountId: [
    {
      rule: 'required',
      message: 'Account ID is required',
    },
    {
      rule: 'uuid',
      message: 'Account ID should be a valid UUID identifier',
    },
  ],
  workflowName: [
    {
      rule: 'required',
      message: 'Workflow name is required',
    },
    {
      rule: 'string',
      message: 'Workflow name should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Workflow name should not exceed 256 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
});

const rulesUpdate = new Checkit({
  workflowName: [
    {
      rule: 'string',
      message: 'Workflow name should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Workflow name should not exceed 256 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
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
