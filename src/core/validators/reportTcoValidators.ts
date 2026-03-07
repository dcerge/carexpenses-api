// ./src/core/validators/reportTcoValidators.ts
import { BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

// =============================================================================
// Constants
// =============================================================================

const SUPPORTED_LANGS = ['en', 'ru', 'fr', 'es'];
const TREND_MONTHS_MIN = 1;
const TREND_MONTHS_MAX = 120; // 10 years max

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Validate TCO report params.
 * All fields are optional — validate only what is provided.
 */
const validateGet = async (args: any, opt: BaseCoreActionsInterface) => {
  const { params } = args || {};

  // No params at all is fine — all have defaults
  if (!params) {
    return [true, {}];
  }

  const { carIds, lang, trendMonths, timezoneOffset } = params;

  const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
  let hasErrors = false;

  // ---------------------------------------------------------------------------
  // carIds: optional array of UUIDs
  // ---------------------------------------------------------------------------

  if (carIds != null) {
    if (!Array.isArray(carIds)) {
      opResult.addError('carIds', 'Car IDs must be an array');
      hasErrors = true;
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const carId of carIds) {
        if (carId != null && !uuidRegex.test(carId)) {
          opResult.addError('carIds', `Invalid car ID format: ${carId}`);
          hasErrors = true;
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // lang: optional, must be one of the supported languages
  // ---------------------------------------------------------------------------

  if (lang != null) {
    if (typeof lang !== 'string' || !SUPPORTED_LANGS.includes(lang)) {
      opResult.addError('lang', `Language must be one of: ${SUPPORTED_LANGS.join(', ')}`);
      hasErrors = true;
    }
  }

  // ---------------------------------------------------------------------------
  // trendMonths: optional integer within allowed range
  // ---------------------------------------------------------------------------

  if (trendMonths != null) {
    const val = Number(trendMonths);
    if (!Number.isInteger(val) || val < TREND_MONTHS_MIN || val > TREND_MONTHS_MAX) {
      opResult.addError(
        'trendMonths',
        `Trend months must be an integer between ${TREND_MONTHS_MIN} and ${TREND_MONTHS_MAX}`,
      );
      hasErrors = true;
    }
  }

  // ---------------------------------------------------------------------------
  // timezoneOffset: optional integer (JS getTimezoneOffset range: -840 to 840)
  // ---------------------------------------------------------------------------

  if (timezoneOffset != null) {
    const val = Number(timezoneOffset);
    if (!Number.isInteger(val) || val < -840 || val > 840) {
      opResult.addError('timezoneOffset', 'Timezone offset must be an integer between -840 and 840');
      hasErrors = true;
    }
  }

  if (hasErrors) {
    return [opResult, {}];
  }

  return [true, {}];
};

// =============================================================================
// Export
// =============================================================================

const validators = {
  get: validateGet,
};

export { validators };