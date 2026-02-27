// ./src/core/validators/gloveboxDocumentValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';

// Document type code for custom documents
const CUSTOM_DOC_TYPE_ID = 1000;

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
  docTypeId: [
    {
      rule: 'array',
      message: 'Document type IDs should be an array of integers',
    },
  ],
  category: [
    {
      rule: 'array',
      message: 'Categories should be an array of strings',
    },
  ],
  expiresAtFrom: [
    {
      rule: 'string',
      message: 'Expires at from should be a valid date string',
    },
  ],
  expiresAtTo: [
    {
      rule: 'string',
      message: 'Expires at to should be a valid date string',
    },
  ],
  isExpired: [
    {
      rule: 'boolean',
      message: 'Is expired should be a boolean',
    },
  ],
  expiresWithinDays: [
    {
      rule: 'integer',
      message: 'Expires within days should be an integer',
    },
  ],
  expiredOrExpiring: [
    {
      rule: 'boolean',
      message: 'Expired or expiring should be a boolean',
    },
  ],
  status: [
    {
      rule: 'array',
      message: 'Statuses should be an array of integers',
    },
  ],
  searchKeyword: [
    {
      rule: 'string',
      message: 'Search keyword should be a string',
    },
  ],
});

const rulesCreate = new Checkit({
  docTypeId: [
    {
      rule: 'required',
      message: 'Document type ID is required',
    },
    {
      rule: 'integer',
      message: 'Document type ID should be an integer',
    },
  ],
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  userId: [
    {
      rule: 'uuid',
      message: 'User ID should be a valid UUID',
    },
  ],
  customTypeName: [
    {
      rule: 'string',
      message: 'Custom type name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Custom type name should not exceed 128 characters',
    },
  ],
  documentNumber: [
    {
      rule: 'string',
      message: 'Document number should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Document number should not exceed 64 characters',
    },
  ],
  issuedAt: [
    {
      rule: 'string',
      message: 'Issued at should be a valid date string',
    },
  ],
  effectiveAt: [
    {
      rule: 'string',
      message: 'Effective at should be a valid date string',
    },
  ],
  expiresAt: [
    {
      rule: 'string',
      message: 'Expires at should be a valid date string',
    },
  ],
  issuingAuthority: [
    {
      rule: 'string',
      message: 'Issuing authority should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Issuing authority should not exceed 128 characters',
    },
  ],
  phone: [
    {
      rule: 'string',
      message: 'Phone should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Phone should not exceed 64 characters',
    },
  ],
  website: [
    {
      rule: 'string',
      message: 'Website should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Website should not exceed 256 characters',
    },
  ],
  cost: [
    {
      rule: 'numeric',
      message: 'Cost should be a number',
    },
  ],
  costCurrency: [
    {
      rule: 'string',
      message: 'Cost currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Cost currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  coverageAmount: [
    {
      rule: 'numeric',
      message: 'Coverage amount should be a number',
    },
  ],
  coverageCurrency: [
    {
      rule: 'string',
      message: 'Coverage currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Coverage currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  remindBeforeDays: [
    {
      rule: 'integer',
      message: 'Remind before days should be an integer',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
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
  docTypeId: [
    {
      rule: 'integer',
      message: 'Document type ID should be an integer',
    },
  ],
  carId: [
    {
      rule: 'uuid',
      message: 'Car ID should be a valid UUID',
    },
  ],
  userId: [
    {
      rule: 'uuid',
      message: 'User ID should be a valid UUID',
    },
  ],
  customTypeName: [
    {
      rule: 'string',
      message: 'Custom type name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Custom type name should not exceed 128 characters',
    },
  ],
  documentNumber: [
    {
      rule: 'string',
      message: 'Document number should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Document number should not exceed 64 characters',
    },
  ],
  issuedAt: [
    {
      rule: 'string',
      message: 'Issued at should be a valid date string',
    },
  ],
  effectiveAt: [
    {
      rule: 'string',
      message: 'Effective at should be a valid date string',
    },
  ],
  expiresAt: [
    {
      rule: 'string',
      message: 'Expires at should be a valid date string',
    },
  ],
  issuingAuthority: [
    {
      rule: 'string',
      message: 'Issuing authority should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Issuing authority should not exceed 128 characters',
    },
  ],
  phone: [
    {
      rule: 'string',
      message: 'Phone should be a string',
    },
    {
      rule: 'maxLength:64',
      message: 'Phone should not exceed 64 characters',
    },
  ],
  website: [
    {
      rule: 'string',
      message: 'Website should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Website should not exceed 256 characters',
    },
  ],
  cost: [
    {
      rule: 'numeric',
      message: 'Cost should be a number',
    },
  ],
  costCurrency: [
    {
      rule: 'string',
      message: 'Cost currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Cost currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  coverageAmount: [
    {
      rule: 'numeric',
      message: 'Coverage amount should be a number',
    },
  ],
  coverageCurrency: [
    {
      rule: 'string',
      message: 'Coverage currency should be a string',
    },
    {
      rule: 'maxLength:3',
      message: 'Coverage currency should be a valid ISO 4217 code (3 characters)',
    },
  ],
  remindBeforeDays: [
    {
      rule: 'integer',
      message: 'Remind before days should be an integer',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
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

/**
 * Check that at least one of carId or userId is provided
 * and validate that referenced entities exist and belong to the account
 */
const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { carId, userId, docTypeId, customTypeName } = args?.params || {};
  const { accountId } = opt.core.getContext();

  const dependencies: Record<string, any> = {};

  // For create, at least one of carId or userId must be provided
  if (!isUpdate && !carId && !userId) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'carId',
        'Either Car ID or User ID is required',
      ),
      {},
    ];
  }

  // Validate docTypeId exists
  if (docTypeId) {
    const docType = await opt.core.getGateways().gloveboxDocTypeGw.get(docTypeId);

    if (!docType) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('docTypeId', 'Document type not found'),
        {},
      ];
    }

    dependencies['docType'] = docType;

    // If custom type, customTypeName is required
    if (docTypeId === CUSTOM_DOC_TYPE_ID && !customTypeName) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'customTypeName',
          'Custom type name is required for custom document type',
        ),
        {},
      ];
    }
  }

  // Validate carId if provided
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

  // Validate userId if provided (must be a user in the same account)
  // Note: This would require access to ms_auth user data
  // For now, we'll allow any userId but can add validation later

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