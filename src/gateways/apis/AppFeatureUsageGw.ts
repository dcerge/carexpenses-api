import { omit } from 'lodash';
import { OpResult, queryGraphQL } from '@sdflc/api-helpers';
import { HEADERS } from '@sdflc/backend-helpers';

import { logger } from '../../logger';
import config from '../../config';

interface AppFeatureUsageIncrementParams {
  featureCode: string;
  incrementBy?: number;
  headers?: any;
}

interface AppFeatureUsageDecrementParams {
  featureCode: string;
  decrementBy?: number;
  headers?: any;
}

interface AppFeatureUsageSummaryParams {
  periodKey?: string;
  headers?: any;
}

const USAGE_FIELDS = `
  id
  accountId
  appFeatureId
  periodKey
  usageCount
  maxUsageCount
  remainingCount
`;

const SUMMARY_FIELDS = `
  appFeatureId
  featureCode
  featureName
  usageCount
  limitValue
  periodKey
  remaining
`;

class AppFeatureUsageGw {
  /**
   * Increment usage for a metered feature.
   *
   * Call this BEFORE performing the metered action (e.g. calling Claude API).
   * If the result code indicates LIMIT_REACHED, do not proceed.
   * If the downstream action fails, call decrement() to roll back.
   *
   * @returns OpResult with usage data on success, or error on limit reached / failure
   */
  public async increment(params: AppFeatureUsageIncrementParams): Promise<OpResult> {
    const { featureCode, incrementBy, headers } = params;

    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'appFeatureUsageIncrement',
      query: `
        mutation AppFeatureUsageIncrement($params: AppFeatureUsageIncrementInput) {
          appFeatureUsageIncrement(params: $params) {
            code
            errors {
              name
              errors
            }
            data {
              ${USAGE_FIELDS}
            }
          }
        }
      `,
      variables: {
        params: {
          featureCode,
          ...(incrementBy != null ? { incrementBy } : {}),
        },
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(
        `Failed to increment feature usage for '${featureCode}'. ` +
        `Result code ${result.code}:`,
        JSON.stringify(result, null, 2)
      );
    }

    return result;
  }

  /**
   * Decrement usage for a metered feature.
   *
   * Call this to roll back a previous increment when the downstream action fails
   * (e.g. Claude API error after usage was already incremented).
   *
   * @returns OpResult with updated usage data
   */
  public async decrement(params: AppFeatureUsageDecrementParams): Promise<OpResult> {
    const { featureCode, decrementBy, headers } = params;

    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'appFeatureUsageDecrement',
      query: `
        mutation AppFeatureUsageDecrement($params: AppFeatureUsageDecrementInput) {
          appFeatureUsageDecrement(params: $params) {
            code
            errors {
              name
              errors
            }
            data {
              ${USAGE_FIELDS}
            }
          }
        }
      `,
      variables: {
        params: {
          featureCode,
          ...(decrementBy != null ? { decrementBy } : {}),
        },
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(
        `Failed to decrement feature usage for '${featureCode}'. ` +
        `Result code ${result.code}:`,
        JSON.stringify(result.errors, null, 2)
      );
    }

    return result;
  }

  /**
   * Get usage summary for the current account across all metered features.
   *
   * Useful for dashboard display: "5 of 30 scans used this month".
   * Defaults to current UTC month if periodKey is not specified.
   *
   * @returns OpResult with array of usage summary items
   */
  public async summary(params?: AppFeatureUsageSummaryParams): Promise<OpResult> {
    const { periodKey, headers } = params || {};

    const result = await queryGraphQL({
      url: config.gatewayUrl,
      queryName: 'appFeatureUsageSummary',
      query: `
        query AppFeatureUsageSummary($periodKey: String) {
          appFeatureUsageSummary(periodKey: $periodKey) {
            code
            errors {
              name
              errors
            }
            data {
              ${SUMMARY_FIELDS}
            }
          }
        }
      `,
      variables: {
        ...(periodKey ? { periodKey } : {}),
      },
      headers: {
        [HEADERS.SPACE_ID]: config.spaceId,
        ...omit(headers, Object.keys(config.skipHeaders)),
      },
    });

    if (result.code < 0) {
      logger.log(
        `Failed to get feature usage summary. Result code ${result.code}:`,
        JSON.stringify(result.errors, null, 2)
      );
    }

    return result;
  }
}

export { AppFeatureUsageGw };