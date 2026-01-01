import axios from 'axios';
import { logger } from '../../logger';
import {
  ExternalLookupConfig,
  ExternalLookupParams,
  ExternalLookupResult,
  FieldValidator,
  LookupFieldOptions,
} from './interfaces';
import { errorResult, successResult } from './helpers';
import { parseOptions } from '../parserHelpers';

/**
 * Performs HTTP lookup validation against an external service.
 *
 * For GET requests, parameters are sent as query strings.
 * For POST/PUT requests, parameters are sent as JSON body.
 *
 * Expected response format from external service:
 * { valid: true } or { found: true } or { exists: true } or { success: true }
 */
const validateExternalLookup = async (params: ExternalLookupParams): Promise<ExternalLookupResult> => {
  const { url, verb, headers, dictionaryName, value, filter1, filter2 } = params;

  try {
    let response;

    if (verb === 'GET') {
      const queryParams: Record<string, string> = {
        dictionaryName,
        value,
      };

      if (filter1) queryParams.filter1 = filter1;
      if (filter2) queryParams.filter2 = filter2;

      response = await axios.get(url, {
        params: queryParams,
        headers,
        timeout: 10000,
      });
    } else {
      const body = {
        dictionaryName,
        value,
        filter1,
        filter2,
      };

      response = await axios({
        method: verb.toLowerCase(),
        url,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 10000,
      });
    }

    const data = response.data;
    const isValid = data.valid === true || data.found === true || data.exists === true || data.success === true;

    return { valid: isValid };
  } catch (error: any) {
    logger.error(`External lookup request failed:`, error.message);
    return { valid: false, error: error.message };
  }
};

/**
 * Resolves a filter value that may contain a {{fieldName}} reference.
 *
 * If the value contains {{fieldName}}, it extracts the field name and
 * returns the corresponding value from formData.
 *
 * Otherwise, returns the literal value.
 *
 * @param filterValue - The filter value which may be a literal or {{fieldName}} reference
 * @param formData - The form submission data
 * @returns The resolved filter value or undefined
 */
const resolveFilterValue = (filterValue: string | undefined, formData: Record<string, any>): string | undefined => {
  if (!filterValue) return undefined;

  // Check for {{fieldName}} syntax
  const fieldRefMatch = filterValue.match(/^\{\{(\w+)\}\}$/);

  if (fieldRefMatch) {
    const fieldName = fieldRefMatch[1];
    const fieldValue = formData[fieldName];

    if (fieldValue !== undefined && fieldValue !== null) {
      return String(fieldValue);
    }

    // Field reference not found in form data - return undefined
    return undefined;
  }

  // Return as literal value
  return filterValue;
};

export const validateLookup: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value, options, formData, core } = ctx;

  if (!options) {
    return errorResult(fieldName, `${fieldLabel} configuration error: lookup configuration not defined`);
  }

  const lookupConfig = parseOptions<LookupFieldOptions>(options, {});

  if (!lookupConfig.lookupDictionaryId) {
    return errorResult(fieldName, `${fieldLabel} configuration error: lookupDictionaryId is required`);
  }

  const strValue = String(value).trim();

  if (!strValue) {
    return errorResult(fieldName, `${fieldLabel} value is required for lookup`);
  }

  try {
    const lookupDictionary = await core.getGateways().lookupDictionaryGw.get(lookupConfig.lookupDictionaryId);

    if (!lookupDictionary) {
      logger.error(`Lookup dictionary not found: ${lookupConfig.lookupDictionaryId}`);
      return errorResult(fieldName, `${fieldLabel} configuration error: dictionary not found`);
    }

    // Resolve filter values using {{fieldName}} syntax
    const filter1Value = resolveFilterValue(lookupConfig.filter1, formData);
    const filter2Value = resolveFilterValue(lookupConfig.filter2, formData);

    // External dictionary lookup (HTTP)
    if (lookupDictionary.externalUrl) {
      const externalConfig = parseOptions<ExternalLookupConfig>(lookupDictionary.externalConfig, {
        url: lookupDictionary.externalUrl,
      });

      const result = await validateExternalLookup({
        url: externalConfig.url,
        verb: externalConfig.verb || 'GET',
        headers: externalConfig.headers || {},
        dictionaryName: lookupDictionary.normalizedName || lookupDictionary.name,
        value: strValue,
        filter1: filter1Value,
        filter2: filter2Value,
      });

      if (!result.valid) {
        if (result.error) {
          return errorResult(fieldName, `${fieldLabel} lookup validation failed: unable to verify value`);
        }
        return errorResult(fieldName, `${fieldLabel} value "${strValue}" was not found in the lookup dictionary`);
      }

      return successResult(strValue);
    }

    // Internal dictionary lookup
    const filter: Record<string, any> = {
      lookupDictionaryId: lookupConfig.lookupDictionaryId,
      isExpired: false,
      checkValue: strValue,
    };

    if (filter1Value) filter.filter1 = filter1Value;
    if (filter2Value) filter.filter2 = filter2Value;

    logger.debug(`Lookup for value in the dictionary '${lookupDictionary.name}'`, filter);

    const items = await core.getGateways().lookupDictionaryItemGw.list({
      filter,
      params: {
        pagination: { pageSize: 1 },
      },
    });

    if (!items || items.length === 0) {
      return errorResult(fieldName, `${fieldLabel} value "${strValue}" was not found in the lookup dictionary`);
    }

    return successResult(strValue);
  } catch (error: any) {
    logger.error(`Lookup validation error for field ${fieldName}:`, error);
    return errorResult(fieldName, `${fieldLabel} lookup validation failed: ${error.message}`);
  }
};
