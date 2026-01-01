// ./src/core/validators/queuedTaskValidators.ts
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
  userId: [
    {
      rule: 'array',
      message: 'User IDs should be an array of UUIDs',
    },
  ],
  taskType: [
    {
      rule: 'array',
      message: 'Task types should be an array of integers',
    },
  ],
  taskStatus: [
    {
      rule: 'array',
      message: 'Task statuses should be an array of integers',
    },
  ],
});

const rulesCreate = new Checkit({
  taskType: [
    {
      rule: 'required',
      message: 'Task type is required',
    },
    {
      rule: 'integer',
      message: 'Task type should be an integer',
    },
  ],
  taskInfo: [
    {
      rule: 'string',
      message: 'Task info should be a string',
    },
  ],
});

const rulesUpdate = new Checkit({
  taskStatus: [
    {
      rule: 'integer',
      message: 'Task status should be an integer',
    },
  ],
  taskInfo: [
    {
      rule: 'string',
      message: 'Task info should be a string',
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
