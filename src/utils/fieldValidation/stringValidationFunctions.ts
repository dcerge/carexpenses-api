// ./src/utils/fieldValidation/stringValidationFunctions.ts
import { errorResult, successResult } from './helpers';
import { FieldValidator } from './interfaces';

export const validateShortText: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, minValue, maxValue } = ctx;
  const strValue = String(value);
  const errors: Array<{ field: string; message: string }> = [];

  if (minValue != null && strValue.length < minValue) {
    errors.push({ field: fieldName, message: `${fieldLabel} must be at least ${minValue} characters long` });
  }

  if (maxValue != null && strValue.length > maxValue) {
    errors.push({ field: fieldName, message: `${fieldLabel} must not exceed ${maxValue} characters` });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return successResult(strValue);
};

export const validateBoolean: FieldValidator = async (ctx) => {
  const { value } = ctx;
  const strValue = String(value).toLowerCase().trim();
  const boolValue = ['true', '1', 'yes', 'on'].includes(strValue);
  return successResult(boolValue);
};

export const validateRegularExpression: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;

  if (!options) {
    return errorResult(fieldName, `${fieldLabel} configuration error: regex pattern not defined`);
  }

  try {
    const regex = new RegExp(options);
    const strValue = String(value);

    if (!regex.test(strValue)) {
      return errorResult(fieldName, `${fieldLabel} does not match the required pattern`);
    }

    return successResult(strValue);
  } catch {
    return errorResult(fieldName, `${fieldLabel} configuration error: invalid regex pattern`);
  }
};
