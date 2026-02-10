import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { TIRE_SET_STATUSES } from '../../database';

// ===========================================================================
// Valid values
// ===========================================================================

const validTireTypes = ['summer', 'winter', 'all_season', 'all_weather', 'performance', 'off_road'];
const validTireSetStatuses = ['active', 'stored', 'retired'];
const validPositions = ['all', 'front', 'rear'];
const validTireConditions = ['new', 'used', 'came_with_vehicle'];

// ===========================================================================
// List filter rules
// ===========================================================================

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  carId: [
    {
      rule: 'array',
      message: 'Car IDs should be an array of UUIDs',
    },
  ],
  tireType: [
    {
      rule: 'array',
      message: 'Tire types should be an array of strings',
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

// ===========================================================================
// Create rules
// ===========================================================================

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
  name: [
    {
      rule: 'required',
      message: 'Tire set name is required',
    },
    {
      rule: 'string',
      message: 'Tire set name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Tire set name should not exceed 128 characters',
    },
  ],
  tireType: [
    {
      rule: 'required',
      message: 'Tire type is required',
    },
    {
      rule: 'string',
      message: 'Tire type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Tire type should not exceed 32 characters',
    },
  ],
  storageLocation: [
    {
      rule: 'string',
      message: 'Storage location should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Storage location should not exceed 256 characters',
    },
  ],
  quantity: [
    {
      rule: 'integer',
      message: 'Quantity should be an integer',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  ...ruleStatus([TIRE_SET_STATUSES.ACTIVE, TIRE_SET_STATUSES.RETIRED, TIRE_SET_STATUSES.STORED]),
});

// ===========================================================================
// Update rules (same fields but none required)
// ===========================================================================

const rulesUpdate = new Checkit({
  name: [
    {
      rule: 'string',
      message: 'Tire set name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Tire set name should not exceed 128 characters',
    },
  ],
  tireType: [
    {
      rule: 'string',
      message: 'Tire type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Tire type should not exceed 32 characters',
    },
  ],
  storageLocation: [
    {
      rule: 'string',
      message: 'Storage location should be a string',
    },
    {
      rule: 'maxLength:256',
      message: 'Storage location should not exceed 256 characters',
    },
  ],
  quantity: [
    {
      rule: 'integer',
      message: 'Quantity should be an integer',
    },
  ],
  notes: [
    {
      rule: 'string',
      message: 'Notes should be a string',
    },
  ],
  ...ruleStatus([TIRE_SET_STATUSES.ACTIVE, TIRE_SET_STATUSES.RETIRED, TIRE_SET_STATUSES.STORED]),
});

// ===========================================================================
// Custom validation helpers
// ===========================================================================

/**
 * Validate tire type is a known value
 */
const validateTireType = (tireType: string | null | undefined): string | null => {
  if (!tireType) {
    return null;
  }

  if (!validTireTypes.includes(tireType)) {
    return `Tire type must be one of: ${validTireTypes.join(', ')}`;
  }

  return null;
};

/**
 * Validate tire set status is a known value
 */
const validateTireSetStatus = (tireSetStatus: string | null | undefined): string | null => {
  if (!tireSetStatus) {
    return null;
  }

  if (!validTireSetStatuses.includes(tireSetStatus)) {
    return `Tire set status must be one of: ${validTireSetStatuses.join(', ')}`;
  }

  return null;
};

/**
 * Validate quantity is a positive number within a reasonable range
 */
const validateQuantity = (quantity: number | null | undefined): string | null => {
  if (quantity == null) {
    return null;
  }

  if (quantity < 1) {
    return 'Quantity must be at least 1';
  }

  if (quantity > 20) {
    return 'Quantity cannot exceed 20';
  }

  return null;
};

/**
 * Validate a single tire set item input
 */
const validateTireSetItem = (item: any, index: number): string | null => {
  if (!item || typeof item !== 'object') {
    return `Item at index ${index} is invalid`;
  }

  // For new items (no id), brand, tireSize, and quantity are required
  if (!item.id) {
    if (!item.brand) {
      return `Item at index ${index}: brand is required for new items`;
    }

    if (!item.tireSize) {
      return `Item at index ${index}: tire size is required for new items`;
    }

    if (item.quantity == null) {
      return `Item at index ${index}: quantity is required for new items`;
    }
  }

  // Validate field lengths
  if (item.brand && typeof item.brand === 'string' && item.brand.length > 128) {
    return `Item at index ${index}: brand should not exceed 128 characters`;
  }

  if (item.model && typeof item.model === 'string' && item.model.length > 128) {
    return `Item at index ${index}: model should not exceed 128 characters`;
  }

  if (item.tireSize && typeof item.tireSize === 'string' && item.tireSize.length > 32) {
    return `Item at index ${index}: tire size should not exceed 32 characters`;
  }

  if (item.dotCode && typeof item.dotCode === 'string' && item.dotCode.length > 16) {
    return `Item at index ${index}: DOT code should not exceed 16 characters`;
  }

  // Validate position
  if (item.position && !validPositions.includes(item.position)) {
    return `Item at index ${index}: position must be one of: ${validPositions.join(', ')}`;
  }

  // Validate tire condition
  if (item.tireCondition && !validTireConditions.includes(item.tireCondition)) {
    return `Item at index ${index}: condition must be one of: ${validTireConditions.join(', ')}`;
  }

  // Validate quantity
  if (item.quantity != null) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return `Item at index ${index}: quantity must be a positive integer`;
    }

    if (item.quantity > 20) {
      return `Item at index ${index}: quantity cannot exceed 20`;
    }
  }

  // Validate tread depth
  if (item.treadDepthInitial != null) {
    if (typeof item.treadDepthInitial !== 'number' || item.treadDepthInitial < 0) {
      return `Item at index ${index}: initial tread depth must be a non-negative number`;
    }

    if (item.treadDepthInitial > 30) {
      return `Item at index ${index}: initial tread depth cannot exceed 30 mm`;
    }
  }

  return null;
};

/**
 * Validate the items array
 */
const validateItems = (items: any[] | null | undefined): string | null => {
  if (!items) {
    return null;
  }

  if (!Array.isArray(items)) {
    return 'Items must be an array';
  }

  for (let i = 0; i < items.length; i++) {
    const error = validateTireSetItem(items[i], i);
    if (error) {
      return error;
    }
  }

  return null;
};

// ===========================================================================
// Dependency checks
// ===========================================================================

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const {
    carId,
    tireType,
    tireSetStatus,
    quantity,
    items,
  } = args?.params || {};

  const { accountId } = opt.core.getContext();

  const dependencies = {};

  // Validate car exists and belongs to account
  if (carId) {
    const car = await opt.core.getGateways().carGw.get(carId);

    if (!car) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    if (car.accountId !== accountId) {
      return [new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Car not found'), {}];
    }

    if (car.removedAt) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('carId', 'Cannot create tire set for a removed car'),
        {},
      ];
    }

    dependencies['car'] = car;
  }

  // Validate tire type
  const tireTypeError = validateTireType(tireType);
  if (tireTypeError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('tireType', tireTypeError),
      {},
    ];
  }

  // Validate tire set status
  const tireSetStatusError = validateTireSetStatus(tireSetStatus);
  if (tireSetStatusError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('tireSetStatus', tireSetStatusError),
      {},
    ];
  }

  // Validate quantity
  const quantityError = validateQuantity(quantity);
  if (quantityError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('quantity', quantityError),
      {},
    ];
  }

  // Validate items array
  const itemsError = validateItems(items);
  if (itemsError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('items', itemsError),
      {},
    ];
  }

  return [true, dependencies];
};

// ===========================================================================
// Exported validators
// ===========================================================================

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