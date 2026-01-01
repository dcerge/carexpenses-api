// ./src/core/validators/smsHistoryItemValidators.ts
import Checkit from 'checkit';
import { validateList } from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  sid: [
    {
      rule: 'array',
      message: 'SIDs should be an array of strings',
    },
  ],
  direction: [
    {
      rule: 'array',
      message: 'Directions should be an array of integers',
    },
  ],
  fromNumber: [
    {
      rule: 'array',
      message: 'From numbers should be an array of strings',
    },
  ],
  toNumber: [
    {
      rule: 'array',
      message: 'To numbers should be an array of strings',
    },
  ],
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };
