// ./src/utils/fieldValidation/helpers.ts
import { formatString } from '@sdflc/utils';
import { FieldValidationResult } from './interfaces';
import { logger } from '../../logger';

/**
 * Helper to create error result
 */
export const errorResult = (field: string, message: string): FieldValidationResult => ({
  isValid: false,
  errors: [{ field, message }],
});

/**
 * Helper to create success result
 */
export const successResult = (value?: any): FieldValidationResult => ({
  isValid: true,
  validatedValue: value,
});

/**
 * Formats an error message using custom template or default message.
 * Custom messages can use {{varName}} placeholders for variable substitution.
 *
 * Available variables:
 * - fieldName, fieldLabel, minValue, maxValue, value
 * - Any properties from parsed options object
 */
export const formatErrorMessage = (params: {
  customMessage?: string;
  defaultMessage: string;
  variables: Record<string, any>;
}): string => {
  const { customMessage, defaultMessage, variables } = params;

  if (!customMessage) {
    return defaultMessage;
  }

  try {
    return formatString(customMessage, variables);
  } catch (error) {
    // If formatting fails, fall back to default message
    logger.warn('Failed to format custom error message:', error);
    return defaultMessage;
  }
};

/**
 * Normalizes a value for uniqueness checking.
 * Converts to lowercase string and trims whitespace.
 * Returns null for values that shouldn't be indexed.
 */
export const normalizeValueForUniqueness = (value: any): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle arrays (e.g., multiple choice)
  if (Array.isArray(value)) {
    const normalized = value
      .map((v) => String(v).trim().toLowerCase())
      .filter((v) => v !== '')
      .sort()
      .join(',');
    return normalized || null;
  }

  // Handle objects (e.g., credit card with type)
  if (typeof value === 'object') {
    // For objects like { number: '...', type: '...' }, use the main value
    const mainValue = value.number || value.value || JSON.stringify(value);
    return String(mainValue).trim().toLowerCase() || null;
  }

  // Handle primitives
  const strValue = String(value).trim().toLowerCase();
  return strValue || null;
};
