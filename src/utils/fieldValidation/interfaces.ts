// ./src/utils/fieldValidation/interfaces.ts

export interface FieldValidationContext {
  fieldName: string;
  fieldLabel: string;
  value: any;
  files?: any[];
  formField: any;
  minValue?: number | null;
  maxValue?: number | null;
  options?: string;
  isRequired: boolean;
  formData: Record<string, any>;
  core: any;
  customErrorMessage?: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  validatedValue?: any;
  errors?: Array<{ field: string; message: string }>;
  submissionStatus?: number;
}

export type FieldValidator = (ctx: FieldValidationContext) => Promise<FieldValidationResult>;

// Field Options Interfaces
// These define the JSON structure stored in formField.options for each field type

export interface NumberFieldOptions {
  numberType?: 'integer' | 'decimal';
  decimalPlaces?: number;
}

export interface PhoneFieldOptions {
  requireInternational?: boolean;
  allowedAreaCodes?: string[];
  areaCodeLength?: number;
}

export interface DateFieldOptions {
  minDate?: string;
  maxDate?: string;
}

export interface BirthdateFieldOptions {
  minAge?: number;
  maxAge?: string;
}

export interface FileFieldOptions {
  maxQuantity?: number;
  extensions?: string[];
}

export interface RecaptchaEnterpriseOptions {
  projectId?: string;
  siteKey?: string;
  apiKey?: string;
  minScore?: number;
  expectedAction?: string;
}

export interface LookupFieldOptions {
  lookupDictionaryId?: string;
  filter1?: string;
  filter2?: string;
}

export interface ExternalLookupConfig {
  url: string;
  verb?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface ExternalLookupParams {
  url: string;
  verb: string;
  headers: Record<string, string>;
  dictionaryName: string;
  value: string;
  filter1?: string;
  filter2?: string;
}

export interface ExternalLookupResult {
  valid: boolean;
  error?: string;
}

export interface CreditCardFieldOptions {
  allowedTypes?: string[];
  returnCardType?: boolean;
  maskNumber?: boolean;
}

export interface MultipleChoiceFieldOptions {
  values: string[];
}

/**
 * Email field validation options
 *
 * Supports advanced email validation features:
 * - Domain existence check (DNS lookup)
 * - MX record validation (can domain accept email)
 * - Plus addressing control (user+label@domain.com)
 */
export interface EmailFieldOptions {
  /**
   * Validate that the email domain exists (has DNS records).
   * Performs a DNS lookup to verify the domain is registered.
   * Cached for performance.
   *
   * Available on: Starter plan and above
   * @default false
   */
  validateDomainExists?: boolean;

  /**
   * Validate that the domain can accept emails (has MX records).
   * More thorough than validateDomainExists - confirms mail servers exist.
   * Cached for performance.
   *
   * Available on: Pro plan and above
   * @default false
   */
  validateDomainAcceptsEmail?: boolean;

  /**
   * Control plus addressing (also known as sub-addressing).
   * Plus addressing allows users to add +label to their email (user+newsletter@gmail.com).
   *
   * Options:
   * - 'allow': Accept emails with plus addressing (default)
   * - 'forbid': Reject emails containing + in local part
   * - 'strip': Accept but remove the +label portion before storing
   *
   * @default 'allow'
   */
  plusAddressing?: 'allow' | 'forbid' | 'strip';

  /**
   * List of blocked domains (e.g., disposable email providers).
   * Case-insensitive matching.
   *
   * @example ['tempmail.com', 'throwaway.email']
   */
  blockedDomains?: string[];

  /**
   * List of allowed domains. If specified, only emails from these domains are accepted.
   * Useful for corporate forms that should only accept company emails.
   * Case-insensitive matching.
   *
   * @example ['company.com', 'subsidiary.company.com']
   */
  allowedDomains?: string[];
}

/**
 * URL field validation options
 */
export interface UrlFieldOptions {
  /**
   * Validate that the URL domain exists (has DNS records).
   * Cached for performance.
   * @default false
   */
  validateDomainExists?: boolean;

  /**
   * Validate that the URL is live (responds to HEAD/GET request).
   * Cached for 1 hour.
   * @default false
   */
  validateUrlIsLive?: boolean;

  /**
   * Control URL format requirements.
   * - 'any': Accept any valid URL (default)
   * - 'domain_only': Only domain, no path allowed (e.g., https://example.com or https://example.com/)
   * - 'with_path': Must include a path (e.g., https://example.com/page)
   * @default 'any'
   */
  urlFormat?: 'any' | 'domain_only' | 'with_path';

  /**
   * Allow query parameters (?key=value).
   * @default true
   */
  allowQuery?: boolean;

  /**
   * Allow hash/fragment (#section).
   * @default true
   */
  allowHash?: boolean;
}

/**
 * UUID field validation options
 */
export interface UuidFieldOptions {
  /**
   * Specific UUID versions to accept.
   * If not specified, all versions (1-5) are accepted.
   * @example [4] for only UUIDv4
   */
  allowedVersions?: number[];

  /**
   * Whether to accept the nil UUID (00000000-0000-0000-0000-000000000000).
   * @default false
   */
  allowNil?: boolean;
}

/**
 * Hex color field validation options
 */
export interface HexColorFieldOptions {
  /**
   * Allowed formats for hex color.
   * - 'short': 3-character (#RGB)
   * - 'long': 6-character (#RRGGBB)
   * - 'both': Accept either format (default)
   */
  format?: 'short' | 'long' | 'both';

  /**
   * Whether the # prefix is required.
   * @default true
   */
  requireHash?: boolean;

  /**
   * Whether to accept 8-character format with alpha (#RRGGBBAA).
   * @default false
   */
  allowAlpha?: boolean;
}

/**
 * Password field validation options
 */
export interface PasswordFieldOptions {
  /**
   * Require at least one uppercase letter (A-Z).
   * @default false
   */
  requireUppercase?: boolean;

  /**
   * Require at least one lowercase letter (a-z).
   * @default false
   */
  requireLowercase?: boolean;

  /**
   * Require at least one digit (0-9).
   * @default false
   */
  requireNumbers?: boolean;

  /**
   * Require at least one special character (!@#$%^&*...).
   * @default false
   */
  requireSymbols?: boolean;

  /**
   * Custom set of allowed special characters.
   * If not specified, common symbols are used: !@#$%^&*()_+-=[]{}|;:,.<>?
   */
  allowedSymbols?: string;

  /**
   * Disallow common weak passwords (e.g., "password", "123456").
   * @default false
   */
  disallowCommonPasswords?: boolean;

  /**
   * Disallow sequential characters (e.g., "abc", "123").
   * @default false
   */
  disallowSequential?: boolean;

  /**
   * Disallow repeated characters (e.g., "aaa", "111").
   * @default false
   */
  disallowRepeated?: boolean;

  /**
   * Maximum allowed repeated consecutive characters.
   * Only applies if disallowRepeated is true.
   * @default 2
   */
  maxRepeatedChars?: number;

  /**
   * Lookup dictionary ID for reserved/stop passwords.
   * If specified, passwords will be checked against this dictionary.
   */
  stopPasswordsDictionaryId?: string;
}

/**
 * Username field validation options
 */
export interface UsernameFieldOptions {
  /**
   * Allowed characters pattern.
   * - 'alphanumeric': Letters and numbers only (a-z, A-Z, 0-9)
   * - 'alphanumeric_underscore': Letters, numbers, and underscores
   * - 'alphanumeric_hyphen': Letters, numbers, and hyphens
   * - 'alphanumeric_both': Letters, numbers, underscores, and hyphens (default)
   */
  allowedCharacters?: 'alphanumeric' | 'alphanumeric_underscore' | 'alphanumeric_hyphen' | 'alphanumeric_both';

  /**
   * Whether to force lowercase.
   * @default false
   */
  forceLowercase?: boolean;

  /**
   * Whether username must start with a letter.
   * @default true
   */
  mustStartWithLetter?: boolean;

  /**
   * Whether to disallow consecutive special characters (__, --, _-).
   * @default true
   */
  disallowConsecutiveSpecial?: boolean;

  /**
   * Lookup dictionary ID for reserved/stop words.
   * If specified, usernames will be checked against this dictionary.
   */
  stopWordsDictionaryId?: string;
}

/**
 * Slug field validation options
 */
export interface SlugFieldOptions {
  /**
   * Allowed separator character.
   * - 'hyphen': Only hyphens allowed (default)
   * - 'underscore': Only underscores allowed
   * - 'both': Both hyphens and underscores allowed
   */
  separator?: 'hyphen' | 'underscore' | 'both';

  /**
   * Whether to allow numbers in the slug.
   * @default true
   */
  allowNumbers?: boolean;

  /**
   * Whether to disallow leading/trailing separators.
   * @default true
   */
  trimSeparators?: boolean;

  /**
   * Whether to disallow consecutive separators (e.g., "my--slug").
   * @default true
   */
  disallowConsecutiveSeparators?: boolean;
}

/**
 * Domain verification cache entry
 */
export interface DomainVerification {
  id: string;
  domain: string;
  verificationType: 'exists' | 'accepts_email' | 'url_live';
  isValid: boolean;
  verifiedAt: Date;
  expiresAt: Date;
  errorMessage?: string;
  verificationData?: Record<string, any>;
}

/**
 * Coordinates field validation options
 *
 * Validates geographic coordinates (latitude/longitude) with optional
 * geographic restrictions including bounding boxes, polygon containment,
 * and radius-based proximity checks.
 */
export interface CoordinatesFieldOptions {
  /**
   * Input format for coordinates.
   * - 'decimal': Decimal degrees (e.g., 45.4215, -75.6972)
   * - 'dms': Degrees-minutes-seconds (e.g., 45°25'17.4"N, 75°41'49.9"W)
   * @default 'decimal'
   */
  format?: 'decimal' | 'dms';

  /**
   * Number of decimal places for output precision.
   * @default 6
   */
  decimalPrecision?: number;

  /**
   * Predefined geographic regions to restrict coordinates to.
   * Coordinates must fall within at least one of the specified regions.
   * Available regions: 'north_america', 'south_america', 'europe', 'africa',
   * 'asia', 'oceania', 'antarctica'
   */
  allowedRegions?: string[];

  /**
   * Bounding box restriction.
   * Coordinates must fall within the specified rectangular area.
   */
  boundingBox?: {
    /** Maximum latitude (north boundary) */
    north: number;
    /** Minimum latitude (south boundary) */
    south: number;
    /** Maximum longitude (east boundary) */
    east: number;
    /** Minimum longitude (west boundary) */
    west: number;
  };

  /**
   * Polygon restrictions.
   * Coordinates must fall within at least one of the specified polygon areas.
   * Each polygon is automatically closed (first and last points connected).
   * Each polygon must have a minimum of 3 points.
   */
  polygons?: Array<{
    title: string;
    points: Array<{ lat: number; lng: number }>;
  }>;

  /**
   * Center point for radius-based restriction.
   * Must be used together with radiusKm.
   */
  radiusCenter?: { lat: number; lng: number };

  /**
   * Radius in kilometers from radiusCenter.
   * Coordinates must be within this distance from the center point.
   * Must be used together with radiusCenter.
   */
  radiusKm?: number;
}

/**
 * Domain verification result from helper functions
 */
export interface DomainVerificationResult {
  valid: boolean;
  cached: boolean;
  error?: string;
  data?: Record<string, any>;
}

/**
 * Represents a field value that needs its uniqueness count updated
 * after successful submission
 */
export interface UniquenessUpdate {
  accountId: string;
  formId: string;
  formFieldId: string;
  fieldValue: string;
}

/**
 * Extended validation result data returned from validateFormData
 */
export interface ValidationResultData {
  mode: string;
  submissionStatus: number;
  formData: Record<string, any>;
  formFiles: Record<string, any>;
  replyTo?: string;
  uniquenessUpdates: UniquenessUpdate[];
}
