// ./src/utils/fieldValidation/domainVerification.ts
/**
 * Domain verification utilities for email and URL validation
 *
 * Provides DNS, MX record, and HTTP liveness verification with caching.
 * Uses database-level caching with single-row-per-domain design.
 *
 * Design:
 * - One database row per domain
 * - Nullable boolean fields: null=not checked, true/false=checked result
 * - Single expires_at for entire record
 * - Batch verification to minimize DB calls
 */

import dns from 'dns';
import http from 'http';
import https from 'https';
import { promisify } from 'util';
import { logger } from '../../logger';
import { DomainVerificationGw, DomainVerificationRecord } from '../../gateways/tables/DomainVerificationGw';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

// Cache TTL in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Timeout for DNS operations
const DNS_TIMEOUT_MS = 5000;

// Timeout for HTTP operations
const HTTP_TIMEOUT_MS = 10000;

/**
 * Request specifying which verifications to perform
 */
export interface VerificationRequest {
  checkDns?: boolean;
  checkMx?: boolean;
  checkHttp?: boolean;
}

/**
 * Result of batch verification
 */
export interface VerificationResult {
  dnsValid: boolean | null;
  mxValid: boolean | null;
  httpLive: boolean | null;
  errors: {
    dns?: string;
    mx?: string;
    http?: string;
  };
  fromCache: {
    dns: boolean;
    mx: boolean;
    http: boolean;
  };
}

/**
 * Extract domain from email address
 */
export const extractDomainFromEmail = (email: string): string => {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
};

/**
 * Check if domain has any DNS records (A or AAAA)
 */
const checkDomainExists = async (domain: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DNS lookup timeout')), DNS_TIMEOUT_MS);
    });

    // Try A records first
    try {
      await Promise.race([resolve4(domain), timeoutPromise]);
      return { valid: true };
    } catch {
      // Try AAAA records
      try {
        await Promise.race([resolve6(domain), timeoutPromise]);
        return { valid: true };
      } catch {
        return { valid: false, error: 'No DNS records found' };
      }
    }
  } catch (error: any) {
    logger.error(`DNS lookup failed for ${domain}:`, error.message);
    return { valid: false, error: error.message };
  }
};

/**
 * Check if domain has MX records (can accept email)
 */
const checkDomainAcceptsEmail = async (
  domain: string,
): Promise<{ valid: boolean; mxRecords?: string[]; error?: string }> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MX lookup timeout')), DNS_TIMEOUT_MS);
    });

    const mxRecords = await Promise.race([resolveMx(domain), timeoutPromise]);

    if (mxRecords && mxRecords.length > 0) {
      return {
        valid: true,
        mxRecords: mxRecords.map((mx) => mx.exchange).slice(0, 5),
      };
    }

    return { valid: false, error: 'No MX records found' };
  } catch (error: any) {
    logger.debug(`MX lookup failed for ${domain}:`, error.message);
    return { valid: false, error: error.message };
  }
};

/**
 * Check if domain responds to HTTP request
 * Tries HEAD first, falls back to GET if HEAD returns 405
 */
const checkHttpIsLive = async (domain: string): Promise<{ valid: boolean; statusCode?: number; error?: string }> => {
  const url = `https://${domain}`;

  const makeRequest = (method: 'HEAD' | 'GET'): Promise<{ valid: boolean; statusCode?: number; error?: string }> => {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);

        const options = {
          method,
          hostname: parsed.hostname,
          port: 443,
          path: '/',
          timeout: HTTP_TIMEOUT_MS,
          headers: {
            'User-Agent': 'FormSubmits-URLValidator/1.0',
          },
        };

        const req = https.request(options, (res) => {
          const statusCode = res.statusCode || 0;
          // Accept 2xx and 3xx as "live"
          const valid = statusCode >= 200 && statusCode < 400;
          res.resume();
          resolve({ valid, statusCode });
        });

        req.on('error', (error: any) => {
          resolve({ valid: false, error: error.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ valid: false, error: 'Request timeout' });
        });

        req.end();
      } catch (error: any) {
        resolve({ valid: false, error: error.message });
      }
    });
  };

  const headResult = await makeRequest('HEAD');

  if (headResult.valid) {
    return headResult;
  }

  // If HEAD returned 405, try GET
  if (headResult.statusCode === 405) {
    return makeRequest('GET');
  }

  return headResult;
};

/**
 * Check if a cached value is valid (not null and not expired)
 */
const isCacheValid = (
  record: DomainVerificationRecord | null,
  field: 'dnsIsValid' | 'mxIsValid' | 'httpIsLive',
): boolean => {
  if (!record) {
    return false;
  }

  // Field not checked yet
  if (record[field] === null) {
    return false;
  }

  // Check expiration
  return record.expiresAt > new Date();
};

/**
 * Batch verify domain with minimal database calls
 *
 * Flow:
 * 1. Fetch existing record (1 DB call)
 * 2. For each requested check:
 *    - If cached & valid → use cached value
 *    - If not cached or expired → perform verification
 * 3. If any verifications performed → upsert record (1 DB call)
 * 4. Return combined results
 *
 * @param domain - Domain to verify
 * @param request - Which verifications to perform
 * @param gateway - Database gateway
 * @returns Verification results with cache status
 */
export const verifyDomainBatch = async (
  domain: string,
  request: VerificationRequest,
  gateway: DomainVerificationGw,
): Promise<VerificationResult> => {
  const normalizedDomain = domain.toLowerCase();
  const now = new Date();

  // Initialize result
  const result: VerificationResult = {
    dnsValid: null,
    mxValid: null,
    httpLive: null,
    errors: {},
    fromCache: {
      dns: false,
      mx: false,
      http: false,
    },
  };

  // If nothing requested, return empty result
  if (!request.checkDns && !request.checkMx && !request.checkHttp) {
    return result;
  }

  // Step 1: Fetch existing record (1 DB call)
  let existingRecord: DomainVerificationRecord | null = null;
  try {
    existingRecord = await gateway.findByDomain(normalizedDomain);
  } catch (error: any) {
    logger.error(`Cache lookup failed for ${normalizedDomain}:`, error.message);
    // Continue without cache
  }

  // Track what we need to verify and what we need to update
  const needsVerification = {
    dns: false,
    mx: false,
    http: false,
  };

  const updateData: {
    dnsIsValid?: boolean;
    mxIsValid?: boolean;
    httpIsLive?: boolean;
  } = {};

  let verificationData: Record<string, any> = existingRecord?.verificationData || {};
  const errors: string[] = [];

  // Step 2: Check each requested verification against cache
  if (request.checkDns) {
    if (isCacheValid(existingRecord, 'dnsIsValid')) {
      result.dnsValid = existingRecord!.dnsIsValid;
      result.fromCache.dns = true;
    } else {
      needsVerification.dns = true;
    }
  }

  if (request.checkMx) {
    if (isCacheValid(existingRecord, 'mxIsValid')) {
      result.mxValid = existingRecord!.mxIsValid;
      result.fromCache.mx = true;
    } else {
      needsVerification.mx = true;
    }
  }

  if (request.checkHttp) {
    if (isCacheValid(existingRecord, 'httpIsLive')) {
      result.httpLive = existingRecord!.httpIsLive;
      result.fromCache.http = true;
    } else {
      needsVerification.http = true;
    }
  }

  // Step 3: Perform needed verifications
  if (needsVerification.dns) {
    const dnsResult = await checkDomainExists(normalizedDomain);
    result.dnsValid = dnsResult.valid;
    updateData.dnsIsValid = dnsResult.valid;
    if (dnsResult.error) {
      result.errors.dns = dnsResult.error;
      errors.push(`DNS: ${dnsResult.error}`);
    }
  }

  if (needsVerification.mx) {
    const mxResult = await checkDomainAcceptsEmail(normalizedDomain);
    result.mxValid = mxResult.valid;
    updateData.mxIsValid = mxResult.valid;
    if (mxResult.error) {
      result.errors.mx = mxResult.error;
      errors.push(`MX: ${mxResult.error}`);
    }
    if (mxResult.mxRecords) {
      verificationData = { ...verificationData, mxRecords: mxResult.mxRecords };
    }
  }

  if (needsVerification.http) {
    const httpResult = await checkHttpIsLive(normalizedDomain);
    result.httpLive = httpResult.valid;
    updateData.httpIsLive = httpResult.valid;
    if (httpResult.error) {
      result.errors.http = httpResult.error;
      errors.push(`HTTP: ${httpResult.error}`);
    }
    if (httpResult.statusCode) {
      verificationData = { ...verificationData, httpStatusCode: httpResult.statusCode };
    }
  }

  // Step 4: Upsert if any verifications were performed (1 DB call)
  const hasUpdates = Object.keys(updateData).length > 0;

  if (hasUpdates) {
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    try {
      await gateway.upsert({
        domain: normalizedDomain,
        ...updateData,
        verifiedAt: now,
        expiresAt,
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
        verificationData: Object.keys(verificationData).length > 0 ? verificationData : null,
      });
    } catch (error: any) {
      // Log but don't fail - caching is an optimization
      logger.error(`Failed to cache domain verification for ${normalizedDomain}:`, error.message);
    }
  }

  return result;
};

/**
 * Convenience function for simple DNS existence check
 */
export const verifyDomainExists = async (
  domain: string,
  gateway: DomainVerificationGw,
): Promise<{ valid: boolean; cached: boolean; error?: string }> => {
  const result = await verifyDomainBatch(domain, { checkDns: true }, gateway);
  return {
    valid: result.dnsValid === true,
    cached: result.fromCache.dns,
    error: result.errors.dns,
  };
};

/**
 * Convenience function for simple MX check
 */
export const verifyDomainAcceptsEmail = async (
  domain: string,
  gateway: DomainVerificationGw,
): Promise<{ valid: boolean; cached: boolean; error?: string }> => {
  const result = await verifyDomainBatch(domain, { checkMx: true }, gateway);
  return {
    valid: result.mxValid === true,
    cached: result.fromCache.mx,
    error: result.errors.mx,
  };
};

/**
 * Convenience function for HTTP liveness check
 */
export const verifyHttpIsLive = async (
  domain: string,
  gateway: DomainVerificationGw,
): Promise<{ valid: boolean; cached: boolean; error?: string }> => {
  const result = await verifyDomainBatch(domain, { checkHttp: true }, gateway);
  return {
    valid: result.httpLive === true,
    cached: result.fromCache.http,
    error: result.errors.http,
  };
};

/**
 * Batch cleanup of expired cache entries
 * Should be run periodically via cron/scheduler
 */
export const cleanupExpiredVerifications = async (gateway: DomainVerificationGw): Promise<number> => {
  try {
    return await gateway.deleteExpired();
  } catch (error: any) {
    logger.error('Failed to cleanup expired domain verifications:', error.message);
    return 0;
  }
};
