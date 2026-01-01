// ./src/core/validators/entityAttachmentValidators.ts
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
  attachmentType: [
    {
      rule: 'array',
      message: 'Attachment types should be an array of integers',
    },
  ],
  accessLevel: [
    {
      rule: 'array',
      message: 'Access levels should be an array of integers',
    },
  ],
  forEntityTypeId: [
    {
      rule: 'array',
      message: 'Entity type IDs should be an array of integers',
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
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Description should not exceed 64 characters',
    },
  ],
  attachmentType: [
    {
      rule: 'required',
      message: 'Attachment type is required',
    },
    {
      rule: 'integer',
      message: 'Attachment type should be an integer',
    },
  ],
  attachmentPath: [
    {
      rule: 'required',
      message: 'Attachment path is required',
    },
    {
      rule: 'string',
      message: 'Attachment path should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Attachment path should not exceed 256 characters',
    },
  ],
  attachmentSize: [
    {
      rule: 'string',
      message: 'Attachment size should be a string',
    },
  ],
  accessLevel: [
    {
      rule: 'integer',
      message: 'Access level should be an integer',
    },
  ],
  forEntityTypeId: [
    {
      rule: 'required',
      message: 'Entity type ID is required',
    },
    {
      rule: 'integer',
      message: 'Entity type ID should be an integer',
    },
  ],
  coordinates: [
    {
      rule: 'string',
      message: 'Coordinates should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Coordinates should not exceed 64 characters',
    },
  ],
  uploadedFileId: [
    {
      rule: 'uuid',
      message: 'Uploaded file ID should be a valid UUID',
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Description should not exceed 64 characters',
    },
  ],
  attachmentType: [
    {
      rule: 'integer',
      message: 'Attachment type should be an integer',
    },
  ],
  attachmentPath: [
    {
      rule: 'string',
      message: 'Attachment path should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Attachment path should not exceed 256 characters',
    },
  ],
  attachmentSize: [
    {
      rule: 'string',
      message: 'Attachment size should be a string',
    },
  ],
  accessLevel: [
    {
      rule: 'integer',
      message: 'Access level should be an integer',
    },
  ],
  forEntityTypeId: [
    {
      rule: 'integer',
      message: 'Entity type ID should be an integer',
    },
  ],
  coordinates: [
    {
      rule: 'string',
      message: 'Coordinates should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Coordinates should not exceed 64 characters',
    },
  ],
  uploadedFileId: [
    {
      rule: 'uuid',
      message: 'Uploaded file ID should be a valid UUID',
    },
  ],
  ...ruleStatus(),
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
