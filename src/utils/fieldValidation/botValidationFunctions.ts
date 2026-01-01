// ./src/utils/fieldValidation/botValidationFunctions.ts
import axios from 'axios';
import { logger } from '../../logger';
import { FieldValidator, RecaptchaEnterpriseOptions } from './interfaces';
import { errorResult, successResult } from './helpers';
import { parseOptions } from '../parserHelpers';
import { SUBMISSION_STATUSES } from '../../boundary';

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verifies a reCAPTCHA token with Google's API
 */
export const verifyRecaptcha = async (params: {
  token: string;
  secretKey: string;
  version: 'v2' | 'v3';
  minScore?: number;
}): Promise<{ success: boolean; score?: number; errorCodes?: string[] }> => {
  const { token, secretKey, version, minScore = 0.5 } = params;

  try {
    const response = await axios.post(RECAPTCHA_VERIFY_URL, null, {
      params: {
        secret: secretKey,
        response: token,
      },
    });

    const data = response.data;

    if (version === 'v3') {
      return {
        success: data.success && data.score >= minScore,
        score: data.score,
        errorCodes: data['error-codes'],
      };
    }

    return {
      success: data.success,
      errorCodes: data['error-codes'],
    };
  } catch (error) {
    logger.error('reCAPTCHA verification failed:', error);
    return {
      success: false,
      errorCodes: ['network-error'],
    };
  }
};

/**
 * Verifies a reCAPTCHA Enterprise token with Google's API
 */
export const verifyRecaptchaEnterprise = async (params: {
  token: string;
  projectId: string;
  siteKey: string;
  apiKey: string;
  minScore?: number;
  expectedAction?: string;
}): Promise<{ success: boolean; score?: number; reasons?: string[]; errorMessage?: string }> => {
  const { token, projectId, siteKey, apiKey, minScore = 0.5, expectedAction } = params;

  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;

  try {
    const requestBody: any = {
      event: {
        token,
        siteKey,
      },
    };

    if (expectedAction) {
      requestBody.event.expectedAction = expectedAction;
    }

    logger.debug('Verify reCaptchEnterprise with:', { url, projectId, expectedAction, minScore, requestBody });

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;

    logger.debug('reCaptchEnterprise result:', data);

    if (!data.tokenProperties?.valid) {
      return {
        success: false,
        reasons: [data.tokenProperties?.invalidReason || 'INVALID_TOKEN'],
        errorMessage: `Token validation failed: ${data.tokenProperties?.invalidReason || 'unknown reason'}`,
      };
    }

    if (expectedAction && data.tokenProperties?.action !== expectedAction) {
      return {
        success: false,
        reasons: ['ACTION_MISMATCH'],
        errorMessage: `Action mismatch: expected "${expectedAction}", got "${data.tokenProperties?.action}"`,
      };
    }

    const score = data.riskAnalysis?.score ?? 0;

    if (score < minScore) {
      return {
        success: false,
        score,
        reasons: data.riskAnalysis?.reasons || ['LOW_SCORE'],
        errorMessage: `Score ${score} is below threshold ${minScore}`,
      };
    }

    return {
      success: true,
      score,
      reasons: data.riskAnalysis?.reasons,
    };
  } catch (error: any) {
    logger.error('reCAPTCHA Enterprise verification failed:', error.response?.data || error.message);
    return {
      success: false,
      errorMessage: error.response?.data?.error?.message || error.message || 'Network error',
    };
  }
};

export const validateAntispambot: FieldValidator = async (ctx) => {
  const { fieldLabel, value } = ctx;

  if (!!value) {
    logger.log(
      `Honeypot field ${fieldLabel} is not empty so it is likely spambot, so mark the submission as SPAM. The field value is`,
      value,
    );
    return {
      isValid: true,
      submissionStatus: SUBMISSION_STATUSES.SPAM,
    };
  }

  return successResult(undefined);
};

export const validateRecaptcha2: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;

  if (!options) {
    return errorResult(fieldName, `${fieldLabel} configuration error: reCAPTCHA secret key not defined`);
  }

  const token = String(value).trim();

  if (!token) {
    return errorResult(fieldName, `${fieldName} reCAPTCHA verification is required`);
  }

  let secretKey = options;
  try {
    const recaptchaConfig = JSON.parse(options);
    secretKey = recaptchaConfig.secretKey || recaptchaConfig.secret || options;
  } catch {
    // Options is plain string (secret key itself)
  }

  const verificationResult = await verifyRecaptcha({
    token,
    secretKey,
    version: 'v2',
  });

  if (!verificationResult.success) {
    logger.warn(`reCAPTCHA v2 verification failed for field ${fieldName}:`, verificationResult.errorCodes);
    return errorResult(fieldName, `${fieldName} reCAPTCHA verification failed`);
  }

  return successResult(undefined);
};

export const validateRecaptcha3: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;

  if (!options) {
    return errorResult(fieldName, `${fieldName} configuration error: reCAPTCHA secret key not defined`);
  }

  const token = String(value).trim();

  if (!token) {
    return errorResult(fieldName, `${fieldName} reCAPTCHA verification is required`);
  }

  let secretKey = options;
  let minScore = 0.5;

  try {
    const recaptchaConfig = JSON.parse(options);
    secretKey = recaptchaConfig.secretKey || recaptchaConfig.secret || options;
    if (recaptchaConfig.minScore != null) {
      minScore = Number(recaptchaConfig.minScore);
    }
  } catch {
    // Options is plain string (secret key itself)
  }

  const verificationResult = await verifyRecaptcha({
    token,
    secretKey,
    version: 'v3',
    minScore,
  });

  if (!verificationResult.success) {
    logger.warn(
      `reCAPTCHA v3 verification failed for field ${fieldName}. Score: ${verificationResult.score}, Required: ${minScore}`,
      verificationResult.errorCodes,
    );
    return errorResult(fieldName, `${fieldName} reCAPTCHA verification failed`);
  }

  logger.log(`reCAPTCHA v3 verification passed for field ${fieldName}. Score: ${verificationResult.score}`);
  return successResult(undefined);
};

export const validateRecaptchaEnterprise: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options } = ctx;

  if (!options) {
    return errorResult(fieldName, `${fieldName} configuration error: reCAPTCHA Enterprise configuration not defined`);
  }

  const token = String(value).trim();

  if (!token) {
    return errorResult(fieldName, `${fieldName} reCAPTCHA verification is required`);
  }

  const enterpriseConfig = parseOptions<RecaptchaEnterpriseOptions>(options, {});

  if (!enterpriseConfig.projectId) {
    return errorResult(fieldName, `${fieldName} configuration error: projectId is required`);
  }

  if (!enterpriseConfig.siteKey) {
    return errorResult(fieldName, `${fieldName} configuration error: siteKey is required`);
  }

  if (!enterpriseConfig.apiKey) {
    return errorResult(fieldName, `${fieldName} configuration error: apiKey is required`);
  }

  const verificationResult = await verifyRecaptchaEnterprise({
    token,
    projectId: enterpriseConfig.projectId,
    siteKey: enterpriseConfig.siteKey,
    apiKey: enterpriseConfig.apiKey,
    minScore: enterpriseConfig.minScore ?? 0.5,
    expectedAction: enterpriseConfig.expectedAction,
  });

  if (!verificationResult.success) {
    logger.warn(
      `reCAPTCHA Enterprise verification failed for field ${fieldName}. Score: ${verificationResult.score}, Reasons: ${verificationResult.reasons?.join(', ')}, Error: ${verificationResult.errorMessage}`,
    );
    return errorResult(fieldName, `${fieldName} reCAPTCHA verification failed`);
  }

  logger.log(`reCAPTCHA Enterprise verification passed for field ${fieldName}. Score: ${verificationResult.score}`);
  return successResult(undefined);
};
