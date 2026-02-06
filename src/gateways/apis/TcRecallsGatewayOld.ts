// ./src/gateways/apis/TcRecallsGateway.ts

/**
 * Transport Canada – Vehicle Recalls Database (VRDB) API Gateway
 * https://tc.api.canada.ca/en/detail?api=VRDB
 *
 * Two-phase fetch:
 *   1. Search recalls by make/model/year → returns summary list
 *   2. Fetch detail for each recall number  → returns full record
 *
 * Requires an API key (free registration at the URL above).
 * Rate limit: 60 calls/minute.
 */

import { NormalizedRecall } from './NhtsaRecallsGateway';

const DEFAULT_BASE_URL =
  'https://vrdb-tc-apicast-production.api.canada.ca/eng/vehicle-recall-database/v1';

// ---------------------------------------------------------------------------
// Raw API response types
// ---------------------------------------------------------------------------

/**
 * Summary record returned by the recall-summary search endpoints.
 * Fields come straight from the TC VRDB JSON response.
 */
export interface TcRecallSummaryRecord {
  'Recall number': string;
  'Manufacturer Name': string;
  'Model name': string;
  'Make name': string;
  Year: number;
  'Recall date': string;
}

/**
 * Detail record returned by the recall-summary/recall-number/:id endpoint.
 * The API returns 15 columns; field order from caRecall docs:
 *   1  Recall number
 *   2  Manufacturer Recall Number
 *   3  Category (English)
 *   4  Category (French)
 *   5  Model name
 *   6  Make name
 *   7  Units Affected
 *   8  System Type (English)
 *   9  System Type (French)
 *  10  Notification Type (English)
 *  11  Notification Type (French)
 *  12  Comment (English)
 *  13  Comment (French)
 *  14  Year
 *  15  Recall date
 */
export interface TcRecallDetailRecord {
  'Recall number': string;
  'Manufacturer Recall Number': string;
  Category: string;
  'Category (French)': string;
  'Model name': string;
  'Make name': string;
  'Units Affected': string;
  'System Type': string;
  'System Type (French)': string;
  'Notification Type': string;
  'Notification Type (French)': string;
  Comment: string;
  'Comment (French)': string;
  Year: number;
  'Recall date': string;
}

export interface TcRecallsConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Max detail calls per batch (guards against rate-limit). Default 50. */
  maxDetailCalls?: number;
  /** Delay between detail calls in ms. Default 1050 (stays under 60/min). */
  detailDelayMs?: number;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export class TcRecallsGateway {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxDetailCalls: number;
  private readonly detailDelayMs: number;

  constructor(config: TcRecallsConfig) {
    if (!config.apiKey) {
      throw new Error('Transport Canada VRDB API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs || 15000;
    this.maxDetailCalls = config.maxDetailCalls || 50;
    this.detailDelayMs = config.detailDelayMs || 1050;
  }

  /**
   * Fetch recalls by make, model, and model year.
   *
   * Phase 1 — search by make + model + year range (single year) → summaries.
   * Phase 2 — for each unique recall number, fetch full detail.
   *
   * Returns the same NormalizedRecall[] shape used by NhtsaRecallsGateway.
   */
  async fetchByMakeModelYear(
    make: string,
    model: string,
    modelYear: number
  ): Promise<NormalizedRecall[]> {
    // Phase 1: summary search
    const summaries = await this.searchSummaries(make, model, modelYear);

    if (!summaries || summaries.length === 0) {
      return [];
    }

    // Deduplicate recall numbers (a recall can span multiple model names)
    const uniqueNumbers = [
      ...new Set(summaries.map((s) => s['Recall number'])),
    ];

    // Guard rail: cap detail fetches to avoid rate-limit issues
    const numbersToFetch = uniqueNumbers.slice(0, this.maxDetailCalls);

    // Phase 2: fetch detail for each recall
    const results: NormalizedRecall[] = [];

    for (let i = 0; i < numbersToFetch.length; i++) {
      if (i > 0) {
        await this.sleep(this.detailDelayMs);
      }

      const detail = await this.fetchDetail(numbersToFetch[i]);

      if (detail) {
        results.push(this.normalize(detail));
      }
    }

    return results;
  }

  // ===========================================================================
  // PRIVATE — API calls
  // ===========================================================================

  /**
   * Search recall summaries by make-name / model-name / year-range.
   * Uses a generous limit to avoid pagination for a single make+model+year.
   */
  private async searchSummaries(
    make: string,
    model: string,
    modelYear: number
  ): Promise<TcRecallSummaryRecord[] | null> {
    // TC API path segments are slash-separated filter values
    const path = [
      '/recall-summary',
      `make-name/${encodeURIComponent(make)}`,
      `model-name/${encodeURIComponent(model)}`,
      `year-range/${modelYear}`,
    ].join('/');

    const url = this.buildUrl(path, { limit: '250' });

    const data = await this.request<{
      ResultList: TcRecallSummaryRecord[];
    }>(url);

    return data?.ResultList ?? null;
  }

  /**
   * Fetch full detail for a single recall number.
   */
  private async fetchDetail(
    recallNumber: string
  ): Promise<TcRecallDetailRecord | null> {
    const path = `/recall-summary/recall-number/${encodeURIComponent(recallNumber)}`;
    const url = this.buildUrl(path);

    const data = await this.request<{
      ResultList: TcRecallDetailRecord[];
    }>(url);

    if (!data?.ResultList || data.ResultList.length === 0) {
      return null;
    }

    return data.ResultList[0];
  }

  // ===========================================================================
  // PRIVATE — helpers
  // ===========================================================================

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('format', 'json');

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private async request<T>(url: string): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Key': this.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(
          `TC VRDB API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`TC VRDB API timeout after ${this.timeoutMs}ms`);
      } else {
        console.error('TC VRDB API request failed:', error);
      }
      return null;
    }
  }

  /**
   * Parse TC date format "YYYY-MM-DD" — already ISO, just validate.
   */
  private parseDate(value: string | null | undefined): string | null {
    if (!value || !value.trim()) {
      return null;
    }

    const trimmed = value.trim();

    // TC dates are already YYYY-MM-DD; quick sanity check
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  /**
   * Map TC detail record → NormalizedRecall (same shape as NHTSA gateway).
   *
   * TC does not have parkIt / parkOutside / otaUpdate flags — these are
   * NHTSA-specific severity indicators. We default them to false.
   *
   * TC *does* have systemType which NHTSA lacks — a good complement.
   */
  private normalize(record: TcRecallDetailRecord): NormalizedRecall {
    return {
      source: 'TC',
      campaignNumber: record['Recall number'],
      manufacturer: null,
      component: null,
      systemType: record['System Type'] || null,
      summary: record.Comment || null,
      consequence: null,
      remedy: null,
      notes: record['Notification Type']
        ? `Category: ${record.Category || 'N/A'}. Notification: ${record['Notification Type']}. Units affected: ${record['Units Affected'] || 'N/A'}.`
        : null,
      reportReceivedDate: this.parseDate(record['Recall date']),
      parkIt: false,
      parkOutside: false,
      otaUpdate: false,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}