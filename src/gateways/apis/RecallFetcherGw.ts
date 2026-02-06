// ./src/gateways/apis/RecallFetcherGw.ts
/**
 * Recall Fetcher Gateway
 *
 * Orchestrates calls to all recall-source gateways (NHTSA, Transport Canada)
 * and returns a merged, deduplicated list of NormalizedRecall records.
 *
 * This is the single entry point the Core layer uses for external recall data.
 * It does NOT touch the database — that responsibility stays in the Core.
 */

import { NhtsaRecallsGateway, NormalizedRecall } from './NhtsaRecallsGateway';
import { TcRecallsGateway } from './TcRecallsGateway';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecallSource = 'NHTSA' | 'TC';

export interface RecallFetchResult {
  source: RecallSource;
  make: string;
  model: string;
  modelYear: number;
  recalls: NormalizedRecall[];
  fetchedAt: Date;
  error: string | null;
}

export interface RecallFetcherConfig {
  /** Which sources to query. Default: both. */
  sources?: RecallSource[];
  nhtsaGateway?: NhtsaRecallsGateway;
  tcGateway?: TcRecallsGateway;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export class RecallFetcherGw {
  private readonly sources: RecallSource[];
  private readonly nhtsaGw: NhtsaRecallsGateway | null | undefined;
  private readonly tcGw: TcRecallsGateway | null | undefined;

  constructor(config: RecallFetcherConfig) {
    this.sources = config.sources || ['NHTSA', 'TC'];
    this.nhtsaGw = config.nhtsaGateway;
    this.tcGw = config.tcGateway;
  }

  /**
   * Fetch recalls from all configured sources for a given make/model/year.
   *
   * Returns one RecallFetchResult per source so the Core can update
   * vehicle_recall_lookups independently (different fetch timestamps,
   * different error states per source).
   *
   * Results within each source are already deduplicated by campaignNumber.
   */
  async fetchForLookup(
    make: string,
    model: string,
    modelYear: number
  ): Promise<RecallFetchResult[]> {
    const tasks: Promise<RecallFetchResult>[] = [];

    if (this.sources.includes('NHTSA') && this.nhtsaGw) {
      tasks.push(this.fetchFromNhtsa(make, model, modelYear));
    }

    if (this.sources.includes('TC') && this.tcGw) {
      tasks.push(this.fetchFromTc(make, model, modelYear));
    }

    // Run sources in parallel — they are independent APIs
    const results = await Promise.all(tasks);

    return results;
  }

  /**
   * Convenience: fetch from all sources and return a single merged,
   * deduplicated NormalizedRecall[] (for callers that don't need per-source
   * metadata). Deduplicates across sources by campaignNumber.
   */
  async fetchMerged(
    make: string,
    model: string,
    modelYear: number
  ): Promise<NormalizedRecall[]> {
    const results = await this.fetchForLookup(make, model, modelYear);

    const allRecalls: NormalizedRecall[] = [];

    for (const result of results) {
      allRecalls.push(...result.recalls);
    }

    return this.deduplicateByCampaignNumber(allRecalls);
  }

  // ===========================================================================
  // PRIVATE — per-source fetchers
  // ===========================================================================

  private async fetchFromNhtsa(
    make: string,
    model: string,
    modelYear: number
  ): Promise<RecallFetchResult> {
    const fetchedAt = new Date();

    if (!this.nhtsaGw) {
      return {
        source: 'NHTSA',
        make,
        model,
        modelYear,
        recalls: [],
        fetchedAt,
        error: 'Not configured',
      };
    }

    try {
      const recalls = await this.nhtsaGw.fetchByMakeModelYear(
        make,
        model,
        modelYear
      );

      return {
        source: 'NHTSA',
        make,
        model,
        modelYear,
        recalls: this.deduplicateByCampaignNumber(recalls),
        fetchedAt,
        error: null,
      };
    } catch (error: any) {
      console.error(`RecallFetcherGw NHTSA error [${make} ${model} ${modelYear}]:`, error);

      return {
        source: 'NHTSA',
        make,
        model,
        modelYear,
        recalls: [],
        fetchedAt,
        error: error.message || 'Unknown NHTSA error',
      };
    }
  }

  private async fetchFromTc(
    make: string,
    model: string,
    modelYear: number
  ): Promise<RecallFetchResult> {
    const fetchedAt = new Date();

    if (!this.tcGw) {
      return {
        source: 'TC',
        make,
        model,
        modelYear,
        recalls: [],
        fetchedAt,
        error: 'Not configured',
      };
    }

    try {
      const recalls = await this.tcGw.fetchByMakeModelYear(
        make,
        model,
        modelYear
      );

      return {
        source: 'TC',
        make,
        model,
        modelYear,
        recalls: this.deduplicateByCampaignNumber(recalls),
        fetchedAt,
        error: null,
      };
    } catch (error: any) {
      console.error(`RecallFetcherGw TC error [${make} ${model} ${modelYear}]:`, error);

      return {
        source: 'TC',
        make,
        model,
        modelYear,
        recalls: [],
        fetchedAt,
        error: error.message || 'Unknown TC error',
      };
    }
  }

  // ===========================================================================
  // PRIVATE — deduplication
  // ===========================================================================

  /**
   * Remove duplicate recalls that share the same (campaignNumber + source).
   * Keeps the first occurrence.
   */
  private deduplicateByCampaignNumber(
    recalls: NormalizedRecall[]
  ): NormalizedRecall[] {
    const seen = new Set<string>();
    const unique: NormalizedRecall[] = [];

    for (const recall of recalls) {
      const key = `${recall.source}::${recall.campaignNumber}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(recall);
      }
    }

    return unique;
  }
}