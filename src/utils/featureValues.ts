import { converStringToValue, VALUE_TYPES } from '@sdflc/utils';

export const featureValueTypeToIntType = function (featureValueType: string): number {
  switch (featureValueType?.toLowerCase().trim()) {
    default:
    case 'string':
    case 'text':
      return VALUE_TYPES.STRING;

    case 'integer':
      return VALUE_TYPES.INTEGER;

    case 'decimal':
      return VALUE_TYPES.DECIMAL;

    case 'boolean':
    case 'bool':
      return VALUE_TYPES.BOOLEAN;
  }
};

export const getFeatureValue = (
  featureValue: string,
  featueValueType: string,
  defaultValue: undefined | null | string | number | boolean = undefined,
): null | string | number | boolean => {
  const value = converStringToValue(featureValue, featureValueTypeToIntType(featueValueType));

  if (!value && defaultValue != undefined) {
    return defaultValue;
  }

  return value;
};
