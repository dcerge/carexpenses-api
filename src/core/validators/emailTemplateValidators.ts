// ./src/core/validators/emailTemplateValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { SYSTEM_ACCOUNT_ID } from '../../database';

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  name: [
    {
      rule: 'string',
      message: 'Name should be a string',
    },
  ],
  // templateType: [
  //   {
  //     rule: 'string',
  //     message: 'Template type should be a string',
  //   },
  // ],
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
  templateType: [
    {
      rule: 'required',
      message: 'Template type is required',
    },
    {
      rule: 'string',
      message: 'Template type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Template type length should be less than 32',
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
  subject: [
    {
      rule: 'string',
      message: 'Subject should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Subject length should be less than 512',
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
  templateType: [
    {
      rule: 'string',
      message: 'Template type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Template type length should be less than 32',
    },
  ],
  htmlContent: [
    {
      rule: 'string',
      message: 'HTML content should be a string',
    },
  ],
  subject: [
    {
      rule: 'string',
      message: 'Subject should be a string',
    },
    {
      rule: 'maxLength:512',
      message: 'Subject length should be less than 512',
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

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { emailLayoutId } = args?.params || {};
  const accountId = opt.core.getContext().accountId;

  const dependencies = {};

  if (emailLayoutId) {
    const emailLayout = await opt.core.getGateways().emailLayoutGw.get(emailLayoutId);

    if (!emailLayout) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('emailLayoutId', 'Email layout not found'),
        {},
      ];
    }

    // Verify the layout belongs to the user or is a system layout
    if (emailLayout.accountId !== accountId && emailLayout.accountId !== SYSTEM_ACCOUNT_ID) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('emailLayoutId', 'Email layout not found'),
        {},
      ];
    }

    dependencies['emailLayout'] = emailLayout;
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
