// ./src/core/validators/carMonthlySummaryValidators.ts
import Checkit from 'checkit';
import { validateList } from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  homeCurrency: [
    {
      rule: 'array',
      message: 'Home currencies should be an array of strings',
    },
  ],
  year: [
    {
      rule: 'array',
      message: 'Years should be an array of integers',
    },
  ],
  month: [
    {
      rule: 'array',
      message: 'Months should be an array of integers',
    },
  ],
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };
