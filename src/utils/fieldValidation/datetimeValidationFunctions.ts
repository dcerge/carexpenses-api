// ./src/utils/fieldValidation/datetimeValidationFunctions.ts
import { errorResult, successResult } from './helpers';
import { BirthdateFieldOptions, DateFieldOptions, FieldValidator } from './interfaces';
import { parseOptions } from '../parserHelpers';

export const validateDate: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const strValue = String(value).trim();

  if (!dateRegex.test(strValue)) {
    return errorResult(fieldName, `${fieldLabel} must be in format YYYY-MM-DD`);
  }

  const date = new Date(strValue);
  if (isNaN(date.getTime())) {
    return errorResult(fieldName, `${fieldLabel} is not a valid date`);
  }

  if (options) {
    const dateOptions = parseOptions<DateFieldOptions>(options, {});
    const inputDate = new Date(strValue);

    if (dateOptions.minDate) {
      const minDate = new Date(dateOptions.minDate);
      if (!isNaN(minDate.getTime()) && inputDate < minDate) {
        return errorResult(fieldName, `${fieldLabel} cannot be before ${dateOptions.minDate}`);
      }
    }

    if (dateOptions.maxDate) {
      const maxDate = new Date(dateOptions.maxDate);
      if (!isNaN(maxDate.getTime()) && inputDate > maxDate) {
        return errorResult(fieldName, `${fieldLabel} cannot be after ${dateOptions.maxDate}`);
      }
    }
  }

  return successResult(strValue);
};

export const validateBirthdate: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const strValue = String(value).trim();

  // Validate format
  if (!dateRegex.test(strValue)) {
    return errorResult(fieldName, `${fieldLabel} must be in format YYYY-MM-DD`);
  }

  // Validate it's a real date
  const birthdate = new Date(strValue + 'T00:00:00');
  if (isNaN(birthdate.getTime())) {
    return errorResult(fieldName, `${fieldLabel} is not a valid date`);
  }

  // Ensure birthdate is not in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (birthdate > today) {
    return errorResult(fieldName, `${fieldLabel} cannot be a future date`);
  }

  // Calculate age
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  const dayDiff = today.getDate() - birthdate.getDate();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  // Parse options for age limits
  const birthdateOptions = parseOptions<BirthdateFieldOptions>(options, {});

  // Check minAge
  if (birthdateOptions.minAge != null) {
    const minAge = Number(birthdateOptions.minAge);
    if (!isNaN(minAge) && age < minAge) {
      return errorResult(fieldName, `${fieldLabel} indicates age ${age}, but minimum required age is ${minAge}`);
    }
  }

  // Check maxAge
  if (birthdateOptions.maxAge != null) {
    const maxAge = Number(birthdateOptions.maxAge);
    if (!isNaN(maxAge) && age > maxAge) {
      return errorResult(fieldName, `${fieldLabel} indicates age ${age}, but maximum allowed age is ${maxAge}`);
    }
  }

  return successResult(strValue);
};

export const validateBirthday: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value } = ctx;
  const birthdayRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  const strValue = String(value).trim();

  if (!birthdayRegex.test(strValue)) {
    return errorResult(fieldName, `${fieldLabel} must be in format MM-DD`);
  }

  const [month, day] = strValue.split('-').map(Number);
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (day > daysInMonth[month - 1]) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return errorResult(fieldName, `${fieldName} is invalid: ${monthNames[month - 1]} cannot have ${day} days`);
  }

  return successResult(strValue);
};

export const validateTime: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value } = ctx;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  const strValue = String(value).trim();

  if (!timeRegex.test(strValue)) {
    return errorResult(fieldName, `${fieldLabel} must be in format HH:MM or HH:MM:SS`);
  }

  return successResult(strValue);
};

export const validateDatetime: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value } = ctx;
  const date = new Date(String(value));

  if (isNaN(date.getTime())) {
    return errorResult(fieldName, `${fieldLabel} must be a valid datetime`);
  }

  return successResult(date.toISOString());
};
