// ./src/core/validators/carMonthlyExpenseValidators.ts
import Checkit from 'checkit';
import { validateList } from '@sdflc/backend-helpers';

const rulesList = new Checkit({
  carMonthlySummaryId: [
    {
      rule: 'array',
      message: 'Car monthly summary IDs should be an array of UUIDs',
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
