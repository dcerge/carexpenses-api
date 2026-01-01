// src/utils/emailSecurity.ts

/**
 * Headers that must NEVER be set by users
 */
const BLOCKED_HEADERS = new Set([
  // Routing & envelope
  'from',
  'sender',
  'to',
  'cc',
  'bcc',
  'return-path',
  'delivered-to',
  'envelope-to',

  // Authentication & trust
  'dkim-signature',
  'domainkey-signature',
  'arc-seal',
  'arc-message-signature',
  'arc-authentication-results',
  'authentication-results',
  'received-spf',

  // Origin tracking
  'received',
  'x-originating-ip',
  'x-sender-ip',
  'x-original-to',

  // Spam filter manipulation
  'x-spam-status',
  'x-spam-score',
  'x-spam-flag',
  'x-spam-level',
  'x-virus-scanned',
  'x-virus-status',

  // MIME structure
  'content-type',
  'content-transfer-encoding',
  'content-disposition',
  'mime-version',
  'content-id',

  // Message identification (could cause threading issues)
  'message-id',
  'in-reply-to',
  'references',

  // Other sensitive
  'date',
  'subject', // Should be set through proper params
  'resent-from',
  'resent-to',
  'resent-cc',
  'resent-bcc',
]);

/**
 * Prefixes that are generally safe for custom tracking headers
 */
const ALLOWED_PREFIXES = [
  'x-formsubmits-', // Your own prefix
  'x-custom-', // Generic custom prefix
];

/**
 * HTML entities that must be escaped in user content
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export interface HeaderValidationResult {
  valid: boolean;
  sanitizedHeaders?: Record<string, string>;
  blockedHeaders?: string[];
  errors?: string[];
}

/**
 * Validate and sanitize custom email headers
 */
export function validateCustomHeaders(headers: Record<string, string> | undefined): HeaderValidationResult {
  if (!headers || Object.keys(headers).length === 0) {
    return { valid: true, sanitizedHeaders: {} };
  }

  const sanitizedHeaders: Record<string, string> = {};
  const blockedHeaders: string[] = [];
  const errors: string[] = [];

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase().trim();

    // Check for blocked headers
    if (BLOCKED_HEADERS.has(normalizedKey)) {
      blockedHeaders.push(key);
      errors.push(`Header '${key}' is not allowed for security reasons`);
      continue;
    }

    // Check for CRLF injection attempts
    if (/[\r\n]/.test(key) || /[\r\n]/.test(value)) {
      errors.push(`Header '${key}' contains invalid characters (potential injection attack)`);
      continue;
    }

    // Check for null bytes
    if (/\0/.test(key) || /\0/.test(value)) {
      errors.push(`Header '${key}' contains null bytes`);
      continue;
    }

    // Validate header name format (letters, digits, hyphens only)
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(key)) {
      errors.push(`Header '${key}' has invalid format`);
      continue;
    }

    // Enforce X- prefix for custom headers (optional strict mode)
    // if (!normalizedKey.startsWith('x-')) {
    //   errors.push(`Custom header '${key}' must start with 'X-'`);
    //   continue;
    // }

    // Limit header value length
    if (value.length > 1000) {
      errors.push(`Header '${key}' value exceeds maximum length (1000 chars)`);
      continue;
    }

    // Sanitize value - remove any control characters except space/tab
    const sanitizedValue = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    sanitizedHeaders[key] = sanitizedValue;
  }

  return {
    valid: errors.length === 0,
    sanitizedHeaders: errors.length === 0 ? sanitizedHeaders : undefined,
    blockedHeaders: blockedHeaders.length > 0 ? blockedHeaders : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Strict validation - only allow headers with approved prefixes
 */
export function validateCustomHeadersStrict(headers: Record<string, string> | undefined): HeaderValidationResult {
  const baseResult = validateCustomHeaders(headers);

  if (!baseResult.valid || !baseResult.sanitizedHeaders) {
    return baseResult;
  }

  const errors: string[] = [...(baseResult.errors || [])];
  const finalHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(baseResult.sanitizedHeaders)) {
    const normalizedKey = key.toLowerCase();
    const hasAllowedPrefix = ALLOWED_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix));

    if (!hasAllowedPrefix) {
      errors.push(`Header '${key}' must use an allowed prefix: ${ALLOWED_PREFIXES.join(', ')}`);
      continue;
    }

    finalHeaders[key] = value;
  }

  return {
    valid: errors.length === 0,
    sanitizedHeaders: errors.length === 0 ? finalHeaders : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Escape HTML entities in user-provided content
 * Use this when substituting user data into HTML email templates
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitize user content for safe inclusion in emails
 * Removes potentially dangerous patterns
 */
export function sanitizeEmailContent(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Remove style tags (can be used for CSS injection)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return sanitized;
}

/**
 * Process user content for email - escape HTML and sanitize
 */
export function processUserContentForEmail(text: string, options?: { allowHtml?: boolean }): string {
  if (!text || typeof text !== 'string') return '';

  if (options?.allowHtml) {
    return sanitizeEmailContent(text);
  }

  return escapeHtml(text);
}
