// ./src/core/validators/connectorValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId } from './commonRules';
import { validateConnectorConfiguration } from './connectorConfigValidator';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  accountId: [
    {
      rule: 'array',
      message: 'Account IDs should be an array of UUIDs',
    },
  ],
  normalizedName: [
    {
      rule: 'array',
      message: 'Normalized names should be an array of strings',
    },
  ],
  connectorCategory: [
    {
      rule: 'array',
      message: 'Connector categories should be an array of strings',
    },
  ],
  connectorType: [
    {
      rule: 'array',
      message: 'Connector types should be an array of strings',
    },
  ],
});

const rulesCreate = new Checkit({
  name: [
    {
      rule: 'required',
      message: 'Connector name is required',
    },
    {
      rule: 'string',
      message: 'Connector name should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Connector name should not exceed 256 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
  connectorCategory: [
    {
      rule: 'string',
      message: 'Connector category should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Connector category should not exceed 32 characters',
    },
  ],
  connectorType: [
    {
      rule: 'string',
      message: 'Connector type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Connector type should not exceed 32 characters',
    },
  ],
  connectorConfiguration: [
    {
      rule: 'string',
      message: 'Connector configuration should be a string',
    },
  ],
});

const rulesUpdate = new Checkit({
  name: [
    {
      rule: 'string',
      message: 'Connector name should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Connector name should not exceed 256 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
  connectorCategory: [
    {
      rule: 'string',
      message: 'Connector category should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Connector category should not exceed 32 characters',
    },
  ],
  connectorType: [
    {
      rule: 'string',
      message: 'Connector type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Connector type should not exceed 32 characters',
    },
  ],
  connectorConfiguration: [
    {
      rule: 'string',
      message: 'Connector configuration should be a string',
    },
  ],
});

const validateCreate = async (args: any, opt: BaseCoreActionsInterface) => {
  const { params } = args || {};

  const [checkResult] = await validateCreateCommon({ rules: rulesCreate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  // Validate connector configuration based on connector type
  const configValidation = await validateConnectorConfiguration(params.connectorType, params.connectorConfiguration);

  if (configValidation.hasErrors()) {
    return [configValidation, {}];
  }

  return [true, {}];
};

const validateUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const { params } = args || {};

  const [checkResult] = await validateUpdateCommon({ rules: rulesUpdate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  // Only validate connector configuration if it's being updated
  if (params.connectorConfiguration !== undefined) {
    const configValidation = await validateConnectorConfiguration(params.connectorType, params.connectorConfiguration);

    if (configValidation.hasErrors()) {
      return [configValidation, {}];
    }
  }

  return [true, {}];
};

const validators = {
  list: validateList({ rules: rulesList }),
  create: validateCreate,
  update: validateUpdate,
};

export { validators };
