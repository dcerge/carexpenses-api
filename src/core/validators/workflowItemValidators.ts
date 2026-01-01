// ./src/core/validators/workflowItemValidators.ts
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
  workflowId: [
    {
      rule: 'array',
      message: 'Workflow IDs should be an array of UUIDs',
    },
  ],
  connectorId: [
    {
      rule: 'array',
      message: 'Connector IDs should be an array of UUIDs',
    },
  ],
  dataConnectorId: [
    {
      rule: 'array',
      message: 'Data connector IDs should be an array of UUIDs',
    },
  ],
  accountEmailId: [
    {
      rule: 'array',
      message: 'Account email IDs should be an array of UUIDs',
    },
  ],
  conditionType: [
    {
      rule: 'array',
      message: 'Condition types should be an array of strings',
    },
  ],
  actionType: [
    {
      rule: 'array',
      message: 'Action types should be an array of strings',
    },
  ],
});

const rulesCreate = new Checkit({
  workflowId: [
    {
      rule: 'required',
      message: 'Workflow ID is required',
    },
    {
      rule: 'uuid',
      message: 'Workflow ID should be a valid UUID identifier',
    },
  ],
  orderNoNum: [
    {
      rule: 'integer',
      message: 'Order number should be an integer',
    },
  ],
  conditionType: [
    {
      rule: 'string',
      message: 'Condition type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Condition type should not exceed 32 characters',
    },
  ],
  formFieldName: [
    {
      rule: 'string',
      message: 'Form field name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Form field name should not exceed 64 characters',
    },
  ],
  compareOperation: [
    {
      rule: 'string',
      message: 'Compare operation should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Compare operation should not exceed 64 characters',
    },
  ],
  fieldValue: [
    {
      rule: 'string',
      message: 'Field value should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Field value should not exceed 512 characters',
    },
  ],
  customCondition: [
    {
      rule: 'string',
      message: 'Custom condition should be a string',
    },
  ],
  actionType: [
    {
      rule: 'string',
      message: 'Action type should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Action type should not exceed 64 characters',
    },
  ],
  connectorId: [
    {
      rule: 'uuid',
      message: 'Connector ID should be a valid UUID identifier',
    },
  ],
  dataConnectorId: [
    {
      rule: 'uuid',
      message: 'Data connector ID should be a valid UUID identifier',
    },
  ],
  accountEmailId: [
    {
      rule: 'uuid',
      message: 'Account email ID should be a valid UUID identifier',
    },
  ],
  submissionStatus: [
    {
      rule: 'integer',
      message: 'Submission status should be an integer',
    },
  ],
  rejectReason: [
    {
      rule: 'string',
      message: 'Reject reason should be a string',
    },
  ],
  transformConfig: [
    {
      rule: 'string',
      message: 'Transform config should be a string',
    },
  ],
  stopOnConditionMet: [
    {
      rule: 'boolean',
      message: 'Stop on condition met should be a boolean',
    },
  ],
});

const rulesUpdate = new Checkit({
  orderNoNum: [
    {
      rule: 'integer',
      message: 'Order number should be an integer',
    },
  ],
  conditionType: [
    {
      rule: 'string',
      message: 'Condition type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Condition type should not exceed 32 characters',
    },
  ],
  formFieldName: [
    {
      rule: 'string',
      message: 'Form field name should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Form field name should not exceed 64 characters',
    },
  ],
  compareOperation: [
    {
      rule: 'string',
      message: 'Compare operation should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Compare operation should not exceed 64 characters',
    },
  ],
  fieldValue: [
    {
      rule: 'string',
      message: 'Field value should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Field value should not exceed 512 characters',
    },
  ],
  customCondition: [
    {
      rule: 'string',
      message: 'Custom condition should be a string',
    },
  ],
  actionType: [
    {
      rule: 'string',
      message: 'Action type should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Action type should not exceed 64 characters',
    },
  ],
  connectorId: [
    {
      rule: 'uuid',
      message: 'Connector ID should be a valid UUID identifier',
    },
  ],
  dataConnectorId: [
    {
      rule: 'uuid',
      message: 'Data connector ID should be a valid UUID identifier',
    },
  ],
  accountEmailId: [
    {
      rule: 'uuid',
      message: 'Account email ID should be a valid UUID identifier',
    },
  ],
  submissionStatus: [
    {
      rule: 'integer',
      message: 'Submission status should be an integer',
    },
  ],
  rejectReason: [
    {
      rule: 'string',
      message: 'Reject reason should be a string',
    },
  ],
  transformConfig: [
    {
      rule: 'string',
      message: 'Transform config should be a string',
    },
  ],
  stopOnConditionMet: [
    {
      rule: 'boolean',
      message: 'Stop on condition met should be a boolean',
    },
  ],
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { workflowId, connectorId, dataConnectorId, accountEmailId } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies = {};

  if (workflowId) {
    const workflow = await opt.core.getGateways().workflowGw.get(workflowId);

    if (!workflow) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('workflowId', 'Workflow not found'),
        {},
      ];
    }

    if (workflow.accountId != accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('workflowId', 'Workflow not found'),
        {},
      ];
    }

    dependencies['workflow'] = workflow;
  }

  if (connectorId) {
    const connector = await opt.core.getGateways().connectorGw.get(connectorId);

    if (!connector) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('connectorId', 'Connector not found'),
        {},
      ];
    }

    dependencies['connector'] = connector;
  }

  if (dataConnectorId) {
    const dataConnector = await opt.core.getGateways().connectorGw.get(dataConnectorId);

    if (!dataConnector) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'dataConnectorId',
          'Data connector not found',
        ),
        {},
      ];
    }

    if (dataConnector.accountId != accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'dataConnectorId',
          'Data connector not found',
        ),
        {},
      ];
    }

    dependencies['dataConnector'] = dataConnector;
  }

  if (accountEmailId) {
    const accountEmail = await opt.core.getGateways().accountEmailGw.get(accountEmailId);

    if (!accountEmail) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('accountEmailId', 'Account email not found'),
        {},
      ];
    }

    if (accountEmail.accountId != accountId) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('accountEmailId', 'Account email not found'),
        {},
      ];
    }

    dependencies['accountEmail'] = accountEmail;
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
