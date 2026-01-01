// ./src/utils/fieldValidation/creditCardValidationFunctions.ts

import { errorResult, successResult } from './helpers';
import { CreditCardFieldOptions, FieldValidator } from './interfaces';
import { parseOptions } from '../parserHelpers';

/**
 * Luhn algorithm for credit card validation
 */
export const luhnCheck = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Detect credit card type based on number prefix and length
 */
export const detectCardType = (
  cardNumber: string,
): 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay' | 'unknown' => {
  const digits = cardNumber.replace(/\D/g, '');

  // Visa: starts with 4, length 13-19
  if (/^4/.test(digits) && digits.length >= 13 && digits.length <= 19) {
    return 'visa';
  }

  // Mastercard: starts with 51-55 or 2221-2720, length 16
  if (/^(5[1-5]|2[2-7])/.test(digits) && digits.length === 16) {
    return 'mastercard';
  }

  // American Express: starts with 34 or 37, length 15
  if (/^3[47]/.test(digits) && digits.length === 15) {
    return 'amex';
  }

  // Discover: starts with 6011, 644-649, 65, length 16-19
  if (/^(6011|64[4-9]|65)/.test(digits) && digits.length >= 16 && digits.length <= 19) {
    return 'discover';
  }

  // Diners Club: starts with 36, 38, or 300-305, length 14-19
  if (/^(36|38|30[0-5])/.test(digits) && digits.length >= 14 && digits.length <= 19) {
    return 'diners';
  }

  // JCB: starts with 3528-3589, length 16-19
  if (/^35(2[89]|[3-8])/.test(digits) && digits.length >= 16 && digits.length <= 19) {
    return 'jcb';
  }

  // UnionPay: starts with 62, length 16-19
  if (/^62/.test(digits) && digits.length >= 16 && digits.length <= 19) {
    return 'unionpay';
  }

  return 'unknown';
};

export const validateCreditCard: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;
  const strValue = String(value).trim();

  // Remove spaces, dashes, and other common separators
  const cleanedNumber = strValue.replace(/[\s\-\.]/g, '');

  // Check if it contains only digits
  if (!/^\d+$/.test(cleanedNumber)) {
    return errorResult(fieldName, `${fieldLabel} must contain only digits`);
  }

  // Check length (most cards are 13-19 digits)
  if (cleanedNumber.length < 13 || cleanedNumber.length > 19) {
    return errorResult(fieldName, `${fieldLabel} must be between 13 and 19 digits`);
  }

  // Luhn algorithm check
  if (!luhnCheck(cleanedNumber)) {
    return errorResult(fieldName, `${fieldLabel} is not a valid credit card number`);
  }

  // Detect card type
  const cardType = detectCardType(cleanedNumber);

  // Parse options for additional validation
  const cardConfig = parseOptions<CreditCardFieldOptions>(options, {});

  // Check if card type is allowed
  if (cardConfig.allowedTypes && Array.isArray(cardConfig.allowedTypes) && cardConfig.allowedTypes.length > 0) {
    const normalizedAllowedTypes = cardConfig.allowedTypes.map((t) => t.toLowerCase());

    if (!normalizedAllowedTypes.includes(cardType)) {
      const displayTypes = cardConfig.allowedTypes.join(', ');
      return errorResult(
        fieldName,
        `${fieldLabel} card type "${cardType}" is not accepted. Allowed types: ${displayTypes}`,
      );
    }
  }

  // Return value - optionally mask or include card type
  let returnValue: any;

  if (cardConfig.maskNumber) {
    // Mask all but last 4 digits: **** **** **** 1234
    const lastFour = cleanedNumber.slice(-4);
    const masked = '*'.repeat(cleanedNumber.length - 4) + lastFour;
    returnValue = cardConfig.returnCardType ? { number: masked, type: cardType } : masked;
  } else {
    returnValue = cardConfig.returnCardType ? { number: cleanedNumber, type: cardType } : cleanedNumber;
  }

  return successResult(returnValue);
};
