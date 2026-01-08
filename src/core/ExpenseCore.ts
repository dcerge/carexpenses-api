// ./src/core/ExpenseCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/expenseValidators';
import { ENTITY_TYPE_IDS } from 'boundary';

dayjs.extend(utc);

// Expense types
const EXPENSE_TYPE = {
  REFUEL: 1,
  EXPENSE: 2,
  CHECKPOINT: 3,
  TRAVEL: 4,
};

// Unit conversion constants
const MILES_TO_KM = 1.60934;
const GALLONS_TO_LITERS = 3.78541;

interface UserProfile {
  id: string;
  accountId: string;
  homeCurrency: string;
  distanceIn: string;
  volumeIn: string;
  consumptionIn: string;
  notifyInMileage: number;
  notifyInDays: number;
}

interface ExpenseUpdateData {
  expenseType: number;
  expenseId: string;
  extensionParams: any;
  uploadedFilesIds: string[];
  tags: string[];
}

class ExpenseCore extends AppCore {
  private updateData: Map<string, ExpenseUpdateData> = new Map();
  private userProfileCache: Map<string, UserProfile> = new Map();

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
  // User Profile and Unit Conversion Utilities
  // ===========================================================================

  /**
   * Get default user profile when no profile exists
   */
  private getDefaultUserProfile(): UserProfile {
    return {
      id: '',
      accountId: '',
      homeCurrency: 'USD',
      distanceIn: 'km',
      volumeIn: 'l',
      consumptionIn: 'l/100km',
      notifyInMileage: 500,
      notifyInDays: 14,
    };
  }

  /**
   * Get user profile with caching for the current request
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    if (this.userProfileCache.has(userId)) {
      return this.userProfileCache.get(userId) || this.getDefaultUserProfile();
    }

    const profile = await this.getGateways().userProfileGw.get(userId);

    if (profile) {
      this.userProfileCache.set(userId, profile);
      return profile;
    }

    return this.getDefaultUserProfile();
  }

  /**
   * Get user profile for current context user, returns default if userId is not available
   */
  private async getCurrentUserProfile(): Promise<UserProfile> {
    const { userId } = this.getContext();

    if (!userId) {
      return this.getDefaultUserProfile();
    }

    return this.getUserProfile(userId);
  }

  /**
   * Convert distance to metric (km)
   */
  private toMetricDistance(value: number | null | undefined, unit: string): number | null {
    if (value === null || value === undefined) return null;
    if (unit === 'mi') {
      return value * MILES_TO_KM;
    }
    return value; // already in km
  }

  /**
   * Convert distance from metric (km) to user's preferred unit
   */
  private fromMetricDistance(value: number | null | undefined, unit: string): number | null {
    if (value === null || value === undefined) return null;
    if (unit === 'mi') {
      return value / MILES_TO_KM;
    }
    return value; // already in km
  }

  /**
   * Convert volume to metric (liters)
   */
  private toMetricVolume(value: number | null | undefined, unit: string): number | null {
    if (value === null || value === undefined) return null;
    if (unit === 'gal') {
      return value * GALLONS_TO_LITERS;
    }
    return value; // already in liters
  }

  /**
   * Convert volume from metric (liters) to user's preferred unit
   */
  private fromMetricVolume(value: number | null | undefined, unit: string): number | null {
    if (value === null || value === undefined) return null;
    if (unit === 'gal') {
      return value / GALLONS_TO_LITERS;
    }
    return value; // already in liters
  }

  /**
   * Calculate fuel consumption in user's preferred unit
   * @param distanceKm Distance in kilometers (metric)
   * @param volumeLiters Volume in liters (metric)
   * @param consumptionUnit User's preferred consumption unit
   */
  private calculateConsumption(
    distanceKm: number | null | undefined,
    volumeLiters: number | null | undefined,
    consumptionUnit: string,
  ): number | null {
    if (!distanceKm || distanceKm <= 0 || !volumeLiters || volumeLiters <= 0) {
      return null;
    }

    switch (consumptionUnit) {
      case 'l/100km':
        return (volumeLiters / distanceKm) * 100;
      case 'mpg': {
        // Convert to miles and gallons for MPG calculation
        const miles = distanceKm / MILES_TO_KM;
        const gallons = volumeLiters / GALLONS_TO_LITERS;
        return miles / gallons;
      }
      case 'km/l':
        return distanceKm / volumeLiters;
      default:
        return (volumeLiters / distanceKm) * 100; // default l/100km
    }
  }

  /**
   * Find the immediately previous refuel for a car (by whenDone) to calculate trip meter.
   * Returns the previous refuel regardless of whether it has an odometer value.
   */
  private async findPreviousRefuel(
    carId: string,
    currentWhenDone: string,
    currentId: string,
    accountId: string,
  ): Promise<any | null> {
    // Fetch recent refuels up to and including currentWhenDone
    // Sorted by whenDone DESC, so most recent comes first
    // We get a few extra in case there are records with the same timestamp
    const recentRefuels = await this.getGateways().expenseBaseGw.list({
      filter: {
        carId,
        accountId,
        expenseType: EXPENSE_TYPE.REFUEL,
        whenDoneTo: currentWhenDone,
      },
      params: {
        pagination: { pageSize: 10 },
        sortBy: [
          { name: 'whenDone', order: 'DESC' },
          { name: 'odometer', order: 'DESC' },
        ],
      },
    });

    // Find the first refuel that is not the current one
    // Since sorted by whenDone DESC, the first non-current record is the previous one
    for (const refuel of recentRefuels) {
      if (refuel.id !== currentId) {
        return refuel;
      }
    }

    return null;
  }

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
   * Process item with user profile for unit conversions
   */
  private processItemWithProfile(item: any, userProfile: UserProfile): any {
    if (!item) return item;

    // First apply standard processing
    const processed = this.processItemOnOut(item);

    // Convert distance fields from metric to user's preferred unit
    processed.odometer = this.fromMetricDistance(processed.odometer, userProfile.distanceIn);
    processed.tripMeter = this.fromMetricDistance(processed.tripMeter, userProfile.distanceIn);

    // For refuels, convert volume and calculate consumption
    if (processed.expenseType === EXPENSE_TYPE.REFUEL) {
      // Convert refuel volume from liters to user's preferred unit
      processed.refuelVolume = this.fromMetricVolume(processed.refuelVolume, userProfile.volumeIn);

      // Calculate consumption only for full tank refuels
      if (processed.isFullTank && processed.tripMeter !== null) {
        // Use the metric values (before conversion) for consumption calculation
        const tripMeterMetric = item.tripMeter; // Original metric value
        const refuelVolumeMetric = item.refuelVolume; // Original metric value (liters)

        processed.consumption = this.calculateConsumption(
          tripMeterMetric,
          refuelVolumeMetric,
          userProfile.consumptionIn,
        );
      } else {
        processed.consumption = null;
      }
    }

    return processed;
  }

  /**
   * Convert input params from user's preferred units to metric
   */
  private async convertInputToMetric(params: any): Promise<any> {
    const userProfile = await this.getCurrentUserProfile();

    const converted = { ...params };

    // Convert odometer from user's unit to metric (km)
    if (converted.odometer !== undefined && converted.odometer !== null) {
      converted.odometer = this.toMetricDistance(converted.odometer, userProfile.distanceIn);
    }

    // Convert refuel volume from user's unit to metric (liters)
    if (converted.refuelVolume !== undefined && converted.refuelVolume !== null) {
      converted.refuelVolume = this.toMetricVolume(converted.refuelVolume, userProfile.volumeIn);
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

    for (const base of expenseBases) {
      if (base.expenseType === EXPENSE_TYPE.REFUEL) {
        refuelIds.push(base.id);
      } else if (base.expenseType === EXPENSE_TYPE.EXPENSE) {
        expenseIds.push(base.id);
      }
    }

    // Batch fetch extension data (2 queries max)
    const [refuels, expenses] = await Promise.all([
      refuelIds.length > 0 ? this.getGateways().refuelGw.list({ filter: { id: refuelIds } }) : Promise.resolve([]),
      expenseIds.length > 0 ? this.getGateways().expenseGw.list({ filter: { id: expenseIds } }) : Promise.resolve([]),
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

    // Merge data
    const mergedItems: any[] = [];

    for (const base of expenseBases) {
      const merged = { ...base };

      if (base.expenseType === EXPENSE_TYPE.REFUEL) {
        const refuel = refuelMap.get(base.id);
        if (refuel) {
          merged.refuelVolume = refuel.refuelVolume;
          merged.volumeEnteredIn = refuel.volumeEnteredIn;
          merged.pricePerVolume = refuel.pricePerVolume;
          merged.isFullTank = refuel.isFullTank;
          merged.remainingInTankBefore = refuel.remainingInTankBefore;
          merged.fuelGrade = refuel.fuelGrade;
        }
      } else if (base.expenseType === EXPENSE_TYPE.EXPENSE) {
        const expense = expenseMap.get(base.id);

        if (expense) {
          merged.kindId = expense.kindId;
          merged.costWork = expense.costWork;
          merged.costParts = expense.costParts;
          merged.costWorkHc = expense.costWorkHc;
          merged.costPartsHc = expense.costPartsHc;
          merged.shortNote = expense.shortNote;
        }
      }

      mergedItems.push(merged);
    }

    return mergedItems;
  }

  /**
   * Batch calculate trip meters for a list of expense bases
   * Groups by carId, sorts by whenDone, and calculates differences between consecutive refuels.
   * If the previous refuel has no odometer, tripMeter is null (not calculated from earlier records).
   */
  private async batchCalculateTripMeters(expenseBases: any[]): Promise<Map<string, number | null>> {
    const tripMeterMap = new Map<string, number | null>();

    if (!expenseBases || expenseBases.length === 0) {
      return tripMeterMap;
    }

    // Get unique car IDs for refuels
    const carIds = new Set<string>();
    const refuelIds = new Set<string>();

    for (const base of expenseBases) {
      if (base.expenseType === EXPENSE_TYPE.REFUEL) {
        carIds.add(base.carId);
        refuelIds.add(base.id);
      }
    }

    if (refuelIds.size === 0) {
      return tripMeterMap;
    }

    // Fetch all refuels for these cars to calculate trip meters efficiently
    const { accountId } = this.getContext();

    if (!accountId) {
      return tripMeterMap;
    }

    const allRefuels = await this.getGateways().expenseBaseGw.list({
      filter: {
        carId: Array.from(carIds),
        accountId,
        expenseType: EXPENSE_TYPE.REFUEL,
      },
      params: {
        sortBy: [
          { name: 'whenDone', order: 'ASC' },
          { name: 'odometer', order: 'ASC' },
        ],
      },
    });

    // Group refuels by carId (already sorted by whenDone ASC from query)
    const refuelsByCarId = new Map<string, any[]>();

    for (const refuel of allRefuels) {
      if (!refuelsByCarId.has(refuel.carId)) {
        refuelsByCarId.set(refuel.carId, []);
      }
      refuelsByCarId.get(refuel.carId)!.push(refuel);
    }

    // Calculate trip meters for each car's refuels
    for (const [, carRefuels] of refuelsByCarId) {
      for (let i = 0; i < carRefuels.length; i++) {
        const current = carRefuels[i];

        // Only calculate for refuels we're returning
        if (!refuelIds.has(current.id)) {
          continue;
        }

        // First refuel has no previous, so tripMeter is null
        if (i === 0) {
          tripMeterMap.set(current.id, null);
          continue;
        }

        const previous = carRefuels[i - 1];

        // If current or previous odometer is null, tripMeter is null
        if (current.odometer === null || previous.odometer === null) {
          tripMeterMap.set(current.id, null);
        } else {
          const tripMeter = current.odometer - previous.odometer;
          tripMeterMap.set(current.id, tripMeter > 0 ? tripMeter : null);
        }
      }
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
    const tripMeterMap = await this.batchCalculateTripMeters(mergedItems);

    // Apply trip meters and process items
    return mergedItems.map((item: any) => {
      // Apply calculated trip meter if we have one and DB doesn't have it
      if (tripMeterMap.has(item.id) && (item.tripMeter === null || item.tripMeter === undefined)) {
        item.tripMeter = tripMeterMap.get(item.id);
      }
      return this.processItemWithProfile(item, userProfile);
    });
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the expense belongs to the current account
    const { accountId } = this.getContext();
    if (!accountId || item.accountId !== accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    const userProfile = await this.getCurrentUserProfile();

    const [merged] = await this.batchMergeExpenseData([item]);

    // Calculate trip meter if this is a refuel
    if (merged.expenseType === EXPENSE_TYPE.REFUEL && merged.whenDone) {
      const previousRefuel = await this.findPreviousRefuel(merged.carId, merged.whenDone, merged.id, accountId);

      // tripMeter is only calculated if both current and previous have odometer values
      if (previousRefuel && merged.odometer !== null && previousRefuel.odometer !== null) {
        merged.tripMeter = this.calculateTripMeter(merged.odometer, previousRefuel.odometer);
      } else {
        merged.tripMeter = null;
      }
    }

    return this.processItemWithProfile(merged, userProfile);
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
    const tripMeterMap = await this.batchCalculateTripMeters(mergedItems);

    // Apply trip meters and process items
    return mergedItems.map((item: any) => {
      if (tripMeterMap.has(item.id) && (item.tripMeter === null || item.tripMeter === undefined)) {
        item.tripMeter = tripMeterMap.get(item.id);
      }
      return this.processItemWithProfile(item, userProfile);
    });
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const { uploadedFilesIds, tags, ...restParams } = params;

    // Convert input units to metric
    const convertedParams = await this.convertInputToMetric(restParams);

    const baseFields = this.extractBaseFields(convertedParams);

    // Store data for afterUpdate using requestId
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

    // Convert input params to metric for extension table storage
    const convertedParams = await this.convertInputToMetric(params);

    // Create extension table record based on expenseType
    for (const expenseBase of items) {
      if (expenseBase.expenseType === EXPENSE_TYPE.REFUEL) {
        const refuelFields = this.extractRefuelFields(convertedParams);
        await this.getGateways().refuelGw.create({
          id: expenseBase.id,
          ...refuelFields,
        });
      } else if (expenseBase.expenseType === EXPENSE_TYPE.EXPENSE) {
        const expenseFields = this.extractExpenseFields(convertedParams);
        await this.getGateways().expenseGw.create({
          id: expenseBase.id,
          ...expenseFields,
        });
      }
    }

    const requestId = this.getRequestId();
    const createInfo = this.updateData.get(`create-${requestId}`);

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
    }

    // Merge and return with conversions
    const mergedItems = await this.batchMergeExpenseData(items);

    return mergedItems.map((item: any) => this.processItemWithProfile(item, userProfile));
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

    // Don't allow changing accountId, userId, or expenseType
    const { accountId: _, userId: __, expenseType: ___, uploadedFilesIds, tags, ...restParams } = params;

    // Convert input units to metric
    const convertedParams = await this.convertInputToMetric(restParams);

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

      const { expenseType, expenseId, extensionParams } = updateInfo;

      if (expenseType === EXPENSE_TYPE.REFUEL) {
        const refuelFields = this.extractRefuelFields(extensionParams);
        const hasRefuelFields = Object.values(refuelFields).some((v) => v !== undefined);
        if (hasRefuelFields) {
          await this.getGateways().refuelGw.update({ id: expenseId }, refuelFields);
        }
      } else if (expenseType === EXPENSE_TYPE.EXPENSE) {
        const expenseFields = this.extractExpenseFields(extensionParams);
        const hasExpenseFields = Object.values(expenseFields).some((v) => v !== undefined);
        if (hasExpenseFields) {
          await this.getGateways().expenseGw.update({ id: expenseId }, expenseFields);
        }
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

      // Clean up stored data
      this.updateData.delete(`update-${requestId}-${item.id}`);
    }

    // Merge and return with conversions
    const mergedItems = await this.batchMergeExpenseData(items);

    return mergedItems.map((item: any) => this.processItemWithProfile(item, userProfile));
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

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const userProfile = await this.getCurrentUserProfile();

    return items.map((item: any) => this.processItemWithProfile(item, userProfile));
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

    // Check ownership for each expense
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const expenseBase = await this.getGateways().expenseBaseGw.get(id);

      if (expenseBase && expenseBase.accountId === accountId) {
        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const userProfile = await this.getCurrentUserProfile();

    return items.map((item: any) => this.processItemWithProfile(item, userProfile));
  }
}

export { ExpenseCore };
