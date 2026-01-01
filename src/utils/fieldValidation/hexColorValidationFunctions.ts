// ./src/utils/fieldValidation/hexColorValidationFunctions.ts
import { errorResult, successResult } from './helpers';
import { FieldValidator, HexColorFieldOptions } from './interfaces';
import { parseOptions } from '../parserHelpers';

/**
 * Regex patterns for hex color validation
 */
const HEX_COLOR_PATTERNS = {
  // 3-character short format: #RGB
  short: /^#?[0-9a-f]{3}$/i,
  // 6-character long format: #RRGGBB
  long: /^#?[0-9a-f]{6}$/i,
  // 8-character with alpha: #RRGGBBAA
  alpha: /^#?[0-9a-f]{8}$/i,
  // Combined: 3, 6, or 8 characters
  any: /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  // Without alpha: 3 or 6 characters
  noAlpha: /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i,
};

/**
 * Normalizes a hex color to include the # prefix and lowercase.
 *
 * @param color - The hex color string
 * @returns Normalized color with # prefix
 */
const normalizeHexColor = (color: string): string => {
  const cleaned = color.replace(/^#/, '').toLowerCase();
  return `#${cleaned}`;
};

/**
 * Hex Color field validator
 *
 * Validates hexadecimal color codes in various formats:
 * - Short: #RGB (3 characters)
 * - Long: #RRGGBB (6 characters)
 * - Alpha: #RRGGBBAA (8 characters)
 *
 * Options:
 * - format: 'short' | 'long' | 'both' - Which formats to accept
 * - requireHash: Whether the # prefix is required (default: true)
 * - allowAlpha: Whether to accept 8-character format with alpha (default: false)
 */
export const validateHexColor: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;

  const strValue = String(value).trim();

  // Parse options with defaults
  const colorConfig = parseOptions<HexColorFieldOptions>(options, {
    format: 'both',
    requireHash: true,
    allowAlpha: false,
  });

  // Step 1: Check for required hash prefix
  const hasHash = strValue.startsWith('#');

  if (colorConfig.requireHash && !hasHash) {
    return errorResult(fieldName, `${fieldLabel} must start with # symbol`);
  }

  // Step 2: Get the hex part (without #)
  const hexPart = strValue.replace(/^#/, '');
  const hexLength = hexPart.length;

  // Step 3: Validate based on format option
  const format = colorConfig.format || 'both';
  const allowAlpha = colorConfig.allowAlpha || false;

  let isValidFormat = false;
  let formatError = '';

  switch (format) {
    case 'short':
      // Only 3-character format allowed
      if (hexLength === 3 && HEX_COLOR_PATTERNS.short.test(strValue)) {
        isValidFormat = true;
      } else {
        formatError = 'must be a 3-character hex color (e.g., #RGB)';
      }
      break;

    case 'long':
      // Only 6-character format allowed (or 8 if alpha is allowed)
      if (hexLength === 6 && HEX_COLOR_PATTERNS.long.test(strValue)) {
        isValidFormat = true;
      } else if (allowAlpha && hexLength === 8 && HEX_COLOR_PATTERNS.alpha.test(strValue)) {
        isValidFormat = true;
      } else {
        formatError = allowAlpha
          ? 'must be a 6 or 8-character hex color (e.g., #RRGGBB or #RRGGBBAA)'
          : 'must be a 6-character hex color (e.g., #RRGGBB)';
      }
      break;

    case 'both':
    default:
      // Both 3 and 6 character formats allowed (or 8 if alpha is allowed)
      if (allowAlpha) {
        if (HEX_COLOR_PATTERNS.any.test(strValue)) {
          isValidFormat = true;
        } else {
          formatError = 'must be a valid hex color (e.g., #RGB, #RRGGBB, or #RRGGBBAA)';
        }
      } else {
        if (HEX_COLOR_PATTERNS.noAlpha.test(strValue)) {
          isValidFormat = true;
        } else {
          formatError = 'must be a valid hex color (e.g., #RGB or #RRGGBB)';
        }
      }
      break;
  }

  if (!isValidFormat) {
    return errorResult(fieldName, `${fieldLabel} ${formatError}`);
  }

  // Return normalized value (always with # prefix, lowercase)
  return successResult(normalizeHexColor(strValue));
};
