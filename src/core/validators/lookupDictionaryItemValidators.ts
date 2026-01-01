// ./src/core/validators/lookupDictionaryItemValidators.ts
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
  lookupDictionaryId: [
    {
      rule: 'array',
      message: 'Lookup dictionary IDs should be an array of UUIDs',
    },
  ],
  checkValue: [
    {
      rule: 'array',
      message: 'Check values should be an array of strings',
    },
  ],
  filter1: [
    {
      rule: 'array',
      message: 'Filter 1 values should be an array of strings',
    },
  ],
  filter2: [
    {
      rule: 'array',
      message: 'Filter 2 values should be an array of strings',
    },
  ],
});

const rulesCreate = new Checkit({
  lookupDictionaryId: [
    {
      rule: 'required',
      message: 'Lookup dictionary ID is required',
    },
    {
      rule: 'uuid',
      message: 'Lookup dictionary ID should be a valid UUID identifier',
    },
  ],
  checkValue: [
    {
      rule: 'required',
      message: 'Check value is required',
    },
    {
      rule: 'string',
      message: 'Check value should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Check value should not exceed 512 characters',
    },
  ],
  filter1: [
    {
      rule: 'string',
      message: 'Filter 1 should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Filter 1 should not exceed 512 characters',
    },
  ],
  filter2: [
    {
      rule: 'string',
      message: 'Filter 2 should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Filter 2 should not exceed 512 characters',
    },
  ],
  expiresAt: [
    {
      rule: 'string',
      message: 'Expires at should be a valid datetime string',
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
  checkValue: [
    {
      rule: 'string',
      message: 'Check value should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Check value should not exceed 512 characters',
    },
  ],
  filter1: [
    {
      rule: 'string',
      message: 'Filter 1 should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Filter 1 should not exceed 512 characters',
    },
  ],
  filter2: [
    {
      rule: 'string',
      message: 'Filter 2 should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Filter 2 should not exceed 512 characters',
    },
  ],
  expiresAt: [
    {
      rule: 'string',
      message: 'Expires at should be a valid datetime string',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { lookupDictionaryId } = args?.params || {};

  const dependencies = {};

  if (lookupDictionaryId) {
    const lookupDictionary = await opt.core.getGateways().lookupDictionaryGw.get(lookupDictionaryId);

    if (!lookupDictionary) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'lookupDictionaryId',
          'Lookup dictionary not found',
        ),
        {},
      ];
    }

    dependencies['lookupDictionary'] = lookupDictionary;
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
