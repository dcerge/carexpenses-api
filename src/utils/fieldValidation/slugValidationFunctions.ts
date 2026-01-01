// ./src/utils/fieldValidation/slugValidationFunctions.ts
import { errorResult, successResult } from './helpers';
import { parseOptions } from '../parserHelpers';
import { FieldValidator, SlugFieldOptions } from './interfaces';

/**
 * Character pattern regexes for different separator options
 */
const SLUG_PATTERNS: Record<string, { withNumbers: RegExp; withoutNumbers: RegExp }> = {
  hyphen: {
    withNumbers: /^[a-z0-9-]+$/,
    withoutNumbers: /^[a-z-]+$/,
  },
  underscore: {
    withNumbers: /^[a-z0-9_]+$/,
    withoutNumbers: /^[a-z_]+$/,
  },
  both: {
    withNumbers: /^[a-z0-9_-]+$/,
    withoutNumbers: /^[a-z_-]+$/,
  },
};

/**
 * Patterns for detecting consecutive separators
 */
const CONSECUTIVE_SEPARATOR_PATTERNS: Record<string, RegExp> = {
  hyphen: /--/,
  underscore: /__/,
  both: /--|__|_-|-_/,
};

/**
 * Patterns for detecting leading/trailing separators
 */
const TRIM_SEPARATOR_PATTERNS: Record<string, RegExp> = {
  hyphen: /^-|-$/,
  underscore: /^_|_$/,
  both: /^[-_]|[-_]$/,
};

/**
 * Gets the separator description for error messages
 */
const getSeparatorDescription = (separator: string): string => {
  switch (separator) {
    case 'hyphen':
      return 'hyphens';
    case 'underscore':
      return 'underscores';
    case 'both':
    default:
      return 'hyphens and underscores';
  }
};

/**
 * Slug field validator
 *
 * Validates URL-friendly slugs with configurable rules:
 * - Length (min/max via standard minValue/maxValue)
 * - Separator options (hyphen, underscore, or both)
 * - Number allowance
 * - Leading/trailing separator prevention
 * - Consecutive separator prevention
 *
 * Slugs are always lowercase.
 *
 * Options:
 * - separator: 'hyphen' | 'underscore' | 'both'
 * - allowNumbers: Whether digits are allowed
 * - trimSeparators: Disallow leading/trailing separators
 * - disallowConsecutiveSeparators: Prevent --, __, etc.
 */
export const validateSlug: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, minValue, maxValue, options } = ctx;

  // Slugs are always lowercase
  const strValue = String(value).trim().toLowerCase();

  // Parse options with defaults
  const slugConfig = parseOptions<SlugFieldOptions>(options, {
    separator: 'hyphen',
    allowNumbers: true,
    trimSeparators: true,
    disallowConsecutiveSeparators: true,
  });

  // Step 1: Length validation
  const minLength = minValue != null ? minValue : 1;
  const maxLength = maxValue != null ? maxValue : 500;

  if (strValue.length < minLength) {
    return errorResult(fieldName, `${fieldLabel} must be at least ${minLength} characters long`);
  }

  if (strValue.length > maxLength) {
    return errorResult(fieldName, `${fieldLabel} must not exceed ${maxLength} characters`);
  }

  // Step 2: Get configuration
  const separator = slugConfig.separator || 'hyphen';
  const allowNumbers = slugConfig.allowNumbers !== false;

  // Step 3: Validate character set
  const patterns = SLUG_PATTERNS[separator];

  if (!patterns) {
    return errorResult(fieldName, `${fieldLabel} configuration error: invalid separator option`);
  }

  const pattern = allowNumbers ? patterns.withNumbers : patterns.withoutNumbers;

  if (!pattern.test(strValue)) {
    const sepDesc = getSeparatorDescription(separator);
    const charsDesc = allowNumbers ? `lowercase letters, numbers, and ${sepDesc}` : `lowercase letters and ${sepDesc}`;
    return errorResult(fieldName, `${fieldLabel} can only contain ${charsDesc}`);
  }

  // Step 4: Check for leading/trailing separators
  if (slugConfig.trimSeparators) {
    const trimPattern = TRIM_SEPARATOR_PATTERNS[separator];

    if (trimPattern && trimPattern.test(strValue)) {
      return errorResult(fieldName, `${fieldLabel} cannot start or end with a separator`);
    }
  }

  // Step 5: Check for consecutive separators
  if (slugConfig.disallowConsecutiveSeparators) {
    const consecutivePattern = CONSECUTIVE_SEPARATOR_PATTERNS[separator];

    if (consecutivePattern && consecutivePattern.test(strValue)) {
      return errorResult(fieldName, `${fieldLabel} cannot contain consecutive separators`);
    }
  }

  return successResult(strValue);
};
