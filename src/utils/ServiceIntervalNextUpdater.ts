// ./src/utils/ServiceIntervalNextUpdater.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { TABLES, FIELDS, INTERVAL_TYPES, EXPENSE_TYPES } from '../database';

dayjs.extend(utc);

/**
 * Parameters for service interval update operations
 */
interface ServiceIntervalUpdateParams {
  expenseId: string;
  carId: string;
  kindId: number;
  whenDone: Date | string;
  odometer: number | null;
}

/**
 * Interval settings resolved from customization or defaults
 */
interface ResolvedIntervalSettings {
  intervalType: number;
  mileageIntervalKm: number;
  daysInterval: number;
}

/**
 * ServiceIntervalNextUpdater handles incremental and full recalculation of
 * upcoming service intervals based on expense records.
 *
 * Design principles:
 * - All methods are stateless and can be moved to async workers later
 * - Uses upsert pattern for records that may not exist
 * - Stores all distances in kilometers (metric)
 * - Stores all dates in UTC
 * - Supports both incremental updates and full recalculation
 * - Safe to run recalculation multiple times (idempotent)
 *
 * Interval Type behavior:
 * - NONE (0): No tracking - delete record if exists
 * - MILEAGE_ONLY (1): Only track by mileage
 * - DAYS_ONLY (2): Only track by days
 * - MILEAGE_OR_DAYS (3): Track both, due when either is reached
 * - MILEAGE_AND_DAYS (4): Track both, due when both are reached
 */
class ServiceIntervalNextUpdater {
  private db: any;
  private schema: string;

  constructor(db: any, schema: string) {
    this.db = db;
    this.schema = schema;
  }

  // ===========================================================================
  // Public Methods - Incremental Updates
  // ===========================================================================

  /**
   * Update service interval when an expense is created.
   * Only processes expenses with scheduleable kindId.
   */
  async onExpenseCreated(params: ServiceIntervalUpdateParams): Promise<void> {
    const { carId, kindId, whenDone, odometer } = params;

    // Check if this kindId is scheduleable
    const isScheduleable = await this.isKindScheduleable(kindId);
    if (!isScheduleable) {
      return;
    }

    // Get interval settings for this car+kind
    const settings = await this.getIntervalSettings(carId, kindId);

    // If intervalType is NONE, remove any existing record
    if (settings.intervalType === INTERVAL_TYPES.NONE) {
      await this.deleteRecord(carId, kindId);
      return;
    }

    // Upsert the record with GREATEST for max values
    await this.upsertOnCreate(carId, kindId, whenDone, odometer, settings);
  }

  /**
   * Update service interval when an expense is removed.
   * Recalculates max values from remaining expenses.
   */
  async onExpenseRemoved(params: ServiceIntervalUpdateParams): Promise<void> {
    const { carId, kindId } = params;

    // Check if this kindId is scheduleable
    const isScheduleable = await this.isKindScheduleable(kindId);
    if (!isScheduleable) {
      return;
    }

    // Recalculate from remaining expenses
    await this.recalculateForCarAndKind(carId, kindId);
  }

  /**
   * Update service interval when an expense is updated.
   * Handles kindId changes and value changes.
   */
  async onExpenseUpdated(
    oldParams: ServiceIntervalUpdateParams,
    newParams: ServiceIntervalUpdateParams,
  ): Promise<void> {
    const kindChanged = oldParams.kindId !== newParams.kindId;

    if (kindChanged) {
      // Treat as remove from old kind + create for new kind
      await this.onExpenseRemoved(oldParams);
      await this.onExpenseCreated(newParams);
    } else {
      // Same kindId - recalculate to handle any value changes
      // This is safer than trying to detect if old value was the MAX
      await this.recalculateForCarAndKind(newParams.carId, newParams.kindId);
    }
  }

  /**
   * Called when interval settings change for a car+kind.
   * Recalculates next values with new interval settings.
   */
  async onIntervalSettingsChanged(carId: string, kindId: number): Promise<void> {
    await this.recalculateForCarAndKind(carId, kindId);
  }

  // ===========================================================================
  // Public Methods - Full Recalculation
  // ===========================================================================

  /**
   * Full recalculation of service intervals for a specific car.
   * Safe to run multiple times - produces consistent results.
   *
   * @param carId - The car to recalculate intervals for
   */
  async recalculateForCar(carId: string): Promise<void> {
    // Delete existing records for this car
    await this.db.runRawQuery(
      `DELETE FROM ${this.schema}.${TABLES.SERVICE_INTERVAL_NEXTS} WHERE ${FIELDS.CAR_ID} = ?`,
      [carId],
    );

    // Get all scheduleable kinds
    const scheduleableKinds = await this.getScheduleableKindIds();

    if (scheduleableKinds.length === 0) {
      return;
    }

    // Recalculate for each scheduleable kind
    for (const kindId of scheduleableKinds) {
      await this.recalculateForCarAndKind(carId, kindId);
    }
  }

  /**
   * Full recalculation of ALL service intervals in the system.
   * Safe to run multiple times - produces consistent results.
   * Use with caution - can be expensive for large datasets.
   */
  async recalculateAll(): Promise<void> {
    // Clear all existing records
    await this.db.runRawQuery(`DELETE FROM ${this.schema}.${TABLES.SERVICE_INTERVAL_NEXTS}`);

    // Get all scheduleable kinds
    const scheduleableKinds = await this.getScheduleableKindIds();

    if (scheduleableKinds.length === 0) {
      return;
    }

    // Insert all records in one efficient SQL query
    await this.bulkRecalculateAll(scheduleableKinds);
  }

  // ===========================================================================
  // Private Methods - Core Logic
  // ===========================================================================

  /**
   * Recalculate service interval for a specific car and kind.
   * Creates, updates, or deletes record as appropriate.
   */
  private async recalculateForCarAndKind(carId: string, kindId: number): Promise<void> {
    // Get interval settings
    const settings = await this.getIntervalSettings(carId, kindId);

    // If intervalType is NONE, delete any existing record
    if (settings.intervalType === INTERVAL_TYPES.NONE) {
      await this.deleteRecord(carId, kindId);
      return;
    }

    // Find max whenDone and odometer from expenses
    const maxValues = await this.getMaxValuesForCarAndKind(carId, kindId);

    // If no expenses found, delete any existing record
    if (!maxValues) {
      await this.deleteRecord(carId, kindId);
      return;
    }

    // Calculate next values
    const nextWhenDo = this.calculateNextWhenDo(maxValues.maxWhenDone, settings);
    const nextOdometer = this.calculateNextOdometer(maxValues.maxOdometer, settings);

    // Upsert the record
    await this.upsertRecord(carId, kindId, settings, maxValues, nextWhenDo, nextOdometer);
  }

  /**
   * Upsert record when creating an expense.
   * Uses GREATEST to handle concurrent creates efficiently.
   */
  private async upsertOnCreate(
    carId: string,
    kindId: number,
    whenDone: Date | string,
    odometer: number | null,
    settings: ResolvedIntervalSettings,
  ): Promise<void> {
    const whenDoneDate = dayjs.utc(whenDone).format('YYYY-MM-DD HH:mm:ss');
    const t = TABLES.SERVICE_INTERVAL_NEXTS;

    // Calculate next values for the new record case
    const nextWhenDo = this.calculateNextWhenDo(whenDoneDate, settings);
    const nextOdometer = this.calculateNextOdometer(odometer, settings);

    const sql = `
      INSERT INTO ${this.schema}.${t} (
        ${FIELDS.CAR_ID},
        ${FIELDS.KIND_ID},
        ${FIELDS.INTERVAL_TYPE},
        ${FIELDS.MILEAGE_INTERVAL},
        ${FIELDS.DAYS_INTERVAL},
        ${FIELDS.MAX_WHEN_DONE},
        ${FIELDS.MAX_ODOMETER},
        ${FIELDS.NEXT_WHEN_DO},
        ${FIELDS.NEXT_ODOMETER},
        ${FIELDS.STATUS}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100)
      ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.KIND_ID})
      DO UPDATE SET
        ${FIELDS.INTERVAL_TYPE} = ?,
        ${FIELDS.MILEAGE_INTERVAL} = ?,
        ${FIELDS.DAYS_INTERVAL} = ?,
        ${FIELDS.MAX_WHEN_DONE} = GREATEST(${t}.${FIELDS.MAX_WHEN_DONE}, EXCLUDED.${FIELDS.MAX_WHEN_DONE}),
        ${FIELDS.MAX_ODOMETER} = GREATEST(COALESCE(${t}.${FIELDS.MAX_ODOMETER}, 0), COALESCE(EXCLUDED.${FIELDS.MAX_ODOMETER}, 0)),
        ${FIELDS.NEXT_WHEN_DO} = CASE 
          WHEN ? > 0 THEN GREATEST(${t}.${FIELDS.MAX_WHEN_DONE}, EXCLUDED.${FIELDS.MAX_WHEN_DONE}) + INTERVAL '1 day' * ?
          ELSE ${t}.${FIELDS.NEXT_WHEN_DO}
        END,
        ${FIELDS.NEXT_ODOMETER} = CASE 
          WHEN ? > 0 THEN GREATEST(COALESCE(${t}.${FIELDS.MAX_ODOMETER}, 0), COALESCE(EXCLUDED.${FIELDS.MAX_ODOMETER}, 0)) + ?
          ELSE ${t}.${FIELDS.NEXT_ODOMETER}
        END
    `;

    const bindings = [
      // INSERT values
      carId,
      kindId,
      settings.intervalType,
      settings.mileageIntervalKm,
      settings.daysInterval,
      whenDoneDate,
      odometer,
      nextWhenDo,
      nextOdometer,
      // UPDATE values
      settings.intervalType,
      settings.mileageIntervalKm,
      settings.daysInterval,
      settings.daysInterval, // for CASE WHEN
      settings.daysInterval, // for INTERVAL calculation
      settings.mileageIntervalKm, // for CASE WHEN
      settings.mileageIntervalKm, // for addition
    ];

    await this.db.runRawQuery(sql, bindings);
  }

  /**
   * Upsert a fully calculated record
   */
  private async upsertRecord(
    carId: string,
    kindId: number,
    settings: ResolvedIntervalSettings,
    maxValues: { maxWhenDone: string; maxOdometer: number | null },
    nextWhenDo: string | null,
    nextOdometer: number | null,
  ): Promise<void> {
    const t = TABLES.SERVICE_INTERVAL_NEXTS;

    const sql = `
      INSERT INTO ${this.schema}.${t} (
        ${FIELDS.CAR_ID},
        ${FIELDS.KIND_ID},
        ${FIELDS.INTERVAL_TYPE},
        ${FIELDS.MILEAGE_INTERVAL},
        ${FIELDS.DAYS_INTERVAL},
        ${FIELDS.MAX_WHEN_DONE},
        ${FIELDS.MAX_ODOMETER},
        ${FIELDS.NEXT_WHEN_DO},
        ${FIELDS.NEXT_ODOMETER},
        ${FIELDS.STATUS}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100)
      ON CONFLICT (${FIELDS.CAR_ID}, ${FIELDS.KIND_ID})
      DO UPDATE SET
        ${FIELDS.INTERVAL_TYPE} = EXCLUDED.${FIELDS.INTERVAL_TYPE},
        ${FIELDS.MILEAGE_INTERVAL} = EXCLUDED.${FIELDS.MILEAGE_INTERVAL},
        ${FIELDS.DAYS_INTERVAL} = EXCLUDED.${FIELDS.DAYS_INTERVAL},
        ${FIELDS.MAX_WHEN_DONE} = EXCLUDED.${FIELDS.MAX_WHEN_DONE},
        ${FIELDS.MAX_ODOMETER} = EXCLUDED.${FIELDS.MAX_ODOMETER},
        ${FIELDS.NEXT_WHEN_DO} = EXCLUDED.${FIELDS.NEXT_WHEN_DO},
        ${FIELDS.NEXT_ODOMETER} = EXCLUDED.${FIELDS.NEXT_ODOMETER}
    `;

    await this.db.runRawQuery(sql, [
      carId,
      kindId,
      settings.intervalType,
      settings.mileageIntervalKm,
      settings.daysInterval,
      maxValues.maxWhenDone,
      maxValues.maxOdometer,
      nextWhenDo,
      nextOdometer,
    ]);
  }

  /**
   * Delete a service interval record
   */
  private async deleteRecord(carId: string, kindId: number): Promise<void> {
    await this.db.runRawQuery(
      `DELETE FROM ${this.schema}.${TABLES.SERVICE_INTERVAL_NEXTS} 
       WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.KIND_ID} = ?`,
      [carId, kindId],
    );
  }

  /**
   * Bulk recalculate all service intervals using efficient SQL.
   * Inserts records for all car+kind combinations that have expenses.
   */
  private async bulkRecalculateAll(scheduleableKindIds: number[]): Promise<void> {
    if (scheduleableKindIds.length === 0) {
      return;
    }

    const kindIdPlaceholders = scheduleableKindIds.map(() => '?').join(', ');

    // This query:
    // 1. Finds all car+kind combinations with expenses
    // 2. Gets max whenDone and odometer for each
    // 3. Joins with interval settings (customization or default)
    // 4. Calculates next values
    // 5. Only includes records where intervalType > 0
    const sql = `
      WITH expense_maxes AS (
        SELECT 
          eb.${FIELDS.CAR_ID},
          e.${FIELDS.KIND_ID},
          MAX(eb.${FIELDS.WHEN_DONE}) AS max_when_done,
          MAX(eb.${FIELDS.ODOMETER}) AS max_odometer
        FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
        JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
        WHERE eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
          AND eb.${FIELDS.STATUS} = 100
          AND eb.${FIELDS.REMOVED_AT} IS NULL
          AND e.${FIELDS.KIND_ID} IN (${kindIdPlaceholders})
        GROUP BY eb.${FIELDS.CAR_ID}, e.${FIELDS.KIND_ID}
      ),
      interval_settings AS (
        SELECT 
          em.${FIELDS.CAR_ID},
          em.${FIELDS.KIND_ID},
          em.max_when_done,
          em.max_odometer,
          COALESCE(sia.${FIELDS.INTERVAL_TYPE}, sid.${FIELDS.INTERVAL_TYPE}, 0) AS interval_type,
          COALESCE(sia.${FIELDS.MILEAGE_INTERVAL_KM}, sid.${FIELDS.MILEAGE_INTERVAL}, 0) AS mileage_interval_km,
          COALESCE(sia.${FIELDS.DAYS_INTERVAL}, sid.${FIELDS.DAYS_INTERVAL}, 0) AS days_interval
        FROM expense_maxes em
        LEFT JOIN ${this.schema}.${TABLES.SERVICE_INTERVAL_ACCOUNTS} sia 
          ON sia.${FIELDS.CAR_ID} = em.${FIELDS.CAR_ID} 
          AND sia.${FIELDS.KIND_ID} = em.${FIELDS.KIND_ID}
          AND sia.${FIELDS.REMOVED_AT} IS NULL
        LEFT JOIN ${this.schema}.${TABLES.SERVICE_INTERVAL_DEFAULTS} sid 
          ON sid.${FIELDS.KIND_ID} = em.${FIELDS.KIND_ID}
          AND sid.${FIELDS.STATUS} = 100
      )
      INSERT INTO ${this.schema}.${TABLES.SERVICE_INTERVAL_NEXTS} (
        ${FIELDS.CAR_ID},
        ${FIELDS.KIND_ID},
        ${FIELDS.INTERVAL_TYPE},
        ${FIELDS.MILEAGE_INTERVAL},
        ${FIELDS.DAYS_INTERVAL},
        ${FIELDS.MAX_WHEN_DONE},
        ${FIELDS.MAX_ODOMETER},
        ${FIELDS.NEXT_WHEN_DO},
        ${FIELDS.NEXT_ODOMETER},
        ${FIELDS.STATUS}
      )
      SELECT 
        ${FIELDS.CAR_ID},
        ${FIELDS.KIND_ID},
        interval_type,
        mileage_interval_km,
        days_interval,
        max_when_done,
        max_odometer,
        CASE 
          WHEN days_interval > 0 THEN max_when_done + INTERVAL '1 day' * days_interval
          ELSE NULL
        END AS next_when_do,
        CASE 
          WHEN mileage_interval_km > 0 AND max_odometer IS NOT NULL THEN max_odometer + mileage_interval_km
          ELSE NULL
        END AS next_odometer,
        100 AS status
      FROM interval_settings
      WHERE interval_type > 0
    `;

    await this.db.runRawQuery(sql, scheduleableKindIds);
  }

  // ===========================================================================
  // Private Methods - Data Retrieval
  // ===========================================================================

  /**
   * Check if a kindId is scheduleable
   */
  private async isKindScheduleable(kindId: number): Promise<boolean> {
    const result = await this.db.runRawQuery(
      `SELECT ${FIELDS.CAN_SCHEDULE} FROM ${this.schema}.${TABLES.EXPENSE_KINDS} 
       WHERE ${FIELDS.ID} = ? AND ${FIELDS.STATUS} = 100`,
      [kindId],
    );

    return result?.rows?.[0]?.can_schedule === true;
  }

  /**
   * Get all scheduleable kind IDs
   */
  private async getScheduleableKindIds(): Promise<number[]> {
    const result = await this.db.runRawQuery(
      `SELECT ${FIELDS.ID} FROM ${this.schema}.${TABLES.EXPENSE_KINDS} 
       WHERE ${FIELDS.CAN_SCHEDULE} = true AND ${FIELDS.STATUS} = 100`,
    );

    return (result?.rows || []).map((row: any) => row.id);
  }

  /**
   * Get interval settings for a car+kind.
   * Priority: customization > default > none
   */
  private async getIntervalSettings(carId: string, kindId: number): Promise<ResolvedIntervalSettings> {
    // First, try to get customization
    const customResult = await this.db.runRawQuery(
      `SELECT 
        ${FIELDS.INTERVAL_TYPE},
        ${FIELDS.MILEAGE_INTERVAL_KM},
        ${FIELDS.DAYS_INTERVAL}
       FROM ${this.schema}.${TABLES.SERVICE_INTERVAL_ACCOUNTS}
       WHERE ${FIELDS.CAR_ID} = ? AND ${FIELDS.KIND_ID} = ? AND ${FIELDS.REMOVED_AT} IS NULL`,
      [carId, kindId],
    );

    if (customResult?.rows?.[0]) {
      const row = customResult.rows[0];
      return {
        intervalType: row.interval_type,
        mileageIntervalKm: Number(row.mileage_interval_km) || 0,
        daysInterval: row.days_interval || 0,
      };
    }

    // Fall back to default
    const defaultResult = await this.db.runRawQuery(
      `SELECT 
        ${FIELDS.INTERVAL_TYPE},
        ${FIELDS.MILEAGE_INTERVAL},
        ${FIELDS.DAYS_INTERVAL}
       FROM ${this.schema}.${TABLES.SERVICE_INTERVAL_DEFAULTS}
       WHERE ${FIELDS.KIND_ID} = ? AND ${FIELDS.STATUS} = 100`,
      [kindId],
    );

    if (defaultResult?.rows?.[0]) {
      const row = defaultResult.rows[0];
      return {
        intervalType: row.interval_type,
        mileageIntervalKm: Number(row.mileage_interval) || 0, // defaults are always in km
        daysInterval: row.days_interval || 0,
      };
    }

    // No settings found - return NONE
    return {
      intervalType: INTERVAL_TYPES.NONE,
      mileageIntervalKm: 0,
      daysInterval: 0,
    };
  }

  /**
   * Get max whenDone and odometer for a car+kind from expenses
   */
  private async getMaxValuesForCarAndKind(
    carId: string,
    kindId: number,
  ): Promise<{ maxWhenDone: string; maxOdometer: number | null } | null> {
    const result = await this.db.runRawQuery(
      `SELECT 
        MAX(eb.${FIELDS.WHEN_DONE}) AS max_when_done,
        MAX(eb.${FIELDS.ODOMETER}) AS max_odometer
       FROM ${this.schema}.${TABLES.EXPENSE_BASES} eb
       JOIN ${this.schema}.${TABLES.EXPENSES} e ON e.${FIELDS.ID} = eb.${FIELDS.ID}
       WHERE eb.${FIELDS.CAR_ID} = ?
         AND e.${FIELDS.KIND_ID} = ?
         AND eb.${FIELDS.EXPENSE_TYPE} = ${EXPENSE_TYPES.EXPENSE}
         AND eb.${FIELDS.STATUS} = 100
         AND eb.${FIELDS.REMOVED_AT} IS NULL`,
      [carId, kindId],
    );

    const row = result?.rows?.[0];

    if (!row || !row.max_when_done) {
      return null;
    }

    return {
      maxWhenDone: dayjs.utc(row.max_when_done).format('YYYY-MM-DD HH:mm:ss'),
      maxOdometer: row.max_odometer != null ? Number(row.max_odometer) : null,
    };
  }

  // ===========================================================================
  // Private Methods - Calculations
  // ===========================================================================

  /**
   * Calculate next when do date based on interval settings
   */
  private calculateNextWhenDo(maxWhenDone: Date | string, settings: ResolvedIntervalSettings): string | null {
    // Only calculate if days interval is configured
    if (settings.daysInterval <= 0) {
      return null;
    }

    // Only calculate if interval type uses days
    const usesDays = [
      INTERVAL_TYPES.DAYS_ONLY,
      INTERVAL_TYPES.MILEAGE_OR_DAYS,
      INTERVAL_TYPES.MILEAGE_AND_DAYS,
    ].includes(settings.intervalType);

    if (!usesDays) {
      return null;
    }

    return dayjs.utc(maxWhenDone).add(settings.daysInterval, 'day').format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * Calculate next odometer reading based on interval settings
   */
  private calculateNextOdometer(maxOdometer: number | null, settings: ResolvedIntervalSettings): number | null {
    // Can't calculate without a base odometer
    if (maxOdometer == null) {
      return null;
    }

    // Only calculate if mileage interval is configured
    if (settings.mileageIntervalKm <= 0) {
      return null;
    }

    // Only calculate if interval type uses mileage
    const usesMileage = [
      INTERVAL_TYPES.MILEAGE_ONLY,
      INTERVAL_TYPES.MILEAGE_OR_DAYS,
      INTERVAL_TYPES.MILEAGE_AND_DAYS,
    ].includes(settings.intervalType);

    if (!usesMileage) {
      return null;
    }

    return maxOdometer + settings.mileageIntervalKm;
  }
}

export { ServiceIntervalNextUpdater, ServiceIntervalUpdateParams };
