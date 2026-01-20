// ./src/core/validators/gloveboxDocTypeValidators.ts
import Checkit from 'checkit';
import { validateList } from '@sdflc/backend-helpers';

const rulesList = new Checkit({
  id: [
    {
      rule: 'array',
      message: 'IDs should be an array of integers',
    },
  ],
  code: [
    {
      rule: 'array',
      message: 'Codes should be an array of strings',
    },
  ],
  category: [
    {
      rule: 'array',
      message: 'Categories should be an array of strings',
    },
  ],
  hasExpiration: [
    {
      rule: 'boolean',
      message: 'Has expiration should be a boolean',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
    },
  ],
});

const validators = {
  list: validateList({ rules: rulesList }),
};

export { validators };