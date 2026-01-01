// ./src/core/validators/userProfileValidators.ts
import Checkit from 'checkit';
import { BaseCoreActionsInterface, validateList, validateUpdate as validateUpdateCommon } from '@sdflc/backend-helpers';
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

const rulesUpdate = new Checkit({
  homeCurrency: [
    {
      rule: 'string',
      message: 'Home currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Home currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  distanceIn: [
    {
      rule: 'string',
      message: 'Distance unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Distance unit should not exceed 8 characters',
    },
  ],
  volumeIn: [
    {
      rule: 'string',
      message: 'Volume unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Volume unit should not exceed 8 characters',
    },
  ],
  consumptionIn: [
    {
      rule: 'string',
      message: 'Consumption unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Consumption unit should not exceed 8 characters',
    },
  ],
  notifyInMileage: [
    {
      rule: 'numeric',
      message: 'Notify in mileage should be a number',
    },
  ],
  notifyInDays: [
    {
      rule: 'integer',
      message: 'Notify in days should be an integer',
    },
  ],
});

const validateUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateUpdateCommon({ rules: rulesUpdate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  return [true, {}];
};

const validators = {
  list: validateList({ rules: rulesList }),
  update: validateUpdate,
};

export { validators };
