// ./src/core/validators/carTotalSummaryValidators.ts
import Checkit from 'checkit';
import { validateList } from '@sdflc/backend-helpers';

const rulesList = new Checkit({
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
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };
