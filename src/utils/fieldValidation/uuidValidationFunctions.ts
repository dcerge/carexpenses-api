// ./src/utils/fieldValidation/uuidValidationFunctions.ts
import { errorResult, successResult } from './helpers';
import { parseOptions } from '../parserHelpers';
import { FieldValidator, UuidFieldOptions } from './interfaces';

/**
 * Standard UUID regex pattern
 * Matches format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * where x is a hexadecimal digit (0-9, a-f, A-F)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nil UUID (all zeros)
 */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Extracts the version number from a UUID.
 * The version is encoded in the first digit of the third group.
 *
 * @param uuid - A valid UUID string
 * @returns The version number (1-5) or 0 for nil UUID
 */
const getUuidVersion = (uuid: string): number => {
  if (uuid.toLowerCase() === NIL_UUID) {
    return 0;
  }

  // Version is the first character of the third group (position 14)
  const versionChar = uuid.charAt(14);
  const version = parseInt(versionChar, 16);

  // Valid versions are 1-5
  if (version >= 1 && version <= 5) {
    return version;
  }

  return 0;
};

/**
 * UUID field validator
 *
 * Validates standard UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 * with optional version filtering and nil UUID control.
 *
 * Options:
 * - allowedVersions: Array of allowed UUID versions (1-5). Empty = all versions.
 * - allowNil: Whether to accept the nil UUID (00000000-0000-0000-0000-000000000000)
 */
export const validateUuid: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;

  const strValue = String(value).trim();

  // Parse options with defaults
  const uuidConfig = parseOptions<UuidFieldOptions>(options, {
    allowNil: false,
  });

  // Step 1: Basic format validation
  if (!UUID_REGEX.test(strValue)) {
    return errorResult(fieldName, `${fieldLabel} must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)`);
  }

  const normalizedUuid = strValue.toLowerCase();

  // Step 2: Check nil UUID
  if (normalizedUuid === NIL_UUID) {
    if (!uuidConfig.allowNil) {
      return errorResult(fieldName, `${fieldLabel} cannot be a nil UUID`);
    }
    // Nil UUID is allowed, return it
    return successResult(normalizedUuid);
  }

  // Step 3: Check version if restrictions are specified
  if (uuidConfig.allowedVersions && uuidConfig.allowedVersions.length > 0) {
    const version = getUuidVersion(normalizedUuid);

    if (!uuidConfig.allowedVersions.includes(version)) {
      const allowedStr = uuidConfig.allowedVersions.join(', ');
      return errorResult(fieldName, `${fieldLabel} must be UUID version ${allowedStr}`);
    }
  }

  return successResult(normalizedUuid);
};
