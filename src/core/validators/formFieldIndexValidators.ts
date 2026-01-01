// ./src/core/validators/formFieldIndexValidators.ts
import Checkit from 'checkit';
import { BaseCoreActionsInterface, validateList } from '@sdflc/backend-helpers';
import { OpResult } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  accountId: [
    {
      rule: 'array',
      message: 'Account IDs should be an array of UUIDs',
    },
  ],
  formId: [
    {
      rule: 'array',
      message: 'Form IDs should be an array of UUIDs',
    },
  ],
  formFieldId: [
    {
      rule: 'array',
      message: 'Form field IDs should be an array of UUIDs',
    },
  ],
  fieldValue: [
    {
      rule: 'array',
      message: 'Field values should be an array of strings',
    },
  ],
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };
