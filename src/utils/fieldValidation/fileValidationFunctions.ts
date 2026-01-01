import { errorResult, successResult } from './helpers';
import { FieldValidator, FileFieldOptions } from './interfaces';
import { parseOptions } from '../parserHelpers';

export const validateFile: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, files, minValue, maxValue, options, isRequired } = ctx;

  if (isRequired && (!files || files.length === 0)) {
    return errorResult(fieldName, `${fieldLabel} is required`);
  }

  if (!files || files.length === 0) {
    return successResult(undefined);
  }

  const fileConfig = parseOptions<FileFieldOptions>(options, {});
  const errors: Array<{ field: string; message: string }> = [];

  if (fileConfig.maxQuantity != null && files.length > fileConfig.maxQuantity) {
    errors.push({
      field: fieldName,
      message: `${fieldLabel} allows a maximum of ${fileConfig.maxQuantity} file(s), but ${files.length} were uploaded`,
    });
  }

  for (const file of files) {
    const fileSizeKB = file.size / 1024;

    if (minValue != null && fileSizeKB < minValue) {
      errors.push({
        field: fieldName,
        message: `File "${file.originalname}" is too small. Minimum size is ${minValue} KB`,
      });
    }

    if (maxValue != null && fileSizeKB > maxValue) {
      errors.push({
        field: fieldName,
        message: `File "${file.originalname}" is too large. Maximum size is ${maxValue} KB`,
      });
    }

    if (fileConfig.extensions && Array.isArray(fileConfig.extensions) && fileConfig.extensions.length > 0) {
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
      const allowedExtensions = fileConfig.extensions.map((ext: string) => ext.toLowerCase().replace(/^\./, ''));

      if (!allowedExtensions.includes(fileExtension)) {
        errors.push({
          field: fieldName,
          message: `File "${file.originalname}" has invalid extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return successResult(files);
};
