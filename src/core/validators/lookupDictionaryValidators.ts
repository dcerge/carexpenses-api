// ./src/core/validators/lookupDictionaryValidators.ts
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
  normalizedName: [
    {
      rule: 'array',
      message: 'Normalized names should be an array of strings',
    },
  ],
});

const rulesCreate = new Checkit({
  name: [
    {
      rule: 'required',
      message: 'Lookup dictionary name is required',
    },
    {
      rule: 'string',
      message: 'Lookup dictionary name should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Lookup dictionary name should not exceed 256 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
  externalUrl: [
    {
      rule: 'string',
      message: 'External URL should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'External URL should not exceed 512 characters',
    },
  ],
  externalConfig: [
    {
      rule: 'string',
      message: 'External config should be a string',
    },
  ],
});

const rulesUpdate = new Checkit({
  name: [
    {
      rule: 'string',
      message: 'Lookup dictionary name should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Lookup dictionary name should not exceed 256 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
  externalUrl: [
    {
      rule: 'string',
      message: 'External URL should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'External URL should not exceed 512 characters',
    },
  ],
  externalConfig: [
    {
      rule: 'string',
      message: 'External config should be a string',
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
