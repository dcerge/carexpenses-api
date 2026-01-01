// ./src/utils/fieldValidation/usernameValidationFunctions.ts
import { logger } from '../../logger';
import { errorResult, successResult } from './helpers';
import { parseOptions } from '../parserHelpers';
import { FieldValidator, UsernameFieldOptions } from './interfaces';

/**
 * Character pattern regexes for different allowed character sets
 */
const CHARACTER_PATTERNS: Record<string, RegExp> = {
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumeric_underscore: /^[a-zA-Z0-9_]+$/,
  alphanumeric_hyphen: /^[a-zA-Z0-9-]+$/,
  alphanumeric_both: /^[a-zA-Z0-9_-]+$/,
};

/**
 * Patterns for detecting consecutive special characters
 */
const CONSECUTIVE_SPECIAL_PATTERNS = [
  '__', // double underscore
  '--', // double hyphen
  '_-', // underscore followed by hyphen
  '-_', // hyphen followed by underscore
];

/**
 * Checks if username starts with a letter
 */
const startsWithLetter = (username: string): boolean => {
  return /^[a-zA-Z]/.test(username);
};

/**
 * Checks if username contains consecutive special characters
 */
const hasConsecutiveSpecial = (username: string): boolean => {
  return CONSECUTIVE_SPECIAL_PATTERNS.some((pattern) => username.includes(pattern));
};

/**
 * Gets the character set description for error messages
 */
const getCharacterSetDescription = (allowedCharacters: string): string => {
  switch (allowedCharacters) {
    case 'alphanumeric':
      return 'letters and numbers';
    case 'alphanumeric_underscore':
      return 'letters, numbers, and underscores';
    case 'alphanumeric_hyphen':
      return 'letters, numbers, and hyphens';
    case 'alphanumeric_both':
    default:
      return 'letters, numbers, underscores, and hyphens';
  }
};

/**
 * Username field validator
 *
 * Validates username format with configurable rules:
 * - Length (min/max via standard minValue/maxValue)
 * - Allowed character sets
 * - Force lowercase option
 * - Must start with letter option
 * - Consecutive special character prevention
 * - Stop words dictionary lookup
 *
 * Options:
 * - allowedCharacters: 'alphanumeric' | 'alphanumeric_underscore' | 'alphanumeric_hyphen' | 'alphanumeric_both'
 * - forceLowercase: Convert to lowercase
 * - mustStartWithLetter: Username must begin with a-z/A-Z
 * - disallowConsecutiveSpecial: Prevent __, --, _-, -_
 * - stopWordsDictionaryId: Lookup dictionary ID for reserved words
 */
export const validateUsername: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, minValue, maxValue, options, core } = ctx;

  let strValue = String(value).trim();

  // Parse options with defaults
  const usernameConfig = parseOptions<UsernameFieldOptions>(options, {
    allowedCharacters: 'alphanumeric_both',
    forceLowercase: false,
    mustStartWithLetter: true,
    disallowConsecutiveSpecial: true,
  });

  // Step 1: Apply lowercase transformation if configured
  if (usernameConfig.forceLowercase) {
    strValue = strValue.toLowerCase();
  }

  // Step 2: Length validation
  const minLength = minValue != null ? minValue : 1;
  const maxLength = maxValue != null ? maxValue : 50;

  if (strValue.length < minLength) {
    return errorResult(fieldName, `${fieldLabel} must be at least ${minLength} characters long`);
  }

  if (strValue.length > maxLength) {
    return errorResult(fieldName, `${fieldLabel} must not exceed ${maxLength} characters`);
  }

  // Step 3: Check if must start with letter
  if (usernameConfig.mustStartWithLetter) {
    if (!startsWithLetter(strValue)) {
      return errorResult(fieldName, `${fieldLabel} must start with a letter`);
    }
  }

  // Step 4: Validate character set
  const allowedChars = usernameConfig.allowedCharacters || 'alphanumeric_both';
  const pattern = CHARACTER_PATTERNS[allowedChars];

  if (!pattern) {
    logger.error(`Invalid allowedCharacters option: ${allowedChars}`);
    return errorResult(fieldName, `${fieldLabel} configuration error: invalid character set`);
  }

  if (!pattern.test(strValue)) {
    const charSetDesc = getCharacterSetDescription(allowedChars);
    return errorResult(fieldName, `${fieldLabel} can only contain ${charSetDesc}`);
  }

  // Step 5: Check for consecutive special characters
  if (usernameConfig.disallowConsecutiveSpecial) {
    if (hasConsecutiveSpecial(strValue)) {
      return errorResult(fieldName, `${fieldLabel} cannot contain consecutive special characters`);
    }
  }

  // Step 6: Check against stop words dictionary if configured
  if (usernameConfig.stopWordsDictionaryId) {
    try {
      const lookupDictionary = await core.getGateways().lookupDictionaryGw.get(usernameConfig.stopWordsDictionaryId);

      if (!lookupDictionary) {
        logger.error(`Stop words dictionary not found: ${usernameConfig.stopWordsDictionaryId}`);
        // Fail open - don't block if dictionary is missing
      } else {
        // Check if username (case-insensitive) is in the stop words list
        const filter = {
          lookupDictionaryId: usernameConfig.stopWordsDictionaryId,
          isExpired: false,
          checkValue: strValue.toLowerCase(),
        };

        const items = await core.getGateways().lookupDictionaryItemGw.list({
          filter,
          params: {
            pagination: { pageSize: 1 },
          },
        });

        if (items && items.length > 0) {
          return errorResult(fieldName, `${fieldLabel} "${strValue}" is not available`);
        }
      }
    } catch (error: any) {
      logger.error(`Stop words lookup error for field ${fieldName}:`, error);
      // Fail open - if lookup fails, allow the username
    }
  }

  return successResult(strValue);
};
