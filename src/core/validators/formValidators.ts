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
  name: [
    {
      rule: 'string',
      message: 'Name should be a string',
    },
  ],
});

const rulesCreate = new Checkit({
  name: [
    {
      rule: 'required',
      message: 'Name is required',
    },
    {
      rule: 'string',
      message: 'Name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Name length should be less than 128',
    },
  ],
});

const rulesUpdate = new Checkit({
  name: [
    {
      rule: 'string',
      message: 'Name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Name length should be less than 128',
    },
  ],
});

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { workflowId, connectorId, dataConnectorId, accountEmailId } = args?.params || {};

  const dependencies = {};

  if (workflowId) {
    const workflow = await opt.core.getGateways().workflowGw.get(workflowId);

    if (!workflow) {
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
