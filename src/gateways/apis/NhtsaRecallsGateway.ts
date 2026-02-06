// ./src/gateways/apis/NhtsaRecallsGateway.ts

/**
 * NHTSA Recalls API Gateway
 * https://www.nhtsa.gov/nhtsa-datasets-and-apis
 *
 * Supports:
 * - Recall lookup by make/model/year (free, no API key)
 * - Returns campaign number, component, summary, consequence, remedy
 * - Includes severity flags: parkIt, parkOutSide, overTheAirUpdate
 */

const DEFAULT_BASE_URL = 'https://api.nhtsa.gov';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NhtsaRecallRecord {
  Manufacturer: string;
  NHTSACampaignNumber: string;
  parkIt: boolean;
  parkOutSide: boolean;
  overTheAirUpdate: boolean;
  ReportReceivedDate: string;
  Component: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  Notes: string;
  ModelYear: string;
  Make: string;
  Model: string;
}

export interface NhtsaRecallsResponse {
  Count: number;
  Message: string;
  results: NhtsaRecallRecord[];
}

export interface NhtsaConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface NormalizedRecall {
  source: 'NHTSA' | 'TC';
  campaignNumber: string;
  manufacturer: string | null;
  component: string | null;
  systemType: string | null;
  summary: string | null;
  consequence: string | null;
  remedy: string | null;
  notes: string | null;
  reportReceivedDate: string | null;
  parkIt: boolean;
  parkOutside: boolean;
  otaUpdate: boolean;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export class NhtsaRecallsGateway {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config?: NhtsaConfig) {
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.timeoutMs = config?.timeoutMs || 15000;
  }

  /**
   * Fetch recalls by make, model, and year.
   * All parameters should be provided as-is (the API is case-insensitive).
   */
  async fetchByMakeModelYear(
    make: string,
    model: string,
    modelYear: number
  ): Promise<NormalizedRecall[]> {
    const url = this.buildUrl('/recalls/recallsByVehicle', {
      make,
      model,
      modelYear: String(modelYear),
    });

    const data = await this.request<NhtsaRecallsResponse>(url);

    if (!data?.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((record) => this.normalize(record));
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private buildUrl(endpoint: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  private async request<T>(url: string): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`NHTSA API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`NHTSA API timeout after ${this.timeoutMs}ms`);
      } else {
        console.error('NHTSA API request failed:', error);
      }
      return null;
    }
  }

  /**
   * Parse NHTSA date format "DD/MM/YYYY" into "YYYY-MM-DD" (ISO date).
   * Returns null if the value is empty or unparseable.
   */
  private parseDate(value: string | null | undefined): string | null {
    if (!value || !value.trim()) {
      return null;
    }

    const parts = value.trim().split('/');

    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    return null;
  }

  private normalize(record: NhtsaRecallRecord): NormalizedRecall {
    return {
      source: 'NHTSA',
      campaignNumber: record.NHTSACampaignNumber,
      manufacturer: record.Manufacturer || null,
      component: record.Component || null,
      systemType: null,
      summary: record.Summary || null,
      consequence: record.Consequence || null,
      remedy: record.Remedy || null,
      notes: record.Notes || null,
      reportReceivedDate: this.parseDate(record.ReportReceivedDate),
      parkIt: record.parkIt === true,
      parkOutside: record.parkOutSide === true,
      otaUpdate: record.overTheAirUpdate === true,
    };
  }
}