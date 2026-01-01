// ./src/core/validators/emailLayoutValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
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
  htmlContent: [
    {
      rule: 'required',
      message: 'HTML content is required',
    },
    {
      rule: 'string',
      message: 'HTML content should be a string',
    },
  ],
  textContent: [
    {
      rule: 'string',
      message: 'Text content should be a string',
    },
  ],
  fromName: [
    {
      rule: 'string',
      message: 'From name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'From name length should be less than 128',
    },
  ],
  fromEmail: [
    {
      rule: 'string',
      message: 'From email should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'From email length should be less than 256',
    },
  ],
  replyToEmail: [
    {
      rule: 'string',
      message: 'Reply-to email should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Reply-to email length should be less than 256',
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
  htmlContent: [
    {
      rule: 'string',
      message: 'HTML content should be a string',
    },
  ],
  textContent: [
    {
      rule: 'string',
      message: 'Text content should be a string',
    },
  ],
  fromName: [
    {
      rule: 'string',
      message: 'From name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'From name length should be less than 128',
    },
  ],
  fromEmail: [
    {
      rule: 'string',
      message: 'From email should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'From email length should be less than 256',
    },
  ],
  replyToEmail: [
    {
      rule: 'string',
      message: 'Reply-to email should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Reply-to email length should be less than 256',
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

const validators = {
  list: validateList({ rules: rulesList }),
  create: validateCreate,
  update: validateUpdate,
};

export { validators };
