// ./src/core/validators/carValidators.ts
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
  label: [
    {
      rule: 'array',
      message: 'Labels should be an array of strings',
    },
  ],
  make: [
    {
      rule: 'array',
      message: 'Makes should be an array of strings',
    },
  ],
  model: [
    {
      rule: 'array',
      message: 'Models should be an array of strings',
    },
  ],
  bodyTypeId: [
    {
      rule: 'array',
      message: 'Body type IDs should be an array of integers',
    },
  ],
  transmissionTypeId: [
    {
      rule: 'array',
      message: 'Transmission type IDs should be an array of integers',
    },
  ],
  engineTypeId: [
    {
      rule: 'array',
      message: 'Engine type IDs should be an array of integers',
    },
  ],
  makeId: [
    {
      rule: 'array',
      message: 'Make IDs should be an array of integers',
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
  label: [
    {
      rule: 'required',
      message: 'Car label is required',
    },
    {
      rule: 'string',
      message: 'Car label should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Car label should not exceed 32 characters',
    },
  ],
  vin: [
    {
      rule: 'string',
      message: 'VIN should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'VIN should not exceed 32 characters',
    },
  ],
  make: [
    {
      rule: 'string',
      message: 'Make should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Make should not exceed 32 characters',
    },
  ],
  model: [
    {
      rule: 'string',
      message: 'Model should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Model should not exceed 32 characters',
    },
  ],
  color: [
    {
      rule: 'string',
      message: 'Color should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Color should not exceed 32 characters',
    },
  ],
  bodyType: [
    {
      rule: 'string',
      message: 'Body type should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Body type should not exceed 16 characters',
    },
  ],
  transmission: [
    {
      rule: 'string',
      message: 'Transmission should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Transmission should not exceed 16 characters',
    },
  ],
  engineVolume: [
    {
      rule: 'integer',
      message: 'Engine volume should be an integer',
    },
  ],
  manufacturedIn: [
    {
      rule: 'integer',
      message: 'Manufactured year should be an integer',
    },
  ],
  mileageIn: [
    {
      rule: 'string',
      message: 'Mileage unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Mileage unit should not exceed 8 characters',
    },
  ],
  initialMileage: [
    {
      rule: 'integer',
      message: 'Initial mileage should be an integer',
    },
  ],
  typeOfFuel: [
    {
      rule: 'string',
      message: 'Type of fuel should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Type of fuel should not exceed 16 characters',
    },
  ],
  tankVolume: [
    {
      rule: 'integer',
      message: 'Tank volume should be an integer',
    },
  ],
  additionalTankVolume: [
    {
      rule: 'integer',
      message: 'Additional tank volume should be an integer',
    },
  ],
  whenBought: [
    {
      rule: 'string',
      message: 'When bought should be a valid datetime string',
    },
  ],
  boughtFor: [
    {
      rule: 'numeric',
      message: 'Bought for should be a number',
    },
  ],
  boughtForCurrency: [
    {
      rule: 'string',
      message: 'Bought for currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Bought for currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  boughtFrom: [
    {
      rule: 'string',
      message: 'Bought from should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Bought from should not exceed 64 characters',
    },
  ],
  whenSold: [
    {
      rule: 'string',
      message: 'When sold should be a valid datetime string',
    },
  ],
  soldFor: [
    {
      rule: 'numeric',
      message: 'Sold for should be a number',
    },
  ],
  soldForCurrency: [
    {
      rule: 'string',
      message: 'Sold for currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Sold for currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  soldTo: [
    {
      rule: 'string',
      message: 'Sold to should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Sold to should not exceed 64 characters',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  bodyTypeId: [
    {
      rule: 'integer',
      message: 'Body type ID should be an integer',
    },
  ],
  transmissionTypeId: [
    {
      rule: 'integer',
      message: 'Transmission type ID should be an integer',
    },
  ],
  engineTypeId: [
    {
      rule: 'integer',
      message: 'Engine type ID should be an integer',
    },
  ],
  makeId: [
    {
      rule: 'integer',
      message: 'Make ID should be an integer',
    },
  ],
  entityAttachmentId: [
    {
      rule: 'uuid',
      message: 'Entity attachment ID should be a valid UUID',
    },
  ],
  uploadedFileId: [
    {
      rule: 'uuid',
      message: "Reference to the vehicle's image should be a valid UUID",
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  label: [
    {
      rule: 'string',
      message: 'Car label should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Car label should not exceed 32 characters',
    },
  ],
  vin: [
    {
      rule: 'string',
      message: 'VIN should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'VIN should not exceed 32 characters',
    },
  ],
  make: [
    {
      rule: 'string',
      message: 'Make should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Make should not exceed 32 characters',
    },
  ],
  model: [
    {
      rule: 'string',
      message: 'Model should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Model should not exceed 32 characters',
    },
  ],
  color: [
    {
      rule: 'string',
      message: 'Color should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Color should not exceed 32 characters',
    },
  ],
  bodyType: [
    {
      rule: 'string',
      message: 'Body type should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Body type should not exceed 16 characters',
    },
  ],
  transmission: [
    {
      rule: 'string',
      message: 'Transmission should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Transmission should not exceed 16 characters',
    },
  ],
  engineVolume: [
    {
      rule: 'integer',
      message: 'Engine volume should be an integer',
    },
  ],
  manufacturedIn: [
    {
      rule: 'integer',
      message: 'Manufactured year should be an integer',
    },
  ],
  mileageIn: [
    {
      rule: 'string',
      message: 'Mileage unit should be a string',
    },
    {
      rule: 'maxLength:8',
      message: 'Mileage unit should not exceed 8 characters',
    },
  ],
  initialMileage: [
    {
      rule: 'integer',
      message: 'Initial mileage should be an integer',
    },
  ],
  typeOfFuel: [
    {
      rule: 'string',
      message: 'Type of fuel should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Type of fuel should not exceed 16 characters',
    },
  ],
  tankVolume: [
    {
      rule: 'integer',
      message: 'Tank volume should be an integer',
    },
  ],
  additionalTankVolume: [
    {
      rule: 'integer',
      message: 'Additional tank volume should be an integer',
    },
  ],
  whenBought: [
    {
      rule: 'string',
      message: 'When bought should be a valid datetime string',
    },
  ],
  boughtFor: [
    {
      rule: 'numeric',
      message: 'Bought for should be a number',
    },
  ],
  boughtForCurrency: [
    {
      rule: 'string',
      message: 'Bought for currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Bought for currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  boughtFrom: [
    {
      rule: 'string',
      message: 'Bought from should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Bought from should not exceed 64 characters',
    },
  ],
  whenSold: [
    {
      rule: 'string',
      message: 'When sold should be a valid datetime string',
    },
  ],
  soldFor: [
    {
      rule: 'numeric',
      message: 'Sold for should be a number',
    },
  ],
  soldForCurrency: [
    {
      rule: 'string',
      message: 'Sold for currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Sold for currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  soldTo: [
    {
      rule: 'string',
      message: 'Sold to should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Sold to should not exceed 64 characters',
    },
  ],
  comments: [
    {
      rule: 'string',
      message: 'Comments should be a string',
    },
  ],
  bodyTypeId: [
    {
      rule: 'integer',
      message: 'Body type ID should be an integer',
    },
  ],
  transmissionTypeId: [
    {
      rule: 'integer',
      message: 'Transmission type ID should be an integer',
    },
  ],
  engineTypeId: [
    {
      rule: 'integer',
      message: 'Engine type ID should be an integer',
    },
  ],
  makeId: [
    {
      rule: 'integer',
      message: 'Make ID should be an integer',
    },
  ],
  entityAttachmentId: [
    {
      rule: 'uuid',
      message: 'Entity attachment ID should be a valid UUID',
    },
  ],
  uploadedFileId: [
    {
      rule: 'uuid',
      message: "Reference to the vehicle's image should be a valid UUID",
    },
  ],
  ...ruleStatus(),
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { entityAttachmentId } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

  if (entityAttachmentId) {
    const entityAttachment = await opt.core.getGateways().entityAttachmentGw.get(entityAttachmentId);

    if (!entityAttachment) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'entityAttachmentId',
          'Entity attachment not found',
        ),
        {},
      ];
    }

    // Verify attachment belongs to user's account via car
    const car = await opt.core.getGateways().carGw.get(entityAttachment.carId);
    if (!car || car.accountId !== accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'entityAttachmentId',
          'Entity attachment not found',
        ),
        {},
      ];
    }

    dependencies['entityAttachment'] = entityAttachment;
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
