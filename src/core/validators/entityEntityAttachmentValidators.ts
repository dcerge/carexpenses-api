// ./src/core/validators/entityEntityAttachmentValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  entityTypeId: [
    {
      rule: 'array',
      message: 'Entity type IDs should be an array of integers',
    },
  ],
  entityId: [
    {
      rule: 'array',
      message: 'Entity IDs should be an array of UUIDs',
    },
  ],
  entityAttachmentId: [
    {
      rule: 'array',
      message: 'Entity attachment IDs should be an array of UUIDs',
    },
  ],
});

const rulesCreate = new Checkit({
  entityTypeId: [
    {
      rule: 'required',
      message: 'Entity type ID is required',
    },
    {
      rule: 'integer',
      message: 'Entity type ID should be an integer',
    },
  ],
  entityId: [
    {
      rule: 'required',
      message: 'Entity ID is required',
    },
    {
      rule: 'uuid',
      message: 'Entity ID should be a valid UUID',
    },
  ],
  entityAttachmentId: [
    {
      rule: 'required',
      message: 'Entity attachment ID is required',
    },
    {
      rule: 'uuid',
      message: 'Entity attachment ID should be a valid UUID',
    },
  ],
  orderNo: [
    {
      rule: 'integer',
      message: 'Order number should be an integer',
    },
  ],
});

const rulesUpdate = new Checkit({
  orderNo: [
    {
      rule: 'integer',
      message: 'Order number should be an integer',
    },
  ],
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { entityTypeId, entityId, entityAttachmentId } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

  // Validate entity based on entityTypeId
  if (entityTypeId && entityId) {
    let entity: any = null;
    let entityAccountId = null;

    switch (entityTypeId) {
      case 1: // Car
        entity = await opt.core.getGateways().carGw.get(entityId);
        entityAccountId = entity?.accountId;
        break;
      case 2: // Expense
      case 3: // Refuel
        entity = await opt.core.getGateways().expenseBaseGw.get(entityId);
        entityAccountId = entity?.accountId;
        break;
      case 4: // Travel
        entity = await opt.core.getGateways().travelGw.get(entityId);
        entityAccountId = entity?.accountId;
        break;
      default:
        return [
          new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('entityTypeId', 'Invalid entity type ID'),
          {},
        ];
    }

    if (!entity) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('entityId', 'Entity not found'), {}];
    }

    if (entityAccountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('entityId', 'Entity not found'), {}];
    }

    dependencies['entity'] = entity;
  }

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
