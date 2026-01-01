import { errorResult, successResult } from './helpers';
import { FieldValidator, MultipleChoiceFieldOptions } from './interfaces';
import { parseOptions } from '../parserHelpers';

export const validateMultipleChoice: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options, minValue, maxValue, isRequired } = ctx;

  const optionsConfig = parseOptions<MultipleChoiceFieldOptions>(options, { values: [] });

  if (!optionsConfig.values || optionsConfig.values.length === 0) {
    return errorResult(fieldName, `${fieldLabel} configuration error: options not defined`);
  }

  const allowedValues = optionsConfig.values.map((opt) => opt.trim().toLowerCase());

  let selectedValues: string[] = [];

  if (Array.isArray(value)) {
    selectedValues = value.map((v: any) => String(v).trim());
  } else {
    const strValue = String(value).trim();

    if (strValue.startsWith('[')) {
      try {
        const parsed = JSON.parse(strValue);
        if (Array.isArray(parsed)) {
          selectedValues = parsed.map((v: any) => String(v).trim());
        }
      } catch {
        selectedValues = strValue.split(',').map((v: string) => v.trim());
      }
    } else {
      selectedValues = strValue.split(',').map((v: string) => v.trim());
    }
  }

  selectedValues = selectedValues.filter((v) => v !== '');

  if (isRequired && selectedValues.length === 0) {
    return errorResult(fieldName, `${fieldLabel} requires at least one selection`);
  }

  const errors: Array<{ field: string; message: string }> = [];

  if (minValue != null && selectedValues.length < minValue) {
    errors.push({ field: fieldName, message: `${fieldLabel} requires at least ${minValue} selection(s)` });
  }

  if (maxValue != null && selectedValues.length > maxValue) {
    errors.push({ field: fieldName, message: `${fieldLabel} allows a maximum of ${maxValue} selection(s)` });
  }

  const invalidSelections: string[] = [];
  for (const selected of selectedValues) {
    if (!allowedValues.includes(selected.toLowerCase())) {
      invalidSelections.push(selected);
    }
  }

  if (invalidSelections.length > 0) {
    errors.push({
      field: fieldName,
      message: `${fieldLabel} contains invalid selection(s): ${invalidSelections.join(', ')}. Allowed values: ${allowedValues.join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return successResult(selectedValues);
};
