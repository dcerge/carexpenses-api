// ./src/core/validators/savedPlaceValidators.ts
import Checkit from 'checkit';
import {
  BaseCoreActionsInterface,
  validateList,
  validateCreate as validateCreateCommon,
  validateUpdate as validateUpdateCommon,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { rulesMultipleUuidInId, ruleStatus } from './commonRules';
import { PLACE_TYPES, STATUS } from '../../database';

// Valid place types
const validPlaceTypes = Object.values(PLACE_TYPES);

// Valid statuses
const validStatuses = [STATUS.ACTIVE, STATUS.INACTIVE];

const rulesList = new Checkit({
  ...rulesMultipleUuidInId(),
  placeType: [
    {
      rule: 'array',
      message: 'Place types should be an array of strings',
    },
  ],
  createdBy: [
    {
      rule: 'array',
      message: 'Created by should be an array of UUIDs',
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
      message: 'Name should not exceed 128 characters',
    },
  ],
  placeType: [
    {
      rule: 'string',
      message: 'Place type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Place type should not exceed 32 characters',
    },
  ],
  isPrivate: [
    {
      rule: 'boolean',
      message: 'Is private should be a boolean',
    },
  ],
  whereDone: [
    {
      rule: 'string',
      message: 'Where done should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Where done should not exceed 128 characters',
    },
  ],
  address1: [
    {
      rule: 'string',
      message: 'Address 1 should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Address 1 should not exceed 128 characters',
    },
  ],
  address2: [
    {
      rule: 'string',
      message: 'Address 2 should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Address 2 should not exceed 128 characters',
    },
  ],
  city: [
    {
      rule: 'string',
      message: 'City should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'City should not exceed 128 characters',
    },
  ],
  postalCode: [
    {
      rule: 'string',
      message: 'Postal code should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Postal code should not exceed 16 characters',
    },
  ],
  stateProvince: [
    {
      rule: 'string',
      message: 'State/Province should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'State/Province should not exceed 128 characters',
    },
  ],
  country: [
    {
      rule: 'string',
      message: 'Country should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Country should not exceed 128 characters',
    },
  ],
  countryId: [
    {
      rule: 'string',
      message: 'Country ID should be a string',
    },
    {
      rule: 'maxLength:4',
      message: 'Country ID should not exceed 4 characters',
    },
  ],
  latitude: [
    {
      rule: 'numeric',
      message: 'Latitude should be a number',
    },
  ],
  longitude: [
    {
      rule: 'numeric',
      message: 'Longitude should be a number',
    },
  ],
  radiusM: [
    {
      rule: 'integer',
      message: 'Radius should be an integer',
    },
  ],
  ...ruleStatus(),
});

const rulesUpdate = new Checkit({
  name: [
    {
      rule: 'string',
      message: 'Name should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Name should not exceed 128 characters',
    },
  ],
  placeType: [
    {
      rule: 'string',
      message: 'Place type should be a string',
    },
    {
      rule: 'maxLength:32',
      message: 'Place type should not exceed 32 characters',
    },
  ],
  isPrivate: [
    {
      rule: 'boolean',
      message: 'Is private should be a boolean',
    },
  ],
  whereDone: [
    {
      rule: 'string',
      message: 'Where done should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Where done should not exceed 128 characters',
    },
  ],
  address1: [
    {
      rule: 'string',
      message: 'Address 1 should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Address 1 should not exceed 128 characters',
    },
  ],
  address2: [
    {
      rule: 'string',
      message: 'Address 2 should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Address 2 should not exceed 128 characters',
    },
  ],
  city: [
    {
      rule: 'string',
      message: 'City should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'City should not exceed 128 characters',
    },
  ],
  postalCode: [
    {
      rule: 'string',
      message: 'Postal code should be a string',
    },
    {
      rule: 'maxLength:16',
      message: 'Postal code should not exceed 16 characters',
    },
  ],
  stateProvince: [
    {
      rule: 'string',
      message: 'State/Province should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'State/Province should not exceed 128 characters',
    },
  ],
  country: [
    {
      rule: 'string',
      message: 'Country should be a string',
    },
    {
      rule: 'maxLength:128',
      message: 'Country should not exceed 128 characters',
    },
  ],
  countryId: [
    {
      rule: 'string',
      message: 'Country ID should be a string',
    },
    {
      rule: 'maxLength:4',
      message: 'Country ID should not exceed 4 characters',
    },
  ],
  latitude: [
    {
      rule: 'numeric',
      message: 'Latitude should be a number',
    },
  ],
  longitude: [
    {
      rule: 'numeric',
      message: 'Longitude should be a number',
    },
  ],
  radiusM: [
    {
      rule: 'integer',
      message: 'Radius should be an integer',
    },
  ],
  ...ruleStatus(),
});

/**
 * Validate latitude is within valid range (-90 to 90)
 */
const validateLatitude = (latitude: number | undefined | null): string | null => {
  if (latitude == null) {
    return null;
  }
  if (latitude < -90 || latitude > 90) {
    return 'Latitude must be between -90 and 90';
  }
  return null;
};

/**
 * Validate longitude is within valid range (-180 to 180)
 */
const validateLongitude = (longitude: number | undefined | null): string | null => {
  if (longitude == null) {
    return null;
  }
  if (longitude < -180 || longitude > 180) {
    return 'Longitude must be between -180 and 180';
  }
  return null;
};

/**
 * Validate radius is positive and within a reasonable range
 */
const validateRadius = (radiusM: number | undefined | null): string | null => {
  if (radiusM == null) {
    return null;
  }
  if (radiusM < 10) {
    return 'Radius must be at least 10 meters';
  }
  if (radiusM > 10000) {
    return 'Radius must not exceed 10,000 meters';
  }
  return null;
};

/**
 * Validate that both latitude and longitude are provided together
 */
const validateCoordinatesPair = (latitude: number | undefined | null, longitude: number | undefined | null): string | null => {
  if ((latitude != null && longitude == null) || (latitude == null && longitude != null)) {
    return 'Both latitude and longitude must be provided together';
  }
  return null;
};

const checkDependencies = async (args: any, opt: BaseCoreActionsInterface, isUpdate?: boolean) => {
  const { placeType, latitude, longitude, radiusM, status, name } = args?.params || {};
  const { accountId, userId } = opt.core.getContext();

  const dependencies = {};

  // Validate place type
  if (placeType && !validPlaceTypes.includes(placeType)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'placeType',
        `Place type must be one of: ${validPlaceTypes.join(', ')}`,
      ),
      {},
    ];
  }

  // Validate coordinates pair
  const coordsPairError = validateCoordinatesPair(latitude, longitude);
  if (coordsPairError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('latitude', coordsPairError),
      {},
    ];
  }

  // Validate latitude range
  const latError = validateLatitude(latitude);
  if (latError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('latitude', latError),
      {},
    ];
  }

  // Validate longitude range
  const lngError = validateLongitude(longitude);
  if (lngError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('longitude', lngError),
      {},
    ];
  }

  // Validate radius range
  const radiusError = validateRadius(radiusM);
  if (radiusError) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError('radiusM', radiusError),
      {},
    ];
  }

  // Validate status
  if (status != null && !validStatuses.includes(status)) {
    return [
      new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
        'status',
        `Status must be one of: ${validStatuses.join(', ')} (100=Active, 200=Inactive)`,
      ),
      {},
    ];
  }

  // Check name uniqueness within account (for non-removed records)
  if (name) {
    const normalizedName = name.trim().toLowerCase();
    const existingFilter: any = {
      accountId,
      searchKeyword: normalizedName,
    };

    const existingPlaces = await opt.core.getGateways().savedPlaceGw.list(existingFilter);
    const duplicate = existingPlaces?.find((place: any) => {
      if (isUpdate && place.id === args?.where?.id) {
        return false;
      }
      return place.normalizedName === normalizedName && !place.removedAt;
    });

    if (duplicate) {
      return [
        new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED }).addError(
          'name',
          'A saved place with this name already exists',
        ),
        {},
      ];
    }
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