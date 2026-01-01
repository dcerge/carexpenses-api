// ./src/core/validators/formStatsValidators.ts
import Checkit from 'checkit';
import { validateList } from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  accountId: [
    {
      rule: 'array',
      message: 'Account IDs should be an array of UUIDs',
    },
  ],
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };
