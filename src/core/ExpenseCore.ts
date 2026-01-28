// ./src/core/ExpenseCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { weatherGateway } from '../weatherClient';
import { mapWeatherToDbFields } from '../gateways/apis/weather';

import { AppCore } from './AppCore';
import { validators } from './validators/expenseValidators';
import { ENTITY_TYPE_IDS, EXPENSE_TYPES, UserProfile } from '../boundary';
import config from '../config';
import {
  CarStatsUpdater,
  StatsOperationParams,
  ServiceIntervalNextUpdater,
  ServiceIntervalUpdateParams,
} from '../utils';
import {
  toMetricDistance,
  fromMetricDistanceRounded,
  toMetricVolume,
  fromMetricVolume,
  calculateConsumption,
  isLiquidUnit,
  getConsumptionUnitForFuelType,
} from '../utils/unitConversions';

dayjs.extend(utc);

interface ExpenseUpdateData {
  expenseType: number;
  expenseId: string;
  extensionParams: any;
  uploadedFilesIds: string[];
  tags: string[];
  oldExpenseBase?: any; // Store old expense for stats delta calculation
  oldExtension?: any; // Store old extension data (refuel or expense)
}

class ExpenseCore extends AppCore {
  private updateData: Map<string, ExpenseUpdateData> = new Map();
  private statsUpdater: CarStatsUpdater | null = null;
  private serviceIntervalUpdater: ServiceIntervalNextUpdater | null = null;

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseBaseGw',
      name: 'Expense',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expenses',
        get: 'getting an expense',
        getMany: 'getting multiple expenses',
        create: 'creating an expense',
        createMany: '',
        update: 'updating an expense',
        updateMany: '',
        set: '',
        remove: 'removing an expense',
        removeMany: 'removing multiple expenses',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  // ===========================================================================
  // Weather Integration
  // ===========================================================================

  /**
   * Fetch and store weather data for an expense record.
   * This is non-blocking - errors are logged but don't fail the main operation.
   */
  private async enrichWithWeather(
    expenseBaseId: string,
    latitude: number | null,
    longitude: number | null,
    whenDone: string | Date | null
  ): Promise<void> {
    // Skip if no weather gateway configured or no coordinates
    if (!weatherGateway || latitude == null || longitude == null) {
      return;
    }

    try {
      const recordedAt = whenDone ? new Date(whenDone) : undefined;

      const weather = await weatherGateway.fetchWeather({
        location: { latitude, longitude },
        recordedAt,
      });

      if (weather) {
        const weatherFields = mapWeatherToDbFields(weather);
        await this.getGateways().expenseBaseGw.update(
          { id: expenseBaseId },
          weatherFields
        );
      }
    } catch (error) {
      // Log but don't fail the main operation
      console.error(`Failed to fetch weather for expense ${expenseBaseId}:`, error);
    }
  }

  /**
   * Check if coordinates have changed between old and new expense data
   */
  private haveCoordinatesChanged(
    oldExpenseBase: any,
    newExpenseBase: any
  ): boolean {
    const oldLat = oldExpenseBase?.latitude;
    const oldLon = oldExpenseBase?.longitude;
    const newLat = newExpenseBase?.latitude;
    const newLon = newExpenseBase?.longitude;

    // If new coordinates are null/undefined, no need to fetch weather
    if (newLat == null || newLon == null) {
      return false;
    }

    // If old coordinates were null but new ones exist, fetch weather
    if (oldLat == null || oldLon == null) {
      return true;
    }

    // Compare coordinates (using small epsilon for floating point comparison)
    const epsilon = 0.0000001;
    return (
      Math.abs(oldLat - newLat) > epsilon ||
      Math.abs(oldLon - newLon) > epsilon
    );
  }

  // ===========================================================================
  // Stats Updater Management
  // ===========================================================================

  /**
   * Get or create the stats updater instance
   */
  private getStatsUpdater(): CarStatsUpdater {
    if (!this.statsUpdater) {
      const db = this.getDb();
      this.statsUpdater = new CarStatsUpdater(db, config.dbSchema);
    }
    return this.statsUpdater;
  }

  /**
   * Get or create the service interval updater instance
   */
  private getServiceIntervalUpdater(): ServiceIntervalNextUpdater {
    if (!this.serviceIntervalUpdater) {
      const db = this.getDb();
      this.serviceIntervalUpdater = new ServiceIntervalNextUpdater(db, config.dbSchema);
    }
    return this.serviceIntervalUpdater;
  }

  private async isExpenseKindMaintenance(kindId: number | null | undefined): Promise<boolean> {
    if (!kindId) return false;

    const expenseKind = await this.getGateways().expenseKindGw.get(kindId);
    return expenseKind?.isItMaintenance === true;
  }

  /**
   * Build StatsOperationParams from expense base and extension data
   */
  private buildStatsParams(expenseBase: any, extension: any, homeCurrency: string, isMaintenance?: boolean): StatsOperationParams {
    const params: StatsOperationParams = {
      recordId: expenseBase.id,
      carId: expenseBase.carId,
      homeCurrency,
      expenseType: expenseBase.expenseType,
      whenDone: expenseBase.whenDone,
      odometer: expenseBase.odometer,
      totalPriceInHc: expenseBase.totalPriceInHc,
    };

    if (expenseBase.expenseType === EXPENSE_TYPES.REFUEL) {
      params.refuelVolume = extension?.refuelVolume;
      // Only include tax if paid currency matches home currency
      if (expenseBase.paidInCurrency === homeCurrency) {
        params.refuelTaxesHc = expenseBase.tax;
      }
    } else if (expenseBase.expenseType === EXPENSE_TYPES.EXPENSE) {
      params.kindId = extension?.kindId;
      // Only include fees/tax if paid currency matches home currency
      if (expenseBase.paidInCurrency === homeCurrency) {
        params.expenseFeesHc = expenseBase.fees;
        params.expenseTaxesHc = expenseBase.tax;
      }
      params.isMaintenance = isMaintenance;
    } else if (expenseBase.expenseType === EXPENSE_TYPES.REVENUE) {
      params.kindId = extension?.kindId;
      // Note: For revenues, totalPriceInHc represents income earned
      // The stats updater should handle this as positive income vs negative expense
    }

    return params;
  }

  /**
   * Build ServiceIntervalUpdateParams from expense base and extension data.
   * Only applicable for expenses (not refuels).
   */
  private buildServiceIntervalParams(expenseBase: any, extension: any): ServiceIntervalUpdateParams | null {
    // Only expenses have kindId - refuels don't track service intervals
    if (expenseBase.expenseType !== EXPENSE_TYPES.EXPENSE) {
      return null;
    }

    const kindId = extension?.kindId;
    if (!kindId) {
      return null;
    }

    return {
      expenseId: expenseBase.id,
      carId: expenseBase.carId,
      kindId,
      whenDone: expenseBase.whenDone,
      odometer: expenseBase.odometer,
    };
  }

  /**
   * Determine home currency for stats
   * Priority: expense record's homeCurrency > paidInCurrency > user profile
   */
  private async getHomeCurrencyForStats(expenseBase: any): Promise<string> {
    // Use the expense record's home currency if available
    if (expenseBase.homeCurrency) {
      return expenseBase.homeCurrency;
    }

    // Fall back to paid in currency
    if (expenseBase.paidInCurrency) {
      return expenseBase.paidInCurrency;
    }

    // Last resort: use user's home currency
    const userProfile = await this.getCurrentUserProfile();
    return userProfile.homeCurrency;
  }

  // ===========================================================================
  // Unit Conversion Utilities (using shared functions)
  // ===========================================================================

  /**
   * Calculate trip meter for a refuel based on previous refuel's odometer
   */
  private calculateTripMeter(currentOdometer: number | null, previousOdometer: number | null): number | null {
    if (currentOdometer === null || previousOdometer === null) {
      return null;
    }

    const tripMeter = currentOdometer - previousOdometer;
    return tripMeter > 0 ? tripMeter : null;
  }

  /**
   * Find the immediately previous record for a car by expenseType.
   * For refuels, also filters by tankType.
   * 
   * @param carId - The car ID
   * @param expenseType - The expense type to filter by
   * @param currentWhenDone - The current record's timestamp
   * @param currentId - The current record's ID (to exclude from results)
   * @param accountId - The account ID for security filtering
   * @param tankType - For refuels only: the tank type to filter by ('main' or 'addl')
   */
  private async findPreviousRecord(
    carId: string,
    expenseType: number,
    currentWhenDone: string,
    currentId: string,
    accountId: string,
    tankType?: string,
  ): Promise<any | null> {
    // For refuels, we need to filter by tank type
    let validIds: Set<string> | null = null;

    if (expenseType === EXPENSE_TYPES.REFUEL && tankType) {
      const refuelRecords = await this.getGateways().refuelGw.list({
        filter: { tankType },
      });
      validIds = new Set(refuelRecords.map((r: any) => r.id));
    }

    // Fetch recent records up to and including currentWhenDone
    const recentRecords = await this.getGateways().expenseBaseGw.list({
      filter: {
        carId,
        accountId,
        expenseType,
        whenDoneTo: currentWhenDone,
      },
      params: {
        pagination: { pageSize: 20 },
        sortBy: [
          { name: 'whenDone', order: 'DESC' },
          { name: 'odometer', order: 'DESC' },
        ],
      },
    });

    // Find the first record that is not the current one (and matches tankType for refuels)
    for (const record of recentRecords) {
      if (record.id !== currentId) {
        // For refuels, check tank type match
        if (validIds && !validIds.has(record.id)) {
          continue;
        }
        return record;
      }
    }

    return null;
  }

  // ===========================================================================
  // Car Data Fetching (for mileageIn)
  // ===========================================================================

  /**
   * Batch fetch cars by IDs and return a map of carId -> car
   */
  private async batchFetchCars(carIds: string[]): Promise<Map<string, any>> {
    const carMap = new Map<string, any>();

    if (!carIds || carIds.length === 0) {
      return carMap;
    }

    // Remove duplicates
    const uniqueCarIds = [...new Set(carIds)];

    const cars = await this.getGateways().carGw.list({
      filter: { id: uniqueCarIds },
    });

    for (const car of cars) {
      carMap.set(car.id, car);
    }

    return carMap;
  }

  /**
   * Fetch a single car by ID
   */
  private async fetchCar(carId: string): Promise<any | null> {
    if (!carId) {
      return null;
    }

    return this.getGateways().carGw.get(carId);
  }

  // ===========================================================================
  // Process Item Methods
  // ===========================================================================

  /**
   * Process item on output - converts from metric to user's preferred units
   */
  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    // Format dates
    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.whenDone !== null && item.whenDone !== undefined) {
      item.whenDone = dayjs(item.whenDone).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  /**
   * Process item with user profile and car data for unit conversions.
   *
   * @param item - The expense item to process
   * @param userProfile - User's profile with distance/volume preferences
   * @param carMileageIn - The car's mileage unit ('km' or 'mi'), defaults to 'km'
   *
   * Conversion rules:
   * - Odometer: Uses car's mileageIn (matches what's shown on car's dashboard)
   * - TripMeter: Uses user's distanceIn preference (for distance calculations)
   * - Both are rounded to whole numbers (odometers don't show decimals)
   */
  private processItemWithProfile(item: any, userProfile: UserProfile, carMileageIn: string = 'km'): any {
    if (!item) return item;

    // First apply standard processing (date formatting)
    const processed = this.processItemOnOut(item);

    // Store original metric values before conversion (needed for consumption calculation)
    const odometerMetric = item.odometer;
    const tripMeterMetric = item.tripMeter;
    const refuelVolumeMetric = item.refuelVolume;

    // Convert odometer from metric (km) to car's mileage unit, rounded to whole number
    processed.odometer = fromMetricDistanceRounded(odometerMetric, carMileageIn);
    processed.odometerDisplay = fromMetricDistanceRounded(odometerMetric, userProfile.distanceIn);

    // Convert tripMeter from metric (km) to car's mileage unit, rounded to whole number
    processed.tripMeter = fromMetricDistanceRounded(tripMeterMetric, carMileageIn);
    processed.tripMeterDisplay = fromMetricDistanceRounded(tripMeterMetric, userProfile.distanceIn);

    // For refuels, convert volume and calculate consumption
    if (processed.expenseType === EXPENSE_TYPES.REFUEL) {
      const volumeEnteredIn = processed.volumeEnteredIn || 'l';

      // Convert refuel volume from metric back to the original entry unit
      processed.refuelVolume = fromMetricVolume(refuelVolumeMetric, volumeEnteredIn);

      // For display: liquid fuels use user's preference, electric/hydrogen stay as entered
      if (isLiquidUnit(volumeEnteredIn)) {
        processed.refuelVolumeDisplay = fromMetricVolume(refuelVolumeMetric, userProfile.volumeIn);
      } else {
        // kWh and kg - no conversion, display as stored
        processed.refuelVolumeDisplay = refuelVolumeMetric;
      }

      // Price per unit (handles all fuel types correctly now)
      if (processed.refuelVolumeDisplay && processed.refuelVolumeDisplay > 0) {
        processed.pricePerVolume = processed.totalPrice / processed.refuelVolumeDisplay;
      } else {
        processed.pricePerVolume = null;
      }

      // Calculate consumption only for full tank/charge refuels
      if (processed.isFullTank && tripMeterMetric !== null && tripMeterMetric > 0) {
        const effectiveConsumptionUnit = getConsumptionUnitForFuelType(
          userProfile.consumptionIn,
          volumeEnteredIn
        );
        processed.consumption = calculateConsumption(
          tripMeterMetric,
          refuelVolumeMetric,
          effectiveConsumptionUnit
        );
        processed.consumptionUnit = effectiveConsumptionUnit;
      } else {
        processed.consumption = null;
        processed.consumptionUnit = null;
      }
    }

    return processed;
  }

  /**
   * Convert input params from user's preferred units to metric.
   *
   * @param params - Input parameters to convert
   * @param carMileageIn - The car's mileage unit ('km' or 'mi') for odometer conversion
   */
  private async convertInputToMetric(params: any, carMileageIn: string): Promise<any> {
    const converted = { ...params };

    // Convert odometer from car's mileage unit to metric (km)
    // This matches what the user sees on their car's dashboard
    if (converted.odometer !== undefined && converted.odometer !== null) {
      converted.odometer = toMetricDistance(converted.odometer, carMileageIn);
    }

    // Convert refuel volume from the unit it was entered in (volumeEnteredIn) to metric (liters)
    // volumeEnteredIn tells us what unit the user used when entering the value
    if (converted.refuelVolume !== undefined && converted.refuelVolume !== null) {
      const userProfile = await this.getCurrentUserProfile();
      const volumeUnit = converted.volumeEnteredIn || userProfile.volumeIn;
      converted.refuelVolume = toMetricVolume(converted.refuelVolume, volumeUnit);
    }

    return converted;
  }

  // ===========================================================================
  // Batch Merge and Fetch Methods
  // ===========================================================================

  /**
   * Batch fetch and merge extension data for multiple expense bases
   */
  private async batchMergeExpenseData(expenseBases: any[]): Promise<any[]> {
    if (!expenseBases || expenseBases.length === 0) {
      return [];
    }

    // Separate IDs by expense type
    const refuelIds: string[] = [];
    const expenseIds: string[] = [];
    const revenueIds: string[] = [];

    for (const base of expenseBases) {
      if (base.expenseType === EXPENSE_TYPES.REFUEL) {
        refuelIds.push(base.id);
      } else if (base.expenseType === EXPENSE_TYPES.EXPENSE) {
        expenseIds.push(base.id);
      } else if (base.expenseType === EXPENSE_TYPES.REVENUE) {
        revenueIds.push(base.id);
      }
    }

    // Batch fetch extension data (2 queries max)
    const [refuels, expenses, revenues] = await Promise.all([
      refuelIds.length > 0 ? this.getGateways().refuelGw.list({ filter: { id: refuelIds } }) : Promise.resolve([]),
      expenseIds.length > 0 ? this.getGateways().expenseGw.list({ filter: { id: expenseIds } }) : Promise.resolve([]),
      revenueIds.length > 0 ? this.getGateways().revenueGw.list({ filter: { id: revenueIds } }) : Promise.resolve([]),
    ]);

    // Create lookup maps by ID
    const refuelMap = new Map<string, any>();
    for (const refuel of refuels) {
      refuelMap.set(refuel.id, refuel);
    }

    const expenseMap = new Map<string, any>();
    for (const expense of expenses) {
      expenseMap.set(expense.id, expense);
    }

    const revenueMap = new Map<string, any>();
    for (const revenue of revenues) {
      revenueMap.set(revenue.id, revenue);
    }

    // Merge data
    const mergedItems: any[] = [];

    for (const base of expenseBases) {
      const merged = { ...base };

      if (base.expenseType === EXPENSE_TYPES.REFUEL) {
        const refuel = refuelMap.get(base.id);
        if (refuel) {
          merged.refuelVolume = refuel.refuelVolume;
          merged.volumeEnteredIn = refuel.volumeEnteredIn;
          merged.pricePerVolume = refuel.pricePerVolume;
          merged.isFullTank = refuel.isFullTank;
          merged.remainingInTankBefore = refuel.remainingInTankBefore;
          merged.fuelGrade = refuel.fuelGrade;
          merged.tankType = refuel.tankType;
        }
      } else if (base.expenseType === EXPENSE_TYPES.EXPENSE) {
        const expense = expenseMap.get(base.id);

        if (expense) {
          merged.kindId = expense.kindId;
          merged.costWork = expense.costWork;
          merged.costParts = expense.costParts;
          merged.costWorkHc = expense.costWorkHc;
          merged.costPartsHc = expense.costPartsHc;
          merged.shortNote = expense.shortNote;
        }
      } else if (base.expenseType === EXPENSE_TYPES.REVENUE) {
        const revenue = revenueMap.get(base.id);
        if (revenue) {
          merged.kindId = revenue.kindId;
          merged.shortNote = revenue.shortNote;
        }
      }

      mergedItems.push(merged);
    }

    return mergedItems;
  }

  /**
   * Batch calculate trip meters for a list of already-merged expense bases.
   * Single pass through sorted array - O(n log n) sort + O(n) calculation.
   * No database queries needed.
   */
  private batchCalculateTripMeters(expenseBases: any[]): Map<string, number | null> {
    const tripMeterMap = new Map<string, number | null>();

    if (!expenseBases || expenseBases.length === 0) {
      return tripMeterMap;
    }

    // Sort once by whenDone ASC, then odometer ASC
    const sorted = [...expenseBases].sort((a, b) => {
      const dateA = a.whenDone ? new Date(a.whenDone).getTime() : 0;
      const dateB = b.whenDone ? new Date(b.whenDone).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.odometer || 0) - (b.odometer || 0);
    });

    // Track last record for each group: carId + expenseType (+ tankType for refuels)
    const lastRecordByGroup = new Map<string, any>();

    for (const record of sorted) {
      // Build group key
      let groupKey = `${record.carId}:${record.expenseType}`;
      if (record.expenseType === EXPENSE_TYPES.REFUEL) {
        groupKey += `:${record.tankType || 'main'}`;
      }

      const previous = lastRecordByGroup.get(groupKey);

      if (!previous || record.odometer === null || previous.odometer === null) {
        tripMeterMap.set(record.id, null);
      } else {
        const tripMeter = record.odometer - previous.odometer;
        tripMeterMap.set(record.id, tripMeter > 0 ? tripMeter : null);
      }

      // Update last record for this group
      lastRecordByGroup.set(groupKey, record);
    }

    return tripMeterMap;
  }

  // ===========================================================================
  // Field Extraction Methods
  // ===========================================================================

  /**
   * Extract base fields from params
   */
  private extractBaseFields(params: any): any {
    const {
      // Exclude extension table fields
      kindId,
      costWork,
      costParts,
      costWorkHc,
      costPartsHc,
      shortNote,
      refuelVolume,
      volumeEnteredIn,
      pricePerVolume,
      isFullTank,
      remainingInTankBefore,
      fuelGrade,
      tankType,
      ...baseFields
    } = params;

    return baseFields;
  }

  /**
   * Extract expense-specific fields from params
   */
  private extractExpenseFields(params: any): any {
    return {
      kindId: params.kindId,
      costWork: params.costWork,
      costParts: params.costParts,
      costWorkHc: params.costWorkHc,
      costPartsHc: params.costPartsHc,
      shortNote: params.shortNote,
    };
  }

  /**
 * Extract revenue-specific fields from params
 */
  private extractRevenueFields(params: any): any {
    return {
      kindId: params.kindId,
      shortNote: params.shortNote,
    };
  }

  /**
   * Extract refuel-specific fields from params
   */
  private extractRefuelFields(params: any): any {
    return {
      refuelVolume: params.refuelVolume,
      volumeEnteredIn: params.volumeEnteredIn,
      pricePerVolume: params.pricePerVolume,
      isFullTank: params.isFullTank,
      remainingInTankBefore: params.remainingInTankBefore,
      fuelGrade: params.fuelGrade,
      tankType: params.tankType,
    };
  }

  // ===========================================================================
  // Core CRUD Hooks
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    if (!accountId) {
      return {
        ...args,
        filter: {
          ...filter,
          accountId: '00000000-0000-0000-0000-000000000000', // Return empty results for undefined account
        },
      };
    }

    // Filter by accountId for security
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const userProfile = await this.getCurrentUserProfile();

    // Merge extension data
    const mergedItems = await this.batchMergeExpenseData(items);

    // Batch calculate trip meters for efficiency
    const tripMeterMap = this.batchCalculateTripMeters(mergedItems);

    // Batch fetch cars to get mileageIn for each car
    const carIds = mergedItems.map((item) => item.carId);
    const carMap = await this.batchFetchCars(carIds);

    // Apply trip meters and process items with correct unit conversions
    return mergedItems.map((item: any) => {
      // Apply calculated trip meter if we have one and DB doesn't have it
      if (tripMeterMap.has(item.id) && (item.tripMeter === null || item.tripMeter === undefined)) {
        item.tripMeter = tripMeterMap.get(item.id);
      }

      // Get car's mileageIn, default to 'km' if car not found
      const car = carMap.get(item.carId);
      const carMileageIn = car?.mileageIn || 'km';

      return this.processItemWithProfile(item, userProfile, carMileageIn);
    });
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the expense belongs to the current account
    const { accountId } = this.getContext();
    if (!accountId || item.accountId !== accountId) {
      return null;
    }

    const userProfile = await this.getCurrentUserProfile();

    const [merged] = await this.batchMergeExpenseData([item]);

    // Fetch car to get mileageIn
    const car = await this.fetchCar(merged.carId);
    const carMileageIn = car?.mileageIn || 'km';

    // Calculate trip meter if this is a refuel
    if (merged.expenseType === EXPENSE_TYPES.REFUEL && merged.whenDone) {
      // Get tank type for this refuel (from merged data)
      const tankType = merged.tankType || 'main';

      const previousRefuel = await this.findPreviousRecord(
        merged.carId,
        merged.whenDone,
        merged.id,
        accountId,
        tankType
      );

      // tripMeter is only calculated if both current and previous have odometer values
      if (previousRefuel && merged.odometer !== null && previousRefuel.odometer !== null) {
        merged.tripMeter = this.calculateTripMeter(merged.odometer, previousRefuel.odometer);
      } else {
        merged.tripMeter = null;
      }
    }

    return this.processItemWithProfile(merged, userProfile, carMileageIn);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();
    const userProfile = await this.getCurrentUserProfile();

    if (!accountId) {
      return [];
    }

    // Filter items to only include those belonging to the current account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    if (filteredItems.length === 0) {
      return [];
    }

    const mergedItems = await this.batchMergeExpenseData(filteredItems);

    // Batch calculate trip meters for efficiency
    const tripMeterMap = this.batchCalculateTripMeters(mergedItems);

    // Batch fetch cars to get mileageIn for each car
    const carIds = mergedItems.map((item) => item.carId);
    const carMap = await this.batchFetchCars(carIds);

    // Apply trip meters and process items with correct unit conversions
    return mergedItems.map((item: any) => {
      if (tripMeterMap.has(item.id) && (item.tripMeter === null || item.tripMeter === undefined)) {
        item.tripMeter = tripMeterMap.get(item.id);
      }

      // Get car's mileageIn, default to 'km' if car not found
      const car = carMap.get(item.carId);
      const carMileageIn = car?.mileageIn || 'km';

      return this.processItemWithProfile(item, userProfile, carMileageIn);
    });
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const { uploadedFilesIds, tags, ...restParams } = params;

    // Fetch car to get its mileageIn for odometer conversion
    const car = await this.fetchCar(restParams.carId);
    const carMileageIn = car?.mileageIn || 'km';

    // Convert input units to metric (odometer uses car's mileageIn, volume uses user's preference)
    const convertedParams = await this.convertInputToMetric(restParams, carMileageIn);

    const baseFields = this.extractBaseFields(convertedParams);

    // Store data for afterCreate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`create-${requestId}`, {
      expenseType: params.expenseType,
      expenseId: '',
      extensionParams: convertedParams,
      uploadedFilesIds,
      tags,
    });

    const newExpenseBase = {
      ...baseFields,
      accountId,
      userId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newExpenseBase;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { params } = args || {};
    const { accountId } = this.getContext();

    const userProfile = await this.getCurrentUserProfile();

    // Get the already-converted params from beforeCreate
    const requestId = this.getRequestId();
    const createInfo = this.updateData.get(`create-${requestId}`);
    const convertedParams = createInfo?.extensionParams || {};

    // Create extension table record based on expenseType
    for (const expenseBase of items) {
      let extension: any = null;

      if (expenseBase.expenseType === EXPENSE_TYPES.REFUEL) {
        const refuelFields = this.extractRefuelFields(convertedParams);
        await this.getGateways().refuelGw.create({
          id: expenseBase.id,
          ...refuelFields,
        });
        extension = refuelFields;
      } else if (expenseBase.expenseType === EXPENSE_TYPES.EXPENSE) {
        const expenseFields = this.extractExpenseFields(convertedParams);
        await this.getGateways().expenseGw.create({
          id: expenseBase.id,
          ...expenseFields,
        });
        extension = expenseFields;
      } else if (expenseBase.expenseType === EXPENSE_TYPES.REVENUE) {
        const revenueFields = this.extractRevenueFields(convertedParams);
        await this.getGateways().revenueGw.create({
          id: expenseBase.id,
          ...revenueFields,
        });
        extension = revenueFields;
      }

      // Update car stats
      try {
        const homeCurrency = await this.getHomeCurrencyForStats(expenseBase);
        // Look up isMaintenance for expenses
        let isMaintenance: boolean | undefined;
        if (expenseBase.expenseType === EXPENSE_TYPES.EXPENSE && extension?.kindId) {
          isMaintenance = await this.isExpenseKindMaintenance(extension.kindId);
        }

        const statsParams = this.buildStatsParams(expenseBase, extension, homeCurrency, isMaintenance);
        await this.getStatsUpdater().onRecordCreated(statsParams);
      } catch (error) {
        // Log error but don't fail the create operation
        console.error('Failed to update car stats on create:', error);
      }

      // Update service interval next (only for expenses with kindId)
      try {
        const serviceIntervalParams = this.buildServiceIntervalParams(expenseBase, extension);
        if (serviceIntervalParams) {
          await this.getServiceIntervalUpdater().onExpenseCreated(serviceIntervalParams);
        }
      } catch (error) {
        // Log error but don't fail the create operation
        console.error('Failed to update service interval on create:', error);
      }

      // Fetch and store weather data (non-blocking, fire-and-forget)
      await this.enrichWithWeather(
        expenseBase.id,
        expenseBase.latitude,
        expenseBase.longitude,
        expenseBase.whenDone
      );

      this.getGateways().carTotalExpenseGw.clear(expenseBase.carId);
    }

    if (createInfo) {
      if (Array.isArray(createInfo.uploadedFilesIds)) {
        const attachments = createInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
          return {
            entityTypeId: ENTITY_TYPE_IDS.EXPENSE,
            entityId: items[0].id,
            uploadedFileId,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().entityEntityAttachmentGw.create(attachments);
      }

      if (Array.isArray(createInfo.tags)) {
        const expenseTags = await this.getGateways().expenseTagGw.list({
          filter: {
            id: createInfo.tags,
            accountId,
          },
        });

        const expenseExpenseTags = expenseTags.map((expenseTag, idx) => {
          return {
            expenseId: items[0].id,
            expenseTagId: expenseTag.id,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().expenseExpenseTagGw.create(expenseExpenseTags);
      }

      // Clean up stored data
      this.updateData.delete(`create-${requestId}`);
    }

    // Merge and return with conversions
    const mergedItems = await this.batchMergeExpenseData(items);

    // Batch fetch cars to get mileageIn
    const carIds = mergedItems.map((item) => item.carId);
    const carMap = await this.batchFetchCars(carIds);

    return mergedItems.map((item: any) => {
      const car = carMap.get(item.carId);
      const carMileageIn = car?.mileageIn || 'km';
      return this.processItemWithProfile(item, userProfile, carMileageIn);
    });
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense ID is required');
    }

    if (!accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Account ID is required');
    }

    // Check if user owns the expense
    const expenseBase = await this.getGateways().expenseBaseGw.get(id);

    if (!expenseBase || expenseBase.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense not found');
    }

    // Fetch the old extension data for stats delta calculation
    let oldExtension: any = null;
    if (expenseBase.expenseType === EXPENSE_TYPES.REFUEL) {
      oldExtension = await this.getGateways().refuelGw.get(id);
    } else if (expenseBase.expenseType === EXPENSE_TYPES.EXPENSE) {
      oldExtension = await this.getGateways().expenseGw.get(id);
    } else if (expenseBase.expenseType === EXPENSE_TYPES.REVENUE) {
      oldExtension = await this.getGateways().revenueGw.get(id);
    }

    // Don't allow changing accountId, userId, or expenseType
    const { accountId: _, userId: __, expenseType: ___, uploadedFilesIds, tags, ...restParams } = params;

    // Fetch car to get its mileageIn for odometer conversion
    const car = await this.fetchCar(expenseBase.carId);
    const carMileageIn = car?.mileageIn || 'km';

    // Convert input units to metric (odometer uses car's mileageIn, volume uses user's preference)
    const convertedParams = await this.convertInputToMetric(restParams, carMileageIn);


    const baseFields = this.extractBaseFields(convertedParams);

    baseFields.updatedBy = userId;
    baseFields.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    // Store data for afterUpdate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`update-${requestId}-${id}`, {
      expenseType: expenseBase.expenseType,
      expenseId: id,
      extensionParams: convertedParams,
      uploadedFilesIds,
      tags,
      oldExpenseBase: expenseBase, // Store for stats delta
      oldExtension, // Store for stats delta
    });

    return baseFields;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId } = this.getContext();
    const requestId = this.getRequestId();

    const userProfile = await this.getCurrentUserProfile();

    // Update extension table records
    for (const item of items) {
      if (!item.id) continue;

      const updateInfo = this.updateData.get(`update-${requestId}-${item.id}`);

      if (!updateInfo) continue;

      const { expenseType, expenseId, extensionParams, oldExpenseBase, oldExtension } = updateInfo;

      let newExtension: any = null;

      if (expenseType === EXPENSE_TYPES.REFUEL) {
        const refuelFields = this.extractRefuelFields(extensionParams);
        const hasRefuelFields = Object.values(refuelFields).some((v) => v !== undefined);
        if (hasRefuelFields) {
          await this.getGateways().refuelGw.update({ id: expenseId }, refuelFields);
        }
        // Fetch updated extension for stats
        newExtension = await this.getGateways().refuelGw.get(expenseId);
      } else if (expenseType === EXPENSE_TYPES.EXPENSE) {
        const expenseFields = this.extractExpenseFields(extensionParams);
        const hasExpenseFields = Object.values(expenseFields).some((v) => v !== undefined);
        if (hasExpenseFields) {
          await this.getGateways().expenseGw.update({ id: expenseId }, expenseFields);
        }
        // Fetch updated extension for stats
        newExtension = await this.getGateways().expenseGw.get(expenseId);
      } else if (expenseType === EXPENSE_TYPES.REVENUE) {
        const revenueFields = this.extractRevenueFields(extensionParams);
        const hasRevenueFields = Object.values(revenueFields).some((v) => v !== undefined);
        if (hasRevenueFields) {
          await this.getGateways().revenueGw.update({ id: expenseId }, revenueFields);
        }
        // Fetch updated extension for stats
        newExtension = await this.getGateways().revenueGw.get(expenseId);
      }

      // Update car stats with delta
      try {
        if (oldExpenseBase) {
          const oldHomeCurrency = await this.getHomeCurrencyForStats(oldExpenseBase);
          const newHomeCurrency = await this.getHomeCurrencyForStats(item);

          const oldStatsParams = this.buildStatsParams(oldExpenseBase, oldExtension, oldHomeCurrency);
          const newStatsParams = this.buildStatsParams(item, newExtension, newHomeCurrency);

          await this.getStatsUpdater().onRecordUpdated(oldStatsParams, newStatsParams);
        }
      } catch (error) {
        console.error('Failed to update car stats on update:', error);
      }

      // Update car stats with delta
      try {
        if (oldExpenseBase) {
          const oldHomeCurrency = await this.getHomeCurrencyForStats(oldExpenseBase);
          const newHomeCurrency = await this.getHomeCurrencyForStats(item);

          // Look up isMaintenance for old and new (only for expenses)
          let oldIsMaintenance: boolean | undefined;
          let newIsMaintenance: boolean | undefined;

          if (expenseType === EXPENSE_TYPES.EXPENSE) {
            if (oldExtension?.kindId) {
              oldIsMaintenance = await this.isExpenseKindMaintenance(oldExtension.kindId);
            }
            if (newExtension?.kindId) {
              newIsMaintenance = await this.isExpenseKindMaintenance(newExtension.kindId);
            }
          }

          const oldStatsParams = this.buildStatsParams(oldExpenseBase, oldExtension, oldHomeCurrency, oldIsMaintenance);
          const newStatsParams = this.buildStatsParams(item, newExtension, newHomeCurrency, newIsMaintenance);

          await this.getStatsUpdater().onRecordUpdated(oldStatsParams, newStatsParams);
        }
      } catch (error) {
        console.error('Failed to update car stats on update:', error);
      }

      if (Array.isArray(updateInfo.uploadedFilesIds)) {
        await this.getGateways().entityEntityAttachmentGw.remove({
          entityTypeId: ENTITY_TYPE_IDS.EXPENSE,
          entityId: item.id,
        });

        const attachments = updateInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
          return {
            entityTypeId: ENTITY_TYPE_IDS.EXPENSE,
            entityId: item.id,
            uploadedFileId,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().entityEntityAttachmentGw.create(attachments);

        this.getGateways().carTotalExpenseGw.clear(item.carId);
      }

      if (Array.isArray(updateInfo.tags)) {
        await this.getGateways().expenseExpenseTagGw.remove({
          expenseId: item.id,
        });

        const expenseTags = await this.getGateways().expenseTagGw.list({
          filter: {
            id: updateInfo.tags,
            accountId,
          },
        });

        const expenseExpenseTags = expenseTags.map((expenseTag, idx) => {
          return {
            expenseId: item.id,
            expenseTagId: expenseTag.id,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().expenseExpenseTagGw.create(expenseExpenseTags);
      }

      // Fetch weather only if coordinates have changed
      if (this.haveCoordinatesChanged(oldExpenseBase, item)) {
        await this.enrichWithWeather(
          item.id,
          item.latitude,
          item.longitude,
          item.whenDone
        );
      }

      // Clean up stored data
      this.updateData.delete(`update-${requestId}-${item.id}`);
    }

    // Merge and return with conversions
    const mergedItems = await this.batchMergeExpenseData(items);

    // Batch fetch cars to get mileageIn
    const carIds = mergedItems.map((item) => item.carId);
    const carMap = await this.batchFetchCars(carIds);

    return mergedItems.map((item: any) => {
      const car = carMap.get(item.carId);
      const carMileageIn = car?.mileageIn || 'km';
      return this.processItemWithProfile(item, userProfile, carMileageIn);
    });
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense ID is required');
    }

    if (!accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Account ID is required');
    }

    // Check if user owns the expense
    const expenseBase = await this.getGateways().expenseBaseGw.get(id);

    if (!expenseBase || expenseBase.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense not found');
    }

    // Fetch the extension data for stats update before removal
    let extension: any = null;
    if (expenseBase.expenseType === EXPENSE_TYPES.REFUEL) {
      extension = await this.getGateways().refuelGw.get(id);
    } else if (expenseBase.expenseType === EXPENSE_TYPES.EXPENSE) {
      extension = await this.getGateways().expenseGw.get(id);
    } else if (expenseBase.expenseType === EXPENSE_TYPES.REVENUE) {
      extension = await this.getGateways().revenueGw.get(id);
    }

    // Store expense data for afterRemove stats update
    const requestId = this.getRequestId();
    this.updateData.set(`remove-${requestId}-${id}`, {
      expenseType: expenseBase.expenseType,
      expenseId: id,
      extensionParams: {},
      uploadedFilesIds: [],
      tags: [],
      oldExpenseBase: expenseBase,
      oldExtension: extension,
    });

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const userProfile = await this.getCurrentUserProfile();
    const requestId = this.getRequestId();

    // Batch fetch cars to get mileageIn (needed for processing removed items)
    const carIds = items.map((item: any) => item.carId).filter(Boolean);
    const carMap = await this.batchFetchCars(carIds);

    // Update stats for removed items
    for (const item of items) {
      if (!item.id) continue;

      const removeInfo = this.updateData.get(`remove-${requestId}-${item.id}`);

      if (removeInfo && removeInfo.oldExpenseBase) {
        // Update car stats
        try {
          const homeCurrency = await this.getHomeCurrencyForStats(removeInfo.oldExpenseBase);

          // Look up isMaintenance for expenses
          let isMaintenance: boolean | undefined;
          if (removeInfo.oldExpenseBase.expenseType === EXPENSE_TYPES.EXPENSE && removeInfo.oldExtension?.kindId) {
            isMaintenance = await this.isExpenseKindMaintenance(removeInfo.oldExtension.kindId);
          }

          const statsParams = this.buildStatsParams(removeInfo.oldExpenseBase, removeInfo.oldExtension, homeCurrency, isMaintenance);
          await this.getStatsUpdater().onRecordRemoved(statsParams);
        } catch (error) {
          console.error('Failed to update car stats on remove:', error);
        }

        // Update service interval next
        try {
          const serviceIntervalParams = this.buildServiceIntervalParams(
            removeInfo.oldExpenseBase,
            removeInfo.oldExtension,
          );
          if (serviceIntervalParams) {
            await this.getServiceIntervalUpdater().onExpenseRemoved(serviceIntervalParams);
          }
        } catch (error) {
          console.error('Failed to update service interval on remove:', error);
        }
      }

      // Clean up stored data
      this.updateData.delete(`remove-${requestId}-${item.id}`);

      this.getGateways().carTotalExpenseGw.clear(item.carId);
    }

    return items.map((item: any) => {
      const car = carMap.get(item.carId);
      const carMileageIn = car?.mileageIn || 'km';
      return this.processItemWithProfile(item, userProfile, carMileageIn);
    });
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();

    if (!accountId) {
      return [];
    }

    const allowedWhere: any[] = [];
    const requestId = this.getRequestId();

    // Check ownership for each expense and store data for stats
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const expenseBase = await this.getGateways().expenseBaseGw.get(id);

      if (expenseBase && expenseBase.accountId === accountId) {
        // Fetch extension data for stats
        let extension: any = null;
        if (expenseBase.expenseType === EXPENSE_TYPES.REFUEL) {
          extension = await this.getGateways().refuelGw.get(id);
        } else if (expenseBase.expenseType === EXPENSE_TYPES.EXPENSE) {
          extension = await this.getGateways().expenseGw.get(id);
        } else if (expenseBase.expenseType === EXPENSE_TYPES.REVENUE) {
          extension = await this.getGateways().revenueGw.get(id);
        }

        // Store for afterRemoveMany
        this.updateData.set(`removeMany-${requestId}-${id}`, {
          expenseType: expenseBase.expenseType,
          expenseId: id,
          extensionParams: {},
          uploadedFilesIds: [],
          tags: [],
          oldExpenseBase: expenseBase,
          oldExtension: extension,
        });

        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const userProfile = await this.getCurrentUserProfile();
    const requestId = this.getRequestId();

    // Batch fetch cars to get mileageIn (needed for processing removed items)
    const carIds = items.map((item: any) => item.carId).filter(Boolean);
    const carMap = await this.batchFetchCars(carIds);

    // Update stats for removed items
    for (const item of items) {
      if (!item.id) continue;

      const removeInfo = this.updateData.get(`removeMany-${requestId}-${item.id}`);

      if (removeInfo && removeInfo.oldExpenseBase) {
        // Update car stats
        try {
          const homeCurrency = await this.getHomeCurrencyForStats(removeInfo.oldExpenseBase);

          // Look up isMaintenance for expenses
          let isMaintenance: boolean | undefined;
          if (removeInfo.oldExpenseBase.expenseType === EXPENSE_TYPES.EXPENSE && removeInfo.oldExtension?.kindId) {
            isMaintenance = await this.isExpenseKindMaintenance(removeInfo.oldExtension.kindId);
          }

          const statsParams = this.buildStatsParams(removeInfo.oldExpenseBase, removeInfo.oldExtension, homeCurrency, isMaintenance);
          await this.getStatsUpdater().onRecordRemoved(statsParams);
        } catch (error) {
          console.error('Failed to update car stats on removeMany:', error);
        }

        // Update service interval next
        try {
          const serviceIntervalParams = this.buildServiceIntervalParams(
            removeInfo.oldExpenseBase,
            removeInfo.oldExtension,
          );
          if (serviceIntervalParams) {
            await this.getServiceIntervalUpdater().onExpenseRemoved(serviceIntervalParams);
          }
        } catch (error) {
          console.error('Failed to update service interval on removeMany:', error);
        }
      }

      // Clean up stored data
      this.updateData.delete(`removeMany-${requestId}-${item.id}`);
    }

    return items.map((item: any) => {
      const car = carMap.get(item.carId);
      const carMileageIn = car?.mileageIn || 'km';
      return this.processItemWithProfile(item, userProfile, carMileageIn);
    });
  }

  public async recalculateAll(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const db = this.getDb();
        const carUpdater = new CarStatsUpdater(db, config.dbSchema);

        await carUpdater.recalculateAllStats();

        return this.success({});
      },
      hasTransaction: true,
      doingWhat: 'recalculating all vehicles stats',
    });
  }
}

export { ExpenseCore };