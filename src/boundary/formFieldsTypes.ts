// ./src/boundary/formFieldsTypes.ts
export const FIELD_TYPE_IDS = {
  SHORT_TEXT: 0, // Single line text, with min/max length verification
  NUMBER: 10, // Integer/Decimal with min/max value verification; for decimals number of points after point limit
  DATE: 20, // Date in the format YYYY-MM-DD with min/max date
  TIME: 30, // Time in the formats h:mm a (9:30 PM), HH:mm (21:30), min/max allowed times,
  DATETIME: 40, // Date/time in the format YYYY-MM-DD HH:mm with min/max date/times
  PHONE: 50, // Phone number, removes not digits (except first +), checks for area code, international format, a list of allowed area codes, with min/max length
  EMAIL: 60, // email address verification with ability to check for domain existence, for existence of MX records on the domain, to accept/ignore/forbid the '+label' in the email address
  BOOLEAN: 70, // Check for boolean values like true/false, yes/no, 1/0
  REGULAR_EXPRESSION: 80, // check value against regular expression, uses field.options for the regular expression pattern
  MULTIPLE_CHOICE: 90, // Checks agains values listed in the options, and allows user to set min/max selections. For min/max = 1 means one value
  LONG_TEXT: 100, // Multiple line text, with min/max length verification
  URL: 110, // verification for valid url format, domain existence and if it is alive, allow/forbid: deep links (url path) or just domain name, allow/forbud: query params/hash
  UUID: 120, // Standard UUID format validation (v1-v5)
  HEX_COLOR: 130, // Hex color codes (#RGB or #RRGGBB)
  BIRTHDATE: 140, // date like YYYY-MM-DD, with min/max age settings, to set age restrictions
  BIRTHDAY: 150, // month and day without year
  PASSWORD: 160, // Password with configurable strength requirements
  USERNAME: 170, // Username with format rules and optional stop words dictionary
  SLUG: 180, // URL-friendly text (lowercase, hyphens, no spaces)
  COORDINATES: 190, // Coordinates (lat,lng) with validtion for the coordinates to be in certain part of the world, within a radius of a point, or within one of poligons provided
  CREDIT_CARD: 200, // credit card type, need to check for correctness of a number
  LOOKUP: 500, // lookup a value in a lookup_dictionary
  //
  FILE: 1000, // a file with options to limit size, quantity, allowed list of extensions
  //
  ANTISPAMBOT: 10000, // honeypot
  RECAPTCHA2: 10102,
  RECAPTCHA3: 10103,
  RECAPTCHA_ENTERPRISE: 10104,
};
