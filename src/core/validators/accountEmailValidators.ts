// ./src/core/validators/accountEmailValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { rulesMultipleUuidInId } from './commonRules';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  accountId: [
    {
      rule: 'array',
      message: 'Account IDs should be an array of UUIDs',
    },
  ],
  email: [
    {
      rule: 'array',
      message: 'Emails should be an array of strings',
    },
  ],
  confirmationCode: [
    {
      rule: 'array',
      message: 'Confirmation codes should be an array of strings',
    },
  ],
});

const rulesCreate = new Checkit({
  email: [
    {
      rule: 'required',
      message: 'Email is required',
    },
    {
      rule: 'email',
      message: 'Email should be a valid email address',
    },
    {
      rule: 'maxLength:128',
      message: 'Email should not exceed 128 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
});

const rulesUpdate = new Checkit({
  email: [
    {
      rule: 'email',
      message: 'Email should be a valid email address',
    },
    {
      rule: 'maxLength:128',
      message: 'Email should not exceed 128 characters',
    },
  ],
  description: [
    {
      rule: 'string',
      message: 'Description should be a string',
    },
  ],
  confirmationCode: [
    {
      rule: 'string',
      message: 'Confirmation code should be a string',
    },
  ],
  confirmationAttempt: [
    {
      rule: 'integer',
      message: 'Confirmation attempt should be an integer',
    },
  ],
  expiresAt: [
    {
      rule: 'string',
      message: 'Expires at should be a valid datetime string',
    },
  ],
  confirmedAt: [
    {
      rule: 'string',
      message: 'Confirmed at should be a valid datetime string',
    },
  ],
  lastConfirmationSentAt: [
    {
      rule: 'string',
      message: 'Last confirmation sent at should be a valid datetime string',
    },
  ],
});

const rulesSendConfirmation = new Checkit({
  id: [
    {
      rule: 'required',
      message: 'Reference to an account email record is required',
    },
    {
      rule: 'uuid',
      message: 'Reference to an account email record',
    },
  ],
});

const rulesVerifyCode = new Checkit({
  id: [
    {
      rule: 'required',
      message: 'Reference to an account email record is required',
    },
    {
      rule: 'uuid',
      message: 'Reference to an account email record',
    },
  ],
  code: [
    {
      rule: 'required',
      message: 'Verification code is required',
    },
    {
      rule: 'string',
      message: 'Verification code must be a string',
    },
    {
      rule: 'maxLength:255',
      message: 'Email should not exceed 128 characters',
    },
  ],
});

const validateCreate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateCreateCommon({ rules: rulesCreate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  return [true, {}];
};

const validateUpdate = async (args: any, opt: BaseCoreActionsInterface) => {
  const [checkResult] = await validateUpdateCommon({ rules: rulesUpdate })(args, opt);

  if (checkResult !== true) {
    return [checkResult, {}];
  }

  return [true, {}];
};

const validateSendConfirmation = async (args: any, opt: BaseCoreActionsInterface) => {
  return [true, {}];
};

const validateVerifyCode = async (args: any, opt: BaseCoreActionsInterface) => {
  return [true, {}];
};

const validators = {
  list: validateList({ rules: rulesList }),
  create: validateCreate,
  update: validateUpdate,
  sendConfirmation: validateSendConfirmation,
  verifyCode: validateVerifyCode,
};

export { validators };
