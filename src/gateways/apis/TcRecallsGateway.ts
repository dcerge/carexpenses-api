// ./src/gateways/apis/TcRecallsGateway.ts

/**
 * Transport Canada – Vehicle Recalls Database (VRDB) Gateway
 * 
 * Reads from the monthly CSV export available at:
 * https://opendatatc.tc.canada.ca/vrdb_full_monthly.csv
 * 
 * The CSV should be downloaded periodically (e.g., weekly cron) and stored
 * locally. Path is configured via VRDB_CSV_FILE_PATH environment variable.
 * 
 * This gateway provides the same interface as NhtsaRecallsGateway for
 * seamless integration with RecallFetcherGw.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { NormalizedRecall } from './NhtsaRecallsGateway';

// ---------------------------------------------------------------------------
// CSV Column mapping (from the TC VRDB export)
// ---------------------------------------------------------------------------
// "RECALL_NUMBER_NUM","YEAR","MANUFACTURER_RECALL_NO_TXT","CATEGORY_ETXT",
// "CATEGORY_FTXT","MAKE_NAME_NM","MODEL_NAME_NM","UNIT_AFFECTED_NBR",
// "SYSTEM_TYPE_ETXT","SYSTEM_TYPE_FTXT","NOTIFICATION_TYPE_ETXT",
// "NOTIFICATION_TYPE_FTXT","COMMENT_ETXT","COMMENT_FTXT","RECALL_DATE_DTE"

interface TcCsvRecord {
  recallNumber: string;
  year: number;
  manufacturerRecallNo: string;
  categoryEn: string;
  categoryFr: string;
  makeName: string;
  modelName: string;
  unitsAffected: number;
  systemTypeEn: string;
  systemTypeFr: string;
  notificationTypeEn: string;
  notificationTypeFr: string;
  commentEn: string;
  commentFr: string;
  recallDate: string;
}

export interface TcRecallsConfig {
  /** Path to the downloaded VRDB CSV file */
  csvFilePath: string;
  /** Optional: cache parsed records in memory (default: true) */
  useCache?: boolean;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export class TcRecallsGateway {
  private readonly csvFilePath: string;
  private readonly useCache: boolean;

  /** In-memory index: Map<"MAKE::MODEL::YEAR", TcCsvRecord[]> */
  private recordIndex: Map<string, TcCsvRecord[]> | null = null;
  private lastLoadedAt: Date | null = null;
  private fileModTime: number | null = null;

  constructor(config: TcRecallsConfig) {
    this.csvFilePath = config.csvFilePath;
    this.useCache = config.useCache !== false;
  }

  /**
   * Fetch recalls by make, model, and model year.
   * Returns the same NormalizedRecall[] shape used by NhtsaRecallsGateway.
   */
  async fetchByMakeModelYear(
    make: string,
    model: string,
    modelYear: number
  ): Promise<NormalizedRecall[]> {
    // Ensure index is loaded (and refresh if file changed)
    await this.ensureIndexLoaded();

    if (!this.recordIndex) {
      console.warn('TcRecallsGateway: No index available');
      return [];
    }

    // Normalize search keys to uppercase
    const searchMake = make.toUpperCase().trim();
    const searchModel = model.toUpperCase().trim();
    const key = `${searchMake}::${searchModel}::${modelYear}`;

    const records = this.recordIndex.get(key) || [];

    return records.map((record) => this.normalize(record));
  }

  /**
   * Check if the CSV file exists and is readable.
   */
  isAvailable(): boolean {
    try {
      fs.accessSync(this.csvFilePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Force reload of the CSV file (useful after a new download).
   */
  async reload(): Promise<void> {
    this.recordIndex = null;
    this.lastLoadedAt = null;
    this.fileModTime = null;
    await this.ensureIndexLoaded();
  }

  /**
   * Get stats about the loaded data.
   */
  getStats(): { recordCount: number; uniqueCombos: number; lastLoadedAt: Date | null } {
    let recordCount = 0;
    if (this.recordIndex) {
      for (const records of this.recordIndex.values()) {
        recordCount += records.length;
      }
    }

    return {
      recordCount,
      uniqueCombos: this.recordIndex?.size || 0,
      lastLoadedAt: this.lastLoadedAt,
    };
  }

  // ===========================================================================
  // PRIVATE — Index management
  // ===========================================================================

  /**
   * Load and index the CSV file if not already loaded or if the file changed.
   */
  private async ensureIndexLoaded(): Promise<void> {
    if (!this.useCache) {
      // No caching — reload every time
      await this.loadAndIndexCsv();
      return;
    }

    // Check if file exists
    let stats: fs.Stats;
    try {
      stats = fs.statSync(this.csvFilePath);
    } catch (err) {
      console.error(`TcRecallsGateway: CSV file not found at ${this.csvFilePath}`);
      this.recordIndex = new Map();
      return;
    }

    const currentModTime = stats.mtimeMs;

    // Reload if file changed or never loaded
    if (!this.recordIndex || this.fileModTime !== currentModTime) {
      await this.loadAndIndexCsv();
      this.fileModTime = currentModTime;
    }
  }

  /**
   * Parse the CSV and build an in-memory index keyed by MAKE::MODEL::YEAR.
   */
  private async loadAndIndexCsv(): Promise<void> {
    const startTime = Date.now();
    const newIndex = new Map<string, TcCsvRecord[]>();
    let lineCount = 0;
    let errorCount = 0;

    const fileStream = fs.createReadStream(this.csvFilePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let isHeader = true;

    for await (const line of rl) {
      if (isHeader) {
        isHeader = false;
        continue; // Skip header row
      }

      lineCount++;

      try {
        const record = this.parseCsvLine(line);

        if (!record) {
          continue;
        }

        // Build index key: MAKE::MODEL::YEAR
        const key = `${record.makeName}::${record.modelName}::${record.year}`;

        if (!newIndex.has(key)) {
          newIndex.set(key, []);
        }
        newIndex.get(key)!.push(record);
      } catch (err) {
        errorCount++;
        if (errorCount <= 5) {
          console.warn(`TcRecallsGateway: Error parsing line ${lineCount}:`, err);
        }
      }
    }

    this.recordIndex = newIndex;
    this.lastLoadedAt = new Date();

    const elapsed = Date.now() - startTime;
    console.log(
      `TcRecallsGateway: Loaded ${lineCount} records into ${newIndex.size} combos in ${elapsed}ms` +
      (errorCount > 0 ? ` (${errorCount} parse errors)` : '')
    );
  }

  // ===========================================================================
  // PRIVATE — CSV parsing
  // ===========================================================================

  /**
   * Parse a single CSV line into a TcCsvRecord.
   * Handles quoted fields and embedded commas.
   */
  private parseCsvLine(line: string): TcCsvRecord | null {
    const fields = this.parseCsvFields(line);

    if (fields.length < 15) {
      return null;
    }

    const year = parseInt(fields[1], 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return null;
    }

    const makeName = (fields[5] || '').toUpperCase().trim();
    const modelName = (fields[6] || '').toUpperCase().trim();

    if (!makeName || !modelName) {
      return null;
    }

    return {
      recallNumber: fields[0] || '',
      year,
      manufacturerRecallNo: fields[2] || '',
      categoryEn: fields[3] || '',
      categoryFr: fields[4] || '',
      makeName,
      modelName,
      unitsAffected: this.parseNumber(fields[7]),
      systemTypeEn: fields[8] || '',
      systemTypeFr: fields[9] || '',
      notificationTypeEn: fields[10] || '',
      notificationTypeFr: fields[11] || '',
      commentEn: fields[12] || '',
      commentFr: fields[13] || '',
      recallDate: fields[14] || '',
    };
  }

  /**
   * Parse CSV fields handling quoted values with embedded commas.
   */
  private parseCsvFields(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          inQuotes = true;
        } else if (char === ',') {
          // Field separator
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    // Push last field
    fields.push(current.trim());

    return fields;
  }

  /**
   * Parse a number from CSV, handling formatted numbers like "2,700.00".
   */
  private parseNumber(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/,/g, '').replace(/"/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // ===========================================================================
  // PRIVATE — Normalization
  // ===========================================================================

  /**
   * Map TC CSV record → NormalizedRecall (same shape as NHTSA gateway).
   *
   * TC does not have parkIt / parkOutside / otaUpdate flags — these are
   * NHTSA-specific severity indicators. We default them to false.
   */
  private normalize(record: TcCsvRecord): NormalizedRecall {
    return {
      source: 'TC',
      campaignNumber: record.recallNumber,
      manufacturer: null, // TC doesn't provide manufacturer name in the same way
      component: null,    // TC uses systemType instead
      systemType: record.systemTypeEn || null,
      summary: record.commentEn || null,
      consequence: null,  // TC doesn't separate consequence
      remedy: null,       // TC doesn't separate remedy
      notes: this.buildNotes(record),
      reportReceivedDate: this.parseDate(record.recallDate),
      parkIt: false,
      parkOutside: false,
      otaUpdate: false,
    };
  }

  /**
   * Build notes field from TC-specific data.
   */
  private buildNotes(record: TcCsvRecord): string | null {
    const parts: string[] = [];

    if (record.categoryEn) {
      parts.push(`Category: ${record.categoryEn}`);
    }

    if (record.notificationTypeEn) {
      parts.push(`Notification: ${record.notificationTypeEn}`);
    }

    if (record.unitsAffected > 0) {
      parts.push(`Units affected: ${record.unitsAffected.toLocaleString()}`);
    }

    if (record.manufacturerRecallNo) {
      parts.push(`Manufacturer recall #: ${record.manufacturerRecallNo}`);
    }

    return parts.length > 0 ? parts.join('. ') + '.' : null;
  }

  /**
   * Parse TC date format "YYYY-MM-DD" — already ISO format.
   */
  private parseDate(value: string | null | undefined): string | null {
    if (!value || !value.trim()) {
      return null;
    }

    const trimmed = value.trim();

    // TC dates are already YYYY-MM-DD; validate format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }
}