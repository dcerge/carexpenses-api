import { errorResult, successResult, formatErrorMessage } from './helpers';
import { FieldValidator, NumberFieldOptions } from './interfaces';
import { parseOptions } from '../parserHelpers';

const DEFAULT_NUMBER_OPTIONS: NumberFieldOptions = {
  numberType: 'decimal',
  decimalPlaces: undefined,
};

export const validateNumber: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, minValue, maxValue, options, customErrorMessage } = ctx;
  const numValue = Number(value);
  const errors: Array<{ field: string; message: string }> = [];

  const fieldOptions = parseOptions<NumberFieldOptions>(options, DEFAULT_NUMBER_OPTIONS);

  if (isNaN(numValue)) {
    const message = formatErrorMessage({
      customMessage: customErrorMessage,
      defaultMessage: `${fieldLabel} must be a valid number`,
      variables: { fieldName, fieldLabel, value },
    });
    return errorResult(fieldName, message);
  }

  // Check if integer is required
  if (fieldOptions.numberType === 'integer' && !Number.isInteger(numValue)) {
    const message = formatErrorMessage({
      customMessage: customErrorMessage,
      defaultMessage: `${fieldLabel} must be a whole number (no decimals)`,
      variables: { fieldName, fieldLabel, value, ...fieldOptions },
    });
    return errorResult(fieldName, message);
  }

  // Check decimal places if specified (only applies to decimal type)
  if (fieldOptions.numberType === 'decimal' && fieldOptions.decimalPlaces != null) {
    const valueStr = String(value);
    const decimalIndex = valueStr.indexOf('.');

    if (decimalIndex !== -1) {
      const actualDecimalPlaces = valueStr.length - decimalIndex - 1;

      if (actualDecimalPlaces > fieldOptions.decimalPlaces) {
        const message = formatErrorMessage({
          customMessage: customErrorMessage,
          defaultMessage:
            fieldOptions.decimalPlaces === 0
              ? `${fieldLabel} must not have decimal places`
              : `${fieldLabel} must have at most ${fieldOptions.decimalPlaces} decimal place${fieldOptions.decimalPlaces === 1 ? '' : 's'}`,
          variables: {
            fieldName,
            fieldLabel,
            value,
            decimalPlaces: fieldOptions.decimalPlaces,
            actualDecimalPlaces,
            ...fieldOptions,
          },
        });
        return errorResult(fieldName, message);
      }
    }
  }

  if (minValue != null && numValue < minValue) {
    const message = formatErrorMessage({
      customMessage: customErrorMessage,
      defaultMessage: `${fieldLabel} must be at least ${minValue}`,
      variables: { fieldName, fieldLabel, value: numValue, minValue, maxValue, ...fieldOptions },
    });
    errors.push({ field: fieldName, message });
  }

  if (maxValue != null && numValue > maxValue) {
    const message = formatErrorMessage({
      customMessage: customErrorMessage,
      defaultMessage: `${fieldLabel} must not exceed ${maxValue}`,
      variables: { fieldName, fieldLabel, value: numValue, minValue, maxValue, ...fieldOptions },
    });
    errors.push({ field: fieldName, message });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return successResult(numValue);
};
