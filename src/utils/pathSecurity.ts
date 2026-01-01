// ./src/utils/pathSecurity.ts
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

/**
 * Dangerous path patterns that could be used for traversal attacks
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./, // Parent directory
  /^\/\//, // Protocol-relative
  /^[a-zA-Z]:/, // Windows drive letter
  /\x00/, // Null byte
  /%2e%2e/i, // URL-encoded ..
  /%252e%252e/i, // Double URL-encoded ..
  /\.\.%2f/i, // Mixed encoding
  /%2f\.\./i, // Mixed encoding
  /\.\.\\/, // Backslash traversal
  /\\\.\\./, // Windows UNC-style
];

/**
 * Allowed placeholder patterns in path/filename templates
 */
const ALLOWED_PLACEHOLDERS = new Set([
  'submissionId',
  'requestId',
  'formId',
  'formName',
  'timestamp',
  'date',
  'year',
  'month',
  'day',
  'randUuid',
]);

/**
 * Validate a path prefix for traversal attacks
 */
export function validatePathPrefix(pathPrefix: string, fieldName = 'pathPrefix'): OpResult {
  const result = new OpResult();

  if (!pathPrefix || pathPrefix.trim() === '') {
    return result; // Empty is valid
  }

  // Check for traversal patterns
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(pathPrefix)) {
      result.addError(fieldName, 'Path contains invalid traversal pattern', OP_RESULT_CODES.VALIDATION_FAILED);
      return result;
    }
  }

  // Check for absolute paths (except leading slash which is okay for some systems)
  if (/^[a-zA-Z]:/.test(pathPrefix)) {
    result.addError(fieldName, 'Absolute Windows paths are not allowed', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Validate placeholders are from allowed list
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = placeholderRegex.exec(pathPrefix)) !== null) {
    const placeholder = match[1];
    if (!ALLOWED_PLACEHOLDERS.has(placeholder)) {
      result.addError(
        fieldName,
        `Invalid placeholder: {{${placeholder}}}. Allowed: ${Array.from(ALLOWED_PLACEHOLDERS).join(', ')}`,
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    }
  }

  // Check max length
  if (pathPrefix.length > 1024) {
    result.addError(fieldName, 'Path prefix exceeds maximum length (1024)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

/**
 * Validate a file name pattern for security issues
 */
export function validateFileNamePattern(pattern: string, fieldName = 'fileNamePattern'): OpResult {
  const result = new OpResult();

  if (!pattern || pattern.trim() === '') {
    return result; // Empty is valid (uses default)
  }

  // Check for path separators (file name should not contain paths)
  if (/[/\\]/.test(pattern)) {
    result.addError(fieldName, 'File name pattern cannot contain path separators', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Check for traversal patterns
  for (const pattern_ of PATH_TRAVERSAL_PATTERNS) {
    if (pattern_.test(pattern)) {
      result.addError(fieldName, 'File name pattern contains invalid characters', OP_RESULT_CODES.VALIDATION_FAILED);
      return result;
    }
  }

  // Validate placeholders
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = placeholderRegex.exec(pattern)) !== null) {
    const placeholder = match[1];
    if (!ALLOWED_PLACEHOLDERS.has(placeholder)) {
      result.addError(
        fieldName,
        `Invalid placeholder: {{${placeholder}}}. Allowed: ${Array.from(ALLOWED_PLACEHOLDERS).join(', ')}`,
        OP_RESULT_CODES.VALIDATION_FAILED,
      );
    }
  }

  // Check max length
  if (pattern.length > 256) {
    result.addError(fieldName, 'File name pattern exceeds maximum length (256)', OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}

/**
 * Validate a collection/table name for injection
 */
export function validateResourceName(
  name: string,
  fieldName: string,
  options?: { allowSlashes?: boolean; maxLength?: number },
): OpResult {
  const result = new OpResult();

  if (!name || name.trim() === '') {
    result.addError(fieldName, `${fieldName} is required`, OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  const { allowSlashes = false, maxLength = 256 } = options || {};

  // Check for null bytes
  if (/\x00/.test(name)) {
    result.addError(fieldName, 'Name contains invalid characters', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Check for traversal
  if (/\.\./.test(name)) {
    result.addError(fieldName, 'Name cannot contain ".."', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Check for path separators if not allowed
  if (!allowSlashes && /[/\\]/.test(name)) {
    result.addError(fieldName, 'Name cannot contain path separators', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Check length
  if (name.length > maxLength) {
    result.addError(fieldName, `Name exceeds maximum length (${maxLength})`, OP_RESULT_CODES.VALIDATION_FAILED);
  }

  return result;
}
