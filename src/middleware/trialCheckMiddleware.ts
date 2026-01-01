import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';
import { BaseCore } from '@sdflc/backend-helpers';
import { getFeatureValue } from '../utils';

const GRACE_PERIOD_DAYS = 1;

export interface TrialCheckMiddlewareArgs {
  core: BaseCore;
  operation: 'read' | 'create' | 'update' | 'delete' | 'display';
  featureCode?: string;
  featureValue?: number | boolean | null | undefined;
}

export const trialCheckMiddleware = async ({
  core,
  operation,
  featureCode,
  featureValue,
}: TrialCheckMiddlewareArgs) => {
  const { userId, accountId, headers } = core.getContext();

  if (!accountId) {
    return OpResult.ok();
  }

  //const account = await core.getGateways().authAccountGw.get(accountId);
  const meUser = await core.getGateways().authGw.meBy({ userId, accountId });

  if (!meUser) {
    console.log(
      `Failed to check current user plan limitations as the user was not found by userId '${userId}' and accountId '${accountId}'`,
    );
    return OpResult.fail(OP_RESULT_CODES.UNAUTHORIZED, [], 'Account not found');
  }

  const account = meUser.account;

  if (!account) {
    console.log(`Failed to check account plan limitations as the account ${accountId} not found`);
    return OpResult.fail(OP_RESULT_CODES.UNAUTHORIZED, [], 'Account not found');
  }

  console.log(
    `Checking account plan limitations for the account ${accountId} with plan '${account.currentPlan}' and trial ends ${account.trialEndsAt ?? 'N/A'}`,
  );

  // Trial expiration check
  if (account.trialEndsAt) {
    const now = new Date();
    const trialEnd = new Date(account.trialEndsAt);
    const gracePeriodEnd = new Date(trialEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const hasActiveSubscription = account.psSubscriptionStatus === 'active';
    const isInGracePeriod = now <= gracePeriodEnd;
    const trialExpired = now > trialEnd;

    if (hasActiveSubscription) {
      return OpResult.ok([account]);
    }

    if (trialExpired) {
      console.log(`A trial period for the account '${accountId}' has expired at ${trialEnd}`);

      if (operation === 'display' && !isInGracePeriod) {
        return OpResult.fail(OP_RESULT_CODES.EXPIRED, [account], 'Your trial period has expired');
      }

      if ((operation === 'create' || operation === 'update') && !isInGracePeriod) {
        return OpResult.fail(OP_RESULT_CODES.EXPIRED, [account], 'Your trial period has expired');
      }
    }
  }

  if (!account.appPlan) {
    console.log(`⚠️ The account ${account.id} has no plan setup. Account details:`, JSON.stringify(account, null, 2));
    return OpResult.fail(OP_RESULT_CODES.EXPIRED, [account], '⚠️ The account has no plan setup');
  }

  if (!Array.isArray(account.appPlan.planFeaturesDetails)) {
    console.log(
      `⚠️ The account '${account.id}' has plan '${account.currentPlan}' but it has no features. Account plan details:`,
      JSON.stringify(account.appPlan, null, 2),
    );
    return OpResult.fail(OP_RESULT_CODES.EXPIRED, [account], '⚠️ The account plan has no features enabled');
  }

  // Feature enforcement check (if provided)
  if (featureCode) {
    const planFeatureDetails = account.appPlan.planFeaturesDetails.find(
      (featureDetail) => featureDetail.featureCode === featureCode,
    );

    if (!planFeatureDetails) {
      console.log(`Feature with code ${featureCode} was not found`);
      return OpResult.fail(OP_RESULT_CODES.NOT_IMPLEMETED, [account], `This feature requires a higher plan`);
    }

    console.log('==== account', JSON.stringify(account, null, 2));

    console.log(
      `--- Check feature ${featureCode} for allowed limit ${planFeatureDetails?.featureValue || 'N/A'}, current value is ${featureValue} `,
    );

    const value = getFeatureValue(planFeatureDetails.featureValue, planFeatureDetails.featureValueType);

    // Check boolean features
    if (typeof planFeatureDetails.featureValueType === 'boolean' && value !== featureValue) {
      return OpResult.fail(OP_RESULT_CODES.NOT_IMPLEMETED, [account], `This feature requires a higher plan`);
    }

    // Check numeric limits (e.g., total screens, display configs)
    if (typeof featureValue === 'number' && typeof value === 'number') {
      if (featureValue >= value) {
        return OpResult.fail(OP_RESULT_CODES.LIMIT_REACHED, [account], `Plan limit exceeded (${value} allowed)`);
      }
    }
  }

  return OpResult.ok([account]);
};
