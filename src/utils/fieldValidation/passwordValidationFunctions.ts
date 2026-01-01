// ./src/utils/fieldValidation/passwordValidationFunctions.ts
import { logger } from '../../logger';
import { successResult } from './helpers';
import { parseOptions } from '../parserHelpers';
import { FieldValidator, FieldValidationResult, PasswordFieldOptions } from './interfaces';

/**
 * Default set of allowed special characters
 */
const DEFAULT_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Common sequential patterns to detect
 */
const SEQUENTIAL_PATTERNS = [
  'abc',
  'bcd',
  'cde',
  'def',
  'efg',
  'fgh',
  'ghi',
  'hij',
  'ijk',
  'jkl',
  'klm',
  'lmn',
  'mno',
  'nop',
  'opq',
  'pqr',
  'qrs',
  'rst',
  'stu',
  'tuv',
  'uvw',
  'vwx',
  'wxy',
  'xyz',
  '012',
  '123',
  '234',
  '345',
  '456',
  '567',
  '678',
  '789',
  '890',
  // Reverse sequences
  'cba',
  'dcb',
  'edc',
  'fed',
  'gfe',
  'hgf',
  'ihg',
  'jih',
  'kji',
  'lkj',
  'mlk',
  'nml',
  'onm',
  'pon',
  'qpo',
  'rqp',
  'srq',
  'tsr',
  'uts',
  'vut',
  'wvu',
  'xwv',
  'yxw',
  'zyx',
  '210',
  '321',
  '432',
  '543',
  '654',
  '765',
  '876',
  '987',
  '098',
  // Keyboard patterns
  'qwe',
  'wer',
  'ert',
  'rty',
  'tyu',
  'yui',
  'uio',
  'iop',
  'asd',
  'sdf',
  'dfg',
  'fgh',
  'ghj',
  'hjk',
  'jkl',
  'zxc',
  'xcv',
  'cvb',
  'vbn',
  'bnm',
];

/**
 * Checks if password contains sequential characters
 */
const hasSequentialChars = (password: string): boolean => {
  const lower = password.toLowerCase();
  return SEQUENTIAL_PATTERNS.some((pattern) => lower.includes(pattern));
};

/**
 * Checks if password contains repeated characters exceeding the limit
 */
const hasRepeatedChars = (password: string, maxRepeated: number): boolean => {
  const regex = new RegExp(`(.)\\1{${maxRepeated},}`, 'i');
  return regex.test(password);
};

/**
 * Escapes special regex characters in a string
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Helper to create multi-error result
 */
const errorsResult = (errors: { field: string; message: string }[]): FieldValidationResult => ({
  isValid: false,
  errors,
});

/**
 * Password field validator
 *
 * Validates password strength with configurable requirements.
 * Accumulates all validation errors to provide comprehensive feedback.
 *
 * Options:
 * - requireUppercase: Require at least one A-Z
 * - requireLowercase: Require at least one a-z
 * - requireNumbers: Require at least one 0-9
 * - requireSymbols: Require at least one special character
 * - allowedSymbols: Custom set of allowed special characters
 * - disallowCommonPasswords: Block common weak passwords (requires stopPasswordsDictionaryId)
 * - stopPasswordsDictionaryId: Lookup dictionary ID for common/weak passwords
 * - disallowSequential: Block sequential characters (abc, 123)
 * - disallowRepeated: Block repeated characters (aaa, 111)
 * - maxRepeatedChars: Maximum consecutive identical characters
 */
export const validatePassword: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, minValue, maxValue, options, core } = ctx;

  const strValue = String(value);
  const errors: { field: string; message: string }[] = [];

  // Parse options with defaults
  const passwordConfig = parseOptions<PasswordFieldOptions>(options, {
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSymbols: false,
    disallowCommonPasswords: false,
    disallowSequential: false,
    disallowRepeated: false,
    maxRepeatedChars: 2,
  });

  // Step 1: Length validation
  const minLength = minValue != null ? minValue : 1;
  const maxLength = maxValue != null ? maxValue : 256;

  if (strValue.length < minLength) {
    errors.push({
      field: fieldName,
      message: `${fieldLabel} must be at least ${minLength} characters long`,
    });
  }

  if (strValue.length > maxLength) {
    errors.push({
      field: fieldName,
      message: `${fieldLabel} must not exceed ${maxLength} characters`,
    });
  }

  // Step 2: Check for common passwords via lookup dictionary
  if (passwordConfig.disallowCommonPasswords && passwordConfig.stopPasswordsDictionaryId) {
    try {
      const lookupDictionary = await core
        .getGateways()
        .lookupDictionaryGw.get(passwordConfig.stopPasswordsDictionaryId);

      if (!lookupDictionary) {
        logger.error(`Common passwords dictionary not found: ${passwordConfig.stopPasswordsDictionaryId}`);
        // Fail open - don't block if dictionary is missing
      } else {
        // Check if password (case-insensitive) is in the common passwords list
        const filter = {
          lookupDictionaryId: passwordConfig.stopPasswordsDictionaryId,
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
          errors.push({
            field: fieldName,
            message: `${fieldLabel} is too common. Please choose a stronger password`,
          });
        }
      }
    } catch (error: any) {
      logger.error(`Common passwords lookup error for field ${fieldName}:`, error);
      // Fail open - if lookup fails, allow the password
    }
  }

  // Step 3: Check for sequential characters
  if (passwordConfig.disallowSequential) {
    if (hasSequentialChars(strValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} must not contain sequential characters (e.g., abc, 123)`,
      });
    }
  }

  // Step 4: Check for repeated characters
  if (passwordConfig.disallowRepeated) {
    const maxRepeated = passwordConfig.maxRepeatedChars ?? 2;
    if (hasRepeatedChars(strValue, maxRepeated)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} must not contain more than ${maxRepeated} consecutive identical characters`,
      });
    }
  }

  // Step 5: Character type requirements
  if (passwordConfig.requireUppercase) {
    if (!/[A-Z]/.test(strValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} must contain at least one uppercase letter`,
      });
    }
  }

  if (passwordConfig.requireLowercase) {
    if (!/[a-z]/.test(strValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} must contain at least one lowercase letter`,
      });
    }
  }

  if (passwordConfig.requireNumbers) {
    if (!/[0-9]/.test(strValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} must contain at least one number`,
      });
    }
  }

  if (passwordConfig.requireSymbols) {
    const symbols = passwordConfig.allowedSymbols || DEFAULT_SYMBOLS;
    const escapedSymbols = escapeRegex(symbols);
    const symbolRegex = new RegExp(`[${escapedSymbols}]`);

    if (!symbolRegex.test(strValue)) {
      errors.push({
        field: fieldName,
        message: `${fieldLabel} must contain at least one special character (${symbols})`,
      });
    }
  }

  // Return result
  if (errors.length > 0) {
    return errorsResult(errors);
  }

  // Password is valid - return as-is (don't normalize passwords)
  return successResult(strValue);
};
