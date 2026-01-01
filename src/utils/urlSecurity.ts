// src/utils/urlSecurity.ts
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

const dnsLookup = promisify(dns.lookup);

/**
 * Blocked IP ranges (private, loopback, link-local, metadata)
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-7])\./, // Carrier-grade NAT
  /^198\.18\./, // Benchmark testing
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 private
  /^fe80:/i, // IPv6 link-local
];

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

/**
 * Cloud metadata endpoints to block
 */
const BLOCKED_METADATA_PATHS = [
  '/latest/meta-data', // AWS
  '/metadata/v1', // DigitalOcean
  '/computeMetadata/v1', // GCP
  '/metadata/instance', // Azure
  '/opc/v1/instance', // Oracle Cloud
];

/**
 * Check if an IP address is in a blocked range
 */
function isBlockedIp(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

/**
 * Validate a webhook/external URL for SSRF vulnerabilities
 *
 * @param urlString - The URL to validate
 * @param fieldName - Field name for error reporting (default: 'url')
 * @returns OpResult with validation errors if any
 */
export async function validateExternalUrl(
  urlString: string,
  fieldName = 'url',
  protocols = ['http:', 'https:'],
): Promise<OpResult> {
  const result = new OpResult();

  if (!urlString || urlString.trim() === '') {
    result.addError(fieldName, 'URL is required', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    result.addError(fieldName, 'Invalid URL format', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  const protocolsToCheck = Array.isArray(protocols) ? protocols : ['http:', 'https:'];

  // Only allow http and https
  if (!protocolsToCheck.includes(url.protocol)) {
    result.addError(
      fieldName,
      `Only ${protocolsToCheck.join(' and ')} protocols are allowed`,
      OP_RESULT_CODES.VALIDATION_FAILED,
    );
    return result;
  }

  // Block known dangerous hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    result.addError(fieldName, 'This hostname is not allowed', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Block cloud metadata paths
  const pathname = url.pathname.toLowerCase();
  for (const blockedPath of BLOCKED_METADATA_PATHS) {
    if (pathname.startsWith(blockedPath)) {
      result.addError(fieldName, 'Access to metadata endpoints is not allowed', OP_RESULT_CODES.VALIDATION_FAILED);
      return result;
    }
  }

  // Resolve hostname to IP and check
  try {
    const { address } = await dnsLookup(hostname);
    if (isBlockedIp(address)) {
      result.addError(fieldName, 'This URL resolves to a blocked IP range', OP_RESULT_CODES.VALIDATION_FAILED);
      return result;
    }
  } catch {
    // DNS resolution failed - could be intentional for internal names
    result.addError(fieldName, 'Unable to resolve hostname', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  return result;
}

/**
 * Synchronous URL validation (basic checks only, no DNS)
 * Use for quick validation before async check
 *
 * @param urlString - The URL to validate
 * @param fieldName - Field name for error reporting (default: 'url')
 * @returns OpResult with validation errors if any
 */
export function validateExternalUrlSync(
  urlString: string,
  fieldName = 'url',
  protocols = ['http:', 'https:'],
): OpResult {
  const result = new OpResult();

  if (!urlString || urlString.trim() === '') {
    result.addError(fieldName, 'URL is required', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    result.addError(fieldName, 'Invalid URL format', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  const protocolsToCheck = Array.isArray(protocols) ? protocols : ['http:', 'https:'];

  // Only allow http and https
  if (!protocolsToCheck.includes(url.protocol)) {
    result.addError(
      fieldName,
      `Only ${protocolsToCheck.join(' and ')} protocols are allowed`,
      OP_RESULT_CODES.VALIDATION_FAILED,
    );
    return result;
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    result.addError(fieldName, 'This hostname is not allowed', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Check if hostname looks like an IP
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname) && isBlockedIp(hostname)) {
    result.addError(fieldName, 'This IP address is not allowed', OP_RESULT_CODES.VALIDATION_FAILED);
    return result;
  }

  // Block cloud metadata paths
  const pathname = url.pathname.toLowerCase();
  for (const blockedPath of BLOCKED_METADATA_PATHS) {
    if (pathname.startsWith(blockedPath)) {
      result.addError(fieldName, 'Access to metadata endpoints is not allowed', OP_RESULT_CODES.VALIDATION_FAILED);
      return result;
    }
  }

  return result;
}
