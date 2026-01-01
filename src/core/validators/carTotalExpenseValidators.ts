// ./src/core/validators/carTotalExpenseValidators.ts
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
  expenseKindId: [
    {
      rule: 'array',
      message: 'Expense kind IDs should be an array of integers',
    },
  ],
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };
