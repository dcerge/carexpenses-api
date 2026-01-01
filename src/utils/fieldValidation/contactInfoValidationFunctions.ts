/**
 * Contact field validators: Email, Phone, URL
 */

import { logger } from '../../logger';
import { extractDomainFromEmail, verifyDomainBatch } from './domainVerification';
import { errorResult, successResult } from './helpers';
import { EmailFieldOptions, FieldValidator, PhoneFieldOptions, UrlFieldOptions } from './interfaces';
import { parseOptions } from '../parserHelpers';

// Basic email regex - validates format only
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Plus addressing regex - matches +label in local part
const PLUS_ADDRESS_REGEX = /^([^+]+)\+[^@]*(@.+)$/;

/**
 * Validate email format
 */
const validateEmailFormat = (email: string): { valid: boolean; error?: string } => {
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'must be a valid email address' };
  }
  return { valid: true };
};

/**
 * Check plus addressing rules and optionally strip +label
 */
const handlePlusAddressing = (
  email: string,
  mode: 'allow' | 'forbid' | 'strip',
): { email: string; valid: boolean; error?: string } => {
  const match = email.match(PLUS_ADDRESS_REGEX);
  const hasPlusAddressing = match !== null;

  if (!hasPlusAddressing) {
    return { email, valid: true };
  }

  switch (mode) {
    case 'forbid':
      return {
        email,
        valid: false,
        error: 'plus addressing (+label) is not allowed',
      };

    case 'strip':
      // Remove +label portion: user+label@domain.com -> user@domain.com
      return {
        email: `${match[1]}${match[2]}`,
        valid: true,
      };

    case 'allow':
    default:
      return { email, valid: true };
  }
};

/**
 * Check if domain is in blocked list
 */
const checkBlockedDomains = (domain: string, blockedDomains: string[]): boolean => {
  const normalizedDomain = domain.toLowerCase();
  return blockedDomains.some((blocked) => normalizedDomain === blocked.toLowerCase());
};

/**
 * Check if domain is in allowed list
 */
const checkAllowedDomains = (domain: string, allowedDomains: string[]): boolean => {
  const normalizedDomain = domain.toLowerCase();
  return allowedDomains.some((allowed) => normalizedDomain === allowed.toLowerCase());
};

/**
 * Email field validator with advanced options
 *
 * Supports:
 * - Basic format validation
 * - Domain existence check (DNS)
 * - MX record validation
 * - Plus addressing control
 * - Domain allowlist/blocklist
 *
 * Uses batch verification to minimize database calls:
 * - 1 DB read to check cache
 * - 1 DB write to update cache (if verification performed)
 */
export const validateEmail: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options, core } = ctx;

  // Normalize and trim
  let email = String(value).trim().toLowerCase();

  // Parse options with defaults
  const emailConfig = parseOptions<EmailFieldOptions>(options, {
    plusAddressing: 'allow',
    validateDomainExists: false,
    validateDomainAcceptsEmail: false,
  });

  // Step 1: Basic format validation
  const formatResult = validateEmailFormat(email);
  if (!formatResult.valid) {
    return errorResult(fieldName, `${fieldLabel} ${formatResult.error}`);
  }

  // Step 2: Handle plus addressing
  const plusResult = handlePlusAddressing(email, emailConfig.plusAddressing || 'allow');
  if (!plusResult.valid) {
    return errorResult(fieldName, `${fieldLabel} ${plusResult.error}`);
  }
  email = plusResult.email;

  // Extract domain for further checks
  const domain = extractDomainFromEmail(email);

  if (!domain) {
    return errorResult(fieldName, `${fieldLabel} must be a valid email address`);
  }

  // Step 3: Check domain blocklist
  if (emailConfig.blockedDomains && emailConfig.blockedDomains.length > 0) {
    if (checkBlockedDomains(domain, emailConfig.blockedDomains)) {
      return errorResult(fieldName, `${fieldLabel} domain is not allowed`);
    }
  }

  // Step 4: Check domain allowlist
  if (emailConfig.allowedDomains && emailConfig.allowedDomains.length > 0) {
    if (!checkAllowedDomains(domain, emailConfig.allowedDomains)) {
      return errorResult(fieldName, `${fieldLabel} must use an allowed domain`);
    }
  }

  // Step 5: Domain verification (DNS and/or MX) - single batch call
  const needsDnsCheck = emailConfig.validateDomainExists === true;
  const needsMxCheck = emailConfig.validateDomainAcceptsEmail === true;

  if (needsDnsCheck || needsMxCheck) {
    try {
      const gateway = core.getGateways().domainVerificationGw;

      // Single batch verification call - minimizes DB operations
      const verificationResult = await verifyDomainBatch(
        domain,
        {
          checkDns: needsDnsCheck,
          checkMx: needsMxCheck,
        },
        gateway,
      );

      // Check DNS result
      if (needsDnsCheck && verificationResult.dnsValid === false) {
        logger.debug(`Domain existence check failed for ${domain}: ${verificationResult.errors.dns}`);
        return errorResult(fieldName, `${fieldLabel} domain does not exist`);
      }

      // Check MX result
      if (needsMxCheck && verificationResult.mxValid === false) {
        logger.debug(`MX check failed for ${domain}: ${verificationResult.errors.mx}`);
        return errorResult(fieldName, `${fieldLabel} domain cannot receive emails`);
      }
    } catch (error: any) {
      // Fail open - if verification service is unavailable, allow the email
      logger.error(`Domain verification service error for ${domain}:`, error.message);
    }
  }

  return successResult(email);
};

/**
 * Phone field validator
 */
export const validatePhone: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, minValue, maxValue, options } = ctx;
  const strValue = String(value).trim();

  const phoneConfig = parseOptions<PhoneFieldOptions>(options, {});

  if (phoneConfig.requireInternational === true && !strValue.startsWith('+')) {
    return errorResult(fieldName, `${fieldLabel} must be in international format (starting with +)`);
  }

  const cleanPhone = strValue.replace(/[\s\-\(\)\.]/g, '');
  const digitsOnly = cleanPhone.replace(/^\+/, '');

  if (!/^\d+$/.test(digitsOnly)) {
    return errorResult(fieldName, `${fieldLabel} must contain only digits and valid formatting characters`);
  }

  const minLength = minValue != null ? minValue : 7;
  const maxLength = maxValue != null ? maxValue : 15;

  if (digitsOnly.length < minLength) {
    return errorResult(fieldName, `${fieldLabel} must be at least ${minLength} digits long`);
  }

  if (digitsOnly.length > maxLength) {
    return errorResult(fieldName, `${fieldLabel} must not exceed ${maxLength} digits`);
  }

  if (phoneConfig.allowedAreaCodes && Array.isArray(phoneConfig.allowedAreaCodes)) {
    const areaCodeLength = phoneConfig.areaCodeLength || 3;
    const areaCode = digitsOnly.substring(0, areaCodeLength);

    if (!phoneConfig.allowedAreaCodes.includes(areaCode)) {
      return errorResult(fieldName, `${fieldLabel} area code ${areaCode} is not allowed`);
    }
  }

  return successResult(strValue.startsWith('+') ? `+${digitsOnly}` : digitsOnly);
};

/**
 * Validate URL format requirements
 */
const validateUrlFormat = (
  url: URL,
  format: 'any' | 'domain_only' | 'with_path',
): { valid: boolean; error?: string } => {
  const path = url.pathname;
  const hasPath = path !== '' && path !== '/';

  switch (format) {
    case 'domain_only':
      if (hasPath) {
        return { valid: false, error: 'must be a domain only (no path allowed)' };
      }
      break;

    case 'with_path':
      if (!hasPath) {
        return { valid: false, error: 'must include a path' };
      }
      break;

    case 'any':
    default:
      // Any format is acceptable
      break;
  }

  return { valid: true };
};

/**
 * URL field validator with advanced options
 *
 * Supports:
 * - Basic format validation
 * - Protocol validation (http, https, ftp, etc.)
 * - URL format control (domain only, with path, any)
 * - Query parameter control
 * - Hash/fragment control
 * - Domain existence check (DNS)
 * - HTTP liveness check
 *
 * Uses batch verification to minimize database calls:
 * - 1 DB read to check cache
 * - 1 DB write to update cache (if verification performed)
 */
export const validateUrl: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options, core } = ctx;

  const strValue = String(value).trim();

  // Parse options with defaults
  const urlConfig = parseOptions<UrlFieldOptions>(options, {
    validateDomainExists: false,
    validateUrlIsLive: false,
    urlFormat: 'any',
    allowQuery: true,
    allowHash: true,
  });

  // Step 1: Basic URL parsing and protocol validation
  let url: URL;
  try {
    url = new URL(strValue);
    const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:', 'sftp:'];
    if (!allowedProtocols.includes(url.protocol)) {
      return errorResult(fieldName, `${fieldLabel} must use a valid protocol (http, https, ftp)`);
    }
  } catch {
    return errorResult(fieldName, `${fieldLabel} must be a valid URL`);
  }

  // Extract domain immediately after parsing
  const domain = url.hostname.toLowerCase();

  if (!domain) {
    return errorResult(fieldName, `${fieldLabel} must be a valid URL`);
  }

  // Step 2: Check query parameters
  if (urlConfig.allowQuery === false && url.search) {
    return errorResult(fieldName, `${fieldLabel} must not contain query parameters`);
  }

  // Step 3: Check hash/fragment
  if (urlConfig.allowHash === false && url.hash) {
    return errorResult(fieldName, `${fieldLabel} must not contain a hash/fragment`);
  }

  // Step 4: Validate URL format (domain only, with path, any)
  const formatResult = validateUrlFormat(url, urlConfig.urlFormat || 'any');
  if (!formatResult.valid) {
    return errorResult(fieldName, `${fieldLabel} ${formatResult.error}`);
  }

  // Step 5: Domain verification (DNS and/or HTTP liveness) - single batch call
  const needsDnsCheck = urlConfig.validateDomainExists === true;
  const needsHttpCheck = urlConfig.validateUrlIsLive === true;

  if (needsDnsCheck || needsHttpCheck) {
    try {
      const gateway = core.getGateways().domainVerificationGw;

      // Single batch verification call - minimizes DB operations
      const verificationResult = await verifyDomainBatch(
        domain,
        {
          checkDns: needsDnsCheck,
          checkHttp: needsHttpCheck,
        },
        gateway,
      );

      // Check DNS result
      if (needsDnsCheck && verificationResult.dnsValid === false) {
        logger.debug(`Domain existence check failed for ${domain}: ${verificationResult.errors.dns}`);
        return errorResult(fieldName, `${fieldLabel} domain does not exist`);
      }

      // Check HTTP liveness result
      if (needsHttpCheck && verificationResult.httpLive === false) {
        logger.debug(`HTTP liveness check failed for ${domain}: ${verificationResult.errors.http}`);
        return errorResult(fieldName, `${fieldLabel} URL is not accessible`);
      }
    } catch (error: any) {
      // Fail open - if verification service is unavailable, allow the URL
      logger.error(`Domain verification service error for ${domain}:`, error.message);
    }
  }

  return successResult(url.toString());
};
