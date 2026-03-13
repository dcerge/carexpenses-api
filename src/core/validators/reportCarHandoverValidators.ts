// ./src/core/validators/reportCarHandoverValidators.ts
import { BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

// =============================================================================
// Constants
// =============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Validate car handover report params.
 * carId is required. timezoneOffset is optional.
 */
const validateGet = async (args: any, opt: BaseCoreActionsInterface) => {
  const { params } = args || {};

  const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
  let hasErrors = false;

  // ---------------------------------------------------------------------------
  // params: required — carId lives inside it
  // ---------------------------------------------------------------------------

  if (!params) {
    opResult.addError('params', 'Report params are required');
    return [opResult, {}];
  }

  const { carId, timezoneOffset } = params;

  // ---------------------------------------------------------------------------
  // carId: required, must be a valid UUID
  // ---------------------------------------------------------------------------

  if (!carId) {
    opResult.addError('carId', 'Car ID is required');
    hasErrors = true;
  } else if (!UUID_REGEX.test(carId)) {
    opResult.addError('carId', `Invalid car ID format: ${carId}`);
    hasErrors = true;
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