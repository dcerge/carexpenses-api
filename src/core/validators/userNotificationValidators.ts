// ./src/core/validators/userNotificationValidators.ts
import Checkit from 'checkit';
import { BaseCoreActionsInterface, validateList, validateUpdate as validateUpdateCommon } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId } from './commonRules';

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
  notificationType: [
    {
      rule: 'array',
      message: 'Notification types should be an array of integers',
    },
  ],
  entityId: [
    {
      rule: 'array',
      message: 'Entity IDs should be an array of UUIDs',
    },
  ],
  isRead: [
    {
      rule: 'boolean',
      message: 'Is read should be a boolean',
    },
  ],
});

const rulesCreate = new Checkit({
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  entityId: [
    {
      rule: 'uuid',
      message: 'Entity ID should be a valid UUID',
    },
  ],
  entityUid: [
    {
      rule: 'uuid',
      message: 'Entity UID should be a valid UUID',
    },
  ],
  notificationType: [
    {
      rule: 'required',
      message: 'Notification type is required',
    },
    {
      rule: 'integer',
      message: 'Notification type should be an integer',
    },
  ],
  message: [
    {
      rule: 'string',
      message: 'Message should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Message should not exceed 512 characters',
    },
  ],
  sender: [
    {
      rule: 'string',
      message: 'Sender should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Sender should not exceed 64 characters',
    },
  ],
  actionInfo: [
    {
      rule: 'string',
      message: 'Action info should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Action info should not exceed 64 characters',
    },
  ],
});

const rulesUpdate = new Checkit({
  readAt: [
    {
      rule: 'string',
      message: 'Read at should be a valid datetime string',
    },
  ],
  message: [
    {
      rule: 'string',
      message: 'Message should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Message should not exceed 512 characters',
    },
  ],
  sender: [
    {
      rule: 'string',
      message: 'Sender should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Sender should not exceed 64 characters',
    },
  ],
  actionInfo: [
    {
      rule: 'string',
      message: 'Action info should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Action info should not exceed 64 characters',
    },
  ],
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId } = args?.params || {};
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
  update: validateUpdate,
};

export { validators };
