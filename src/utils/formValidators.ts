// ./src/utils/formValidators.ts
import { mapArrayBy } from '@sdflc/utils';
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import { FIELD_TYPE_IDS, SUBMISSION_STATUSES } from '../boundary';
import { logger } from '../logger';

import {
  FieldValidator,
  normalizeValueForUniqueness,
  UniquenessUpdate,
  ValidationResultData,
  validateBoolean,
  validateRegularExpression,
  validateShortText,
  validateNumber,
  validateEmail,
  validatePhone,
  validateUrl,
  validateBirthdate,
  validateBirthday,
  validateDate,
  validateDatetime,
  validateTime,
  validateMultipleChoice,
  validateLookup,
  validateFile,
  validateAntispambot,
  validateRecaptcha2,
  validateRecaptcha3,
  validateRecaptchaEnterprise,
  validateCreditCard,
  validateUuid,
  validateHexColor,
  validatePassword,
  validateUsername,
  validateSlug,
  validateCoordinates,
  formatErrorMessage,
} from './fieldValidation';
import { parseOptions } from './parserHelpers';

const fieldValidators: Record<string, FieldValidator> = {
  [FIELD_TYPE_IDS.SHORT_TEXT]: validateShortText,
  [FIELD_TYPE_IDS.LONG_TEXT]: validateShortText, // Same validation logic
  [FIELD_TYPE_IDS.NUMBER]: validateNumber,
  [FIELD_TYPE_IDS.EMAIL]: validateEmail,
  [FIELD_TYPE_IDS.PHONE]: validatePhone,
  [FIELD_TYPE_IDS.URL]: validateUrl,
  [FIELD_TYPE_IDS.DATE]: validateDate,
  [FIELD_TYPE_IDS.BIRTHDATE]: validateBirthdate,
  [FIELD_TYPE_IDS.BIRTHDAY]: validateBirthday,
  [FIELD_TYPE_IDS.TIME]: validateTime,
  [FIELD_TYPE_IDS.DATETIME]: validateDatetime,
  [FIELD_TYPE_IDS.BOOLEAN]: validateBoolean,
  [FIELD_TYPE_IDS.REGULAR_EXPRESSION]: validateRegularExpression,
  [FIELD_TYPE_IDS.MULTIPLE_CHOICE]: validateMultipleChoice,
  [FIELD_TYPE_IDS.FILE]: validateFile,
  [FIELD_TYPE_IDS.ANTISPAMBOT]: validateAntispambot,
  [FIELD_TYPE_IDS.RECAPTCHA2]: validateRecaptcha2,
  [FIELD_TYPE_IDS.RECAPTCHA3]: validateRecaptcha3,
  [FIELD_TYPE_IDS.RECAPTCHA_ENTERPRISE]: validateRecaptchaEnterprise,
  [FIELD_TYPE_IDS.LOOKUP]: validateLookup,
  [FIELD_TYPE_IDS.CREDIT_CARD]: validateCreditCard,
  [FIELD_TYPE_IDS.UUID]: validateUuid,
  [FIELD_TYPE_IDS.HEX_COLOR]: validateHexColor,
  [FIELD_TYPE_IDS.PASSWORD]: validatePassword,
  [FIELD_TYPE_IDS.USERNAME]: validateUsername,
  [FIELD_TYPE_IDS.SLUG]: validateSlug,
  [FIELD_TYPE_IDS.COORDINATES]: validateCoordinates,
};

// ============================================================================
// Main Validation Function
// ============================================================================

export const validateFormData = async (params: any) => {
  const { receivedData, formFields, form, core } = params;
  const { formData, formFiles } = receivedData;

  const result = new OpResult();

  if (!formFields || formFields.length === 0) {
    result.setData({
      ...receivedData,
      replyTo: undefined,
      uniquenessUpdates: [],
    });
    return result;
  }

  const mapFieldNameToFormField = mapArrayBy(formFields, 'name');
  const validatedData: any = {};
  let submissionStatus = SUBMISSION_STATUSES.RECEIVED;
  let replyTo: string | undefined;
  const uniquenessUpdates: UniquenessUpdate[] = [];

  // Validate each configured field
  for (const formField of formFields) {
    const fieldName = formField.name;
    const fieldLabel = formField.label || fieldName;
    const fieldType = formField.fieldType;
    const isRequired = formField.required === true || formField.required === 1;
    const minValue = formField.minValue != null ? formField.minValue : formField.min_value;
    const maxValue = formField.maxValue != null ? formField.maxValue : formField.max_value;
    const options = formField.options;
    const defaultValue = formField.defaultValue;
    const customErrorMessage = formField.customErrorMessage;
    const maxUniqueValues = formField.maxUniqueValues;
    const messageOnUniqueness = formField.messageOnUniqueness;
    const isReplyTo = formField.isReplyTo === true || formField.isReplyTo === 1;

    // Get the raw value from formData
    let value = formData[fieldName];
    const files = formFiles?.[fieldName];

    // Apply defaultValue if field is missing or empty (except for FILE type)
    if (fieldType !== FIELD_TYPE_IDS.FILE) {
      if ((value === null || value === undefined || value === '') && defaultValue != null) {
        value = defaultValue;
        // Update formData so it's available for other field references
        formData[fieldName] = value;
      }
    }

    // Build variables for custom error message formatting
    const parsedOptions = options ? parseOptions<Record<string, any>>(options, {}) : {};
    const errorVariables: Record<string, any> = {
      fieldName,
      fieldLabel,
      minValue,
      maxValue,
      value,
      ...parsedOptions,
    };

    // Helper to format error message for this field
    const getErrorMessage = (defaultMsg: string): string => {
      return formatErrorMessage({
        customMessage: customErrorMessage,
        defaultMessage: defaultMsg,
        variables: errorVariables,
      });
    };

    // Get the validator for this field type
    const validator = fieldValidators[fieldType];

    if (!validator) {
      // Unknown field type, accept as-is
      validatedData[fieldName] = value;
      continue;
    }

    // Special handling for FILE type - check files instead of value for required check
    if (fieldType === FIELD_TYPE_IDS.FILE) {
      const validationResult = await validator({
        fieldName,
        fieldLabel,
        value,
        files,
        formField,
        minValue,
        maxValue,
        options,
        isRequired,
        formData,
        core,
        customErrorMessage,
      });

      if (!validationResult.isValid && validationResult.errors) {
        for (const error of validationResult.errors) {
          const errorMsg = getErrorMessage(error.message);
          result.addError(error.field, errorMsg, OP_RESULT_CODES.VALIDATION_FAILED);
        }
      }
      // Files are stored separately, not in validatedData
      continue;
    }

    // Check if required field is missing or empty
    if (isRequired) {
      if (value === null || value === undefined || value === '') {
        const errorMsg = getErrorMessage(`${fieldLabel} is required`);
        result.addError(fieldName, errorMsg, OP_RESULT_CODES.VALIDATION_FAILED);
        continue;
      }
    }

    // Skip validation if field is not required and value is empty
    if (!isRequired && (value === null || value === undefined || value === '')) {
      validatedData[fieldName] = value;
      continue;
    }

    // Run the validator
    const validationResult = await validator({
      fieldName,
      fieldLabel,
      value,
      files,
      formField,
      minValue,
      maxValue,
      options,
      isRequired,
      formData,
      core,
      customErrorMessage,
    });

    if (!validationResult.isValid && validationResult.errors) {
      for (const error of validationResult.errors) {
        const errorMsg = getErrorMessage(error.message);
        result.addError(error.field, errorMsg, OP_RESULT_CODES.VALIDATION_FAILED);
      }
      continue;
    }

    // Handle special submission status changes (e.g., honeypot)
    if (validationResult.submissionStatus) {
      submissionStatus = validationResult.submissionStatus;
    }

    // Store validated value (if any - some validators like reCAPTCHA don't store values)
    if (validationResult.validatedValue !== undefined) {
      validatedData[fieldName] = validationResult.validatedValue;
    }

    // Handle isReplyTo for email fields
    if (isReplyTo && fieldType === FIELD_TYPE_IDS.EMAIL && validationResult.validatedValue) {
      replyTo = validationResult.validatedValue;
    }

    // Check uniqueness if maxUniqueValues is configured
    if (maxUniqueValues != null && maxUniqueValues > 0 && validationResult.validatedValue !== undefined) {
      const normalizedValue = normalizeValueForUniqueness(validationResult.validatedValue);

      if (normalizedValue && form?.id && form?.accountId) {
        try {
          // Query current count for this field value
          const existingRecords = await core.getGateways().formFieldIndexGw.list({
            filter: {
              accountId: form.accountId,
              formId: form.id,
              formFieldId: formField.id,
              fieldValue: normalizedValue,
            },
            params: {
              pagination: { pageSize: 1 },
            },
          });

          const existingRecord = existingRecords?.[0];
          const currentCount = existingRecord?.fieldValueQty || existingRecord?.field_value_qty || 0;

          if (currentCount >= maxUniqueValues) {
            // Uniqueness limit reached
            const defaultUniquenessMsg =
              maxUniqueValues === 1
                ? `${fieldLabel} value "${validationResult.validatedValue}" has already been submitted`
                : `${fieldLabel} value "${validationResult.validatedValue}" has reached the maximum allowed submissions (${maxUniqueValues})`;

            const errorMsg = formatErrorMessage({
              customMessage: messageOnUniqueness,
              defaultMessage: defaultUniquenessMsg,
              variables: {
                ...errorVariables,
                currentCount,
                maxUniqueValues,
              },
            });

            result.addError(fieldName, errorMsg, OP_RESULT_CODES.VALIDATION_FAILED);
            continue;
          }

          // Add to uniqueness updates for later increment
          uniquenessUpdates.push({
            accountId: form.accountId,
            formId: form.id,
            formFieldId: formField.id,
            fieldValue: normalizedValue,
          });
        } catch (error) {
          logger.error(`Failed to check uniqueness for field ${fieldName}:`, error);
          // Decide policy: fail open or closed
          // Fail closed is safer - reject if we can't verify
          result.addError(
            fieldName,
            `${fieldLabel} validation failed: unable to verify uniqueness`,
            OP_RESULT_CODES.VALIDATION_FAILED,
          );
          continue;
        }
      }
    }
  }

  // Include extra fields that are not in the form configuration
  // Unless ignoreExtraFields is set on the form
  const ignoreExtraFields = form?.ignoreExtraFields === true || form?.ignore_extra_fields === true;

  for (const fieldName in formData) {
    if (!mapFieldNameToFormField[fieldName]) {
      if (ignoreExtraFields) {
        // Log that we're ignoring this field
        logger.log(`Ignoring extra field "${fieldName}" not present in form configuration (ignoreExtraFields=true)`);
      } else {
        validatedData[fieldName] = formData[fieldName];
      }
    }
  }

  if (result.didSucceed()) {
    const resultData: ValidationResultData = {
      mode: receivedData.mode,
      submissionStatus,
      formData: validatedData,
      formFiles: formFiles,
      replyTo,
      uniquenessUpdates,
    };
    result.setData(resultData);
  }

  return result;
};
