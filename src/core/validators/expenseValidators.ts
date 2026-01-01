// ./src/core/validators/expenseValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  userId: [
    {
      rule: 'array',
      message: 'User IDs should be an array of UUIDs',
    },
  ],
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  expenseType: [
    {
      rule: 'array',
      message: 'Expense types should be an array of integers',
    },
  ],
  kindId: [
    {
      rule: 'array',
      message: 'Kind IDs should be an array of integers',
    },
  ],
  labelId: [
    {
      rule: 'array',
      message: 'Label IDs should be an array of UUIDs',
    },
  ],
  travelId: [
    {
      rule: 'array',
      message: 'Travel IDs should be an array of UUIDs',
    },
  ],
  isFullTank: [
    {
      rule: 'boolean',
      message: 'Is full tank should be a boolean',
    },
  ],
  fuelGrade: [
    {
      rule: 'array',
      message: 'Fuel grades should be an array of strings',
    },
  ],
  whenDoneFrom: [
    {
      rule: 'string',
      message: 'When done from should be a valid datetime string',
    },
  ],
  whenDoneTo: [
    {
      rule: 'string',
      message: 'When done to should be a valid datetime string',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
    },
  ],
});

const rulesCreate = new Checkit({
  carId: [
    {
      rule: 'required',
      message: 'Car ID is required',
    },
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  expenseType: [
    {
      rule: 'required',
      message: 'Expense type is required',
    },
    {
      rule: 'integer',
      message: 'Expense type should be an integer',
    },
  ],
  // Common fields (expense_bases)
  odometer: [
    {
      rule: 'numeric',
      message: 'Odometer should be a number',
    },
  ],
  tripMeter: [
    {
      rule: 'numeric',
      message: 'Trip meter should be a number',
    },
  ],
  whenDone: [
    {
      rule: 'required',
      message: 'When done is required',
    },
    {
      rule: 'string',
      message: 'When done should be a valid datetime string',
    },
  ],
  location: [
    {
      rule: 'string',
      message: 'Location should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Location should not exceed 128 characters',
    },
  ],
  whereDone: [
    {
      rule: 'string',
      message: 'Where done should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Where done should not exceed 128 characters',
    },
  ],
  subtotal: [
    {
      rule: 'numeric',
      message: 'Subtotal should be a number',
    },
  ],
  tax: [
    {
      rule: 'numeric',
      message: 'Tax should be a number',
    },
  ],
  fees: [
    {
      rule: 'numeric',
      message: 'Fees should be a number',
    },
  ],
  totalPrice: [
    {
      rule: 'numeric',
      message: 'Total price should be a number',
    },
  ],
  paidInCurrency: [
    {
      rule: 'string',
      message: 'Paid in currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Paid in currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  totalPriceInHc: [
    {
      rule: 'numeric',
      message: 'Total price in home currency should be a number',
    },
  ],
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
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  fuelInTank: [
    {
      rule: 'numeric',
      message: 'Fuel in tank should be a number',
    },
  ],
  labelId: [
    {
      rule: 'uuid',
      message: 'Label ID should be a valid UUID',
    },
  ],
  travelId: [
    {
      rule: 'uuid',
      message: 'Travel ID should be a valid UUID',
    },
  ],
  // Expense-specific fields (expenseType = 2)
  kindId: [
    {
      rule: 'integer',
      message: 'Kind ID should be an integer',
    },
  ],
  costWork: [
    {
      rule: 'numeric',
      message: 'Cost of work should be a number',
    },
  ],
  costParts: [
    {
      rule: 'numeric',
      message: 'Cost of parts should be a number',
    },
  ],
  costWorkHc: [
    {
      rule: 'numeric',
      message: 'Cost of work in home currency should be a number',
    },
  ],
  costPartsHc: [
    {
      rule: 'numeric',
      message: 'Cost of parts in home currency should be a number',
    },
  ],
  shortNote: [
    {
      rule: 'string',
      message: 'Short note should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Short note should not exceed 128 characters',
    },
  ],
  // Refuel-specific fields (expenseType = 1)
  refuelVolume: [
    {
      rule: 'numeric',
      message: 'Refuel volume should be a number',
    },
  ],
  volumeEnteredIn: [
    {
      rule: 'string',
      message: 'Volume entered in should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Volume entered in should not exceed 8 characters',
    },
  ],
  pricePerVolume: [
    {
      rule: 'numeric',
      message: 'Price per volume should be a number',
    },
  ],
  isFullTank: [
    {
      rule: 'boolean',
      message: 'Is full tank should be a boolean',
    },
  ],
  remainingInTankBefore: [
    {
      rule: 'numeric',
      message: 'Remaining in tank before should be a number',
    },
  ],
  fuelGrade: [
    {
      rule: 'string',
      message: 'Fuel grade should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Fuel grade should not exceed 16 characters',
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  expenseType: [
    {
      rule: 'integer',
      message: 'Expense type should be an integer',
    },
  ],
  // Common fields (expense_bases)
  odometer: [
    {
      rule: 'numeric',
      message: 'Odometer should be a number',
    },
  ],
  tripMeter: [
    {
      rule: 'numeric',
      message: 'Trip meter should be a number',
    },
  ],
  whenDone: [
    {
      rule: 'string',
      message: 'When done should be a valid datetime string',
    },
  ],
  location: [
    {
      rule: 'string',
      message: 'Location should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Location should not exceed 128 characters',
    },
  ],
  whereDone: [
    {
      rule: 'string',
      message: 'Where done should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Where done should not exceed 128 characters',
    },
  ],
  subtotal: [
    {
      rule: 'numeric',
      message: 'Subtotal should be a number',
    },
  ],
  tax: [
    {
      rule: 'numeric',
      message: 'Tax should be a number',
    },
  ],
  fees: [
    {
      rule: 'numeric',
      message: 'Fees should be a number',
    },
  ],
  totalPrice: [
    {
      rule: 'numeric',
      message: 'Total price should be a number',
    },
  ],
  paidInCurrency: [
    {
      rule: 'string',
      message: 'Paid in currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Paid in currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  totalPriceInHc: [
    {
      rule: 'numeric',
      message: 'Total price in home currency should be a number',
    },
  ],
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
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  fuelInTank: [
    {
      rule: 'numeric',
      message: 'Fuel in tank should be a number',
    },
  ],
  labelId: [
    {
      rule: 'uuid',
      message: 'Label ID should be a valid UUID',
    },
  ],
  travelId: [
    {
      rule: 'uuid',
      message: 'Travel ID should be a valid UUID',
    },
  ],
  // Expense-specific fields (expenseType = 2)
  kindId: [
    {
      rule: 'integer',
      message: 'Kind ID should be an integer',
    },
  ],
  costWork: [
    {
      rule: 'numeric',
      message: 'Cost of work should be a number',
    },
  ],
  costParts: [
    {
      rule: 'numeric',
      message: 'Cost of parts should be a number',
    },
  ],
  costWorkHc: [
    {
      rule: 'numeric',
      message: 'Cost of work in home currency should be a number',
    },
  ],
  costPartsHc: [
    {
      rule: 'numeric',
      message: 'Cost of parts in home currency should be a number',
    },
  ],
  shortNote: [
    {
      rule: 'string',
      message: 'Short note should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Short note should not exceed 128 characters',
    },
  ],
  // Refuel-specific fields (expenseType = 1)
  refuelVolume: [
    {
      rule: 'numeric',
      message: 'Refuel volume should be a number',
    },
  ],
  volumeEnteredIn: [
    {
      rule: 'string',
      message: 'Volume entered in should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Volume entered in should not exceed 8 characters',
    },
  ],
  pricePerVolume: [
    {
      rule: 'numeric',
      message: 'Price per volume should be a number',
    },
  ],
  isFullTank: [
    {
      rule: 'boolean',
      message: 'Is full tank should be a boolean',
    },
  ],
  remainingInTankBefore: [
    {
      rule: 'numeric',
      message: 'Remaining in tank before should be a number',
    },
  ],
  fuelGrade: [
    {
      rule: 'string',
      message: 'Fuel grade should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Fuel grade should not exceed 16 characters',
    },
  ],
  ...ruleStatus(),
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, labelId, travelId } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

  if (carId) {
    const car = await opt.core.getGateways().carGw.get(carId);

    if (!car) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    if (car.accountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    dependencies['car'] = car;
  }

  if (labelId) {
    const expenseLabel = await opt.core.getGateways().expenseLabelGw.get(labelId);

    if (!expenseLabel) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('labelId', 'Expense label not found'),
        {},
      ];
    }

    if (expenseLabel.accountId !== accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('labelId', 'Expense label not found'),
        {},
      ];
    }

    dependencies['expenseLabel'] = expenseLabel;
  }

  if (travelId) {
    const travel = await opt.core.getGateways().travelGw.get(travelId);

    if (!travel) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('travelId', 'Travel not found'), {}];
    }

    if (travel.accountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('travelId', 'Travel not found'), {}];
    }

    dependencies['travel'] = travel;
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
