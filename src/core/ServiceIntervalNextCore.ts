// ./src/core/ServiceIntervalNextCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/serviceIntervalNextValidators';
import { INTERVAL_TYPES } from '../database';
import { toMetricDistance, fromMetricDistanceRounded, ServiceIntervalNextUpdater } from '../utils/';
import config from '../config';

dayjs.extend(utc);

// =============================================================================
// Types
// =============================================================================

interface ServiceIntervalNextRecord {
  id: string;
  carId: string;
  kindId: number;
  intervalType: number;
  mileageInterval: number; // Stored in km
  daysInterval: number;
  maxWhenDone: string | null;
  maxOdometer: number | null; // Stored in km
  nextWhenDo: string | null;
  nextOdometer: number | null; // Stored in km
  status: number;
}

interface ServiceIntervalNextOutput {
  id: string;
  carId: string;
  kindId: number;
  intervalType: number;
  mileageInterval: number; // In user's unit
  daysInterval: number;
  maxWhenDone: string | null;
  maxOdometer: number | null; // In user's unit
  nextWhenDo: string | null;
  nextOdometer: number | null; // In user's unit
  remainingDays: number | null;
  remainingMileage: number | null; // In user's unit
  urgencyStatus: string;
  status: number;
}

type UrgencyStatus = 'overdue' | 'due_soon' | 'upcoming' | 'ok';

interface EnrichmentContext {
  userDistanceUnit: string;
  notifyInDays: number;
  notifyInMileageKm: number;
  carMileageMap: Map<string, number>;
}

interface ListHookData {
  urgencyStatusFilter: string | string[] | null;
}

interface UpdateHookData {
  carId: string;
}

// =============================================================================
// Core Class
// =============================================================================

class ServiceIntervalNextCore extends AppCore {
  private listData: Map<string, ListHookData> = new Map();
  private updateData: Map<string, UpdateHookData> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'serviceIntervalNextGw',
      name: 'ServiceIntervalNext',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing upcoming service intervals',
        get: 'getting an upcoming service interval',
        getMany: 'getting multiple upcoming service intervals',
        create: '',
        createMany: '',
        update: 'updating an upcoming service interval',
        updateMany: '',
        set: '',
        remove: '',
        removeMany: '',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  /**
   * Process item on output - converts from metric to user's preferred units
   */
  public async processItemOnOut(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) return item;

    // Format dates
    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.maxWhenDone !== null && item.maxWhenDone !== undefined) {
      item.maxWhenDone = dayjs(item.maxWhenDone).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.nextWhenDo !== null && item.nextWhenDo !== undefined) {
      item.nextWhenDo = dayjs(item.nextWhenDo).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  // ===========================================================================
  // Computed Fields Helpers
  // ===========================================================================

  /**
   * Calculate remaining days until next service date
   * @returns Positive if in future, negative if overdue, null if no date set
   */
  private computeRemainingDays(nextWhenDo: string | null): number | null {
    if (!nextWhenDo) {
      return null;
    }

    const now = dayjs.utc();
    const nextDate = dayjs.utc(nextWhenDo);

    if (!nextDate.isValid()) {
      return null;
    }

    return nextDate.diff(now, 'day');
  }

  /**
   * Calculate remaining mileage until next service
   * @param nextOdometerKm Next service odometer in kilometers
   * @param currentMileageKm Current car mileage in kilometers
   * @returns Remaining mileage in kilometers (positive if not due, negative if overdue)
   */
  private computeRemainingMileageKm(nextOdometerKm: number | null, currentMileageKm: number): number | null {
    if (nextOdometerKm === null || nextOdometerKm === undefined) {
      return null;
    }

    return nextOdometerKm - currentMileageKm;
  }

  /**
   * Determine urgency status based on remaining days/mileage and user thresholds
   */
  private computeUrgencyStatus(
    remainingDays: number | null,
    remainingMileageKm: number | null,
    intervalType: number,
    notifyInDays: number,
    notifyInMileageKm: number,
  ): UrgencyStatus {
    // No interval configured
    if (intervalType === INTERVAL_TYPES.NONE) {
      return 'ok';
    }

    // Check for overdue
    if (remainingDays !== null && remainingDays < 0) {
      return 'overdue';
    }
    if (remainingMileageKm !== null && remainingMileageKm < 0) {
      return 'overdue';
    }

    // Check for due_soon based on interval type
    switch (intervalType) {
      case INTERVAL_TYPES.MILEAGE_ONLY:
        if (remainingMileageKm !== null && remainingMileageKm <= notifyInMileageKm) {
          return 'due_soon';
        }
        break;

      case INTERVAL_TYPES.DAYS_ONLY:
        if (remainingDays !== null && remainingDays <= notifyInDays) {
          return 'due_soon';
        }
        break;

      case INTERVAL_TYPES.MILEAGE_OR_DAYS:
        // Due soon if EITHER threshold is met
        if (
          (remainingMileageKm !== null && remainingMileageKm <= notifyInMileageKm) ||
          (remainingDays !== null && remainingDays <= notifyInDays)
        ) {
          return 'due_soon';
        }
        break;

      case INTERVAL_TYPES.MILEAGE_AND_DAYS:
        // Due soon if BOTH thresholds are met (more conservative)
        const mileageDueSoon = remainingMileageKm !== null && remainingMileageKm <= notifyInMileageKm;
        const daysDueSoon = remainingDays !== null && remainingDays <= notifyInDays;
        if (mileageDueSoon && daysDueSoon) {
          return 'due_soon';
        }
        // Also due soon if one is null and the other meets threshold
        if (remainingMileageKm === null && daysDueSoon) {
          return 'due_soon';
        }
        if (remainingDays === null && mileageDueSoon) {
          return 'due_soon';
        }
        break;
    }

    // Has scheduled service but not due soon
    if (remainingDays !== null || remainingMileageKm !== null) {
      return 'upcoming';
    }

    return 'ok';
  }

  /**
   * Enrich a service interval record with computed fields and unit conversions
   */
  private enrichRecord(record: ServiceIntervalNextRecord, enrichCtx: EnrichmentContext): ServiceIntervalNextOutput {
    const { userDistanceUnit, notifyInDays, notifyInMileageKm, carMileageMap } = enrichCtx;
    const currentMileageKm = carMileageMap.get(record.carId) ?? 0;

    // Compute remaining values in km
    const remainingDays = this.computeRemainingDays(record.nextWhenDo);
    const remainingMileageKm = this.computeRemainingMileageKm(record.nextOdometer, currentMileageKm);

    // Compute urgency status (using km values)
    const urgencyStatus = this.computeUrgencyStatus(
      remainingDays,
      remainingMileageKm,
      record.intervalType,
      notifyInDays,
      notifyInMileageKm,
    );

    // Convert mileage values to user's preferred unit
    return {
      id: record.id,
      carId: record.carId,
      kindId: record.kindId,
      intervalType: record.intervalType,
      mileageInterval: fromMetricDistanceRounded(record.mileageInterval, userDistanceUnit) ?? 0,
      daysInterval: record.daysInterval,
      maxWhenDone: record.maxWhenDone,
      maxOdometer: fromMetricDistanceRounded(record.maxOdometer, userDistanceUnit),
      nextWhenDo: record.nextWhenDo,
      nextOdometer: fromMetricDistanceRounded(record.nextOdometer, userDistanceUnit),
      remainingDays,
      remainingMileage: fromMetricDistanceRounded(remainingMileageKm, userDistanceUnit),
      urgencyStatus,
      status: record.status,
    };
  }

  /**
   * Get enrichment context with user preferences and car mileages
   */
  private async getEnrichmentContext(carIds: string[]): Promise<EnrichmentContext> {
    const { accountId } = this.getContext();

    // Get user profile for preferences
    const userProfile = await this.getCurrentUserProfile();
    const userDistanceUnit = userProfile.distanceIn;
    const notifyInDays = userProfile.notifyInDays ?? 14;
    const notifyInMileageKm = toMetricDistance(userProfile.notifyInMileage ?? 500, userDistanceUnit) ?? 500;

    // Get current mileage for all cars
    let carMileageMap = new Map<string, number>();
    if (carIds.length > 0) {
      carMileageMap = await this.getGateways().carTotalSummaryGw.getMaxMileageByCarIds(carIds, accountId);
    }

    return {
      userDistanceUnit,
      notifyInDays,
      notifyInMileageKm,
      carMileageMap,
    };
  }

  // ===========================================================================
  // Before/After Hooks
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { carId, kindId, intervalType } = filter || {};
    const { accountId } = this.getContext();

    // If no carId provided, fetch all cars for this account
    let carIds: string[] = [];

    if (carId) {
      carIds = Array.isArray(carId) ? carId : [carId];
    } else {
      const cars = await this.getGateways().carGw.list({
        filter: { accountId },
      });
      carIds = (cars || []).map((car: any) => car.id);
    }

    // Use AppCore's filterAccessibleCarIds for DRIVER/VIEWER role restriction
    let carIdFilter = await this.filterAccessibleCarIds(carIds);

    carIdFilter = await this.getGateways().carGw.getActiveCarsIds({
      accountId,
      id: carIdFilter
    });

    // Store urgencyStatus filter for afterList (it's computed, not in DB)
    const requestId = this.getRequestId();
    this.listData.set(`list-${requestId}`, {
      urgencyStatusFilter: filter?.urgencyStatus || null,
    });

    return {
      ...args,
      filter: {
        carId: carIdFilter,
        kindId,
        intervalType,
        accountId,
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const requestId = this.getRequestId();
    const listInfo = this.listData.get(`list-${requestId}`);

    // Clean up stored data
    this.listData.delete(`list-${requestId}`);

    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    // Get unique car IDs
    const uniqueCarIds = [...new Set(items.map((r: ServiceIntervalNextRecord) => r.carId))];

    // Get enrichment context
    const enrichCtx = await this.getEnrichmentContext(uniqueCarIds);

    // Enrich records with computed fields
    let enrichedRecords: ServiceIntervalNextOutput[] = await items.map((record: ServiceIntervalNextRecord) =>
      this.enrichRecord(record, enrichCtx),
    );

    // Filter by urgency status if requested (computed field, must filter after enrichment)
    const urgencyStatusFilter = listInfo?.urgencyStatusFilter;
    if (urgencyStatusFilter) {
      const statusFilter = Array.isArray(urgencyStatusFilter) ? urgencyStatusFilter : [urgencyStatusFilter];
      enrichedRecords = enrichedRecords.filter((r) => statusFilter.includes(r.urgencyStatus));
    }

    // Sort by carId, then by nextWhenDo ASC
    enrichedRecords.sort((a, b) => {
      // First sort by carId
      const carCompare = a.carId.localeCompare(b.carId);
      if (carCompare !== 0) {
        return carCompare;
      }

      // Then sort by nextWhenDo ASC (nulls last)
      if (a.nextWhenDo === null && b.nextWhenDo === null) {
        return 0;
      }
      if (a.nextWhenDo === null) {
        return 1;
      }
      if (b.nextWhenDo === null) {
        return -1;
      }
      return a.nextWhenDo.localeCompare(b.nextWhenDo);
    });

    return enrichedRecords;
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the record belongs to the current account
    const { accountId } = this.getContext();
    const car = await this.getGateways().carGw.get(item.carId);

    if (!car || car.accountId !== accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    // Get enrichment context
    const enrichCtx = await this.getEnrichmentContext([item.carId]);

    // Enrich record with computed fields
    return this.enrichRecord(item, enrichCtx);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();

    // Get all car IDs
    const carIds = [...new Set(items.map((r: ServiceIntervalNextRecord) => r.carId))];

    // Fetch cars to verify ownership
    const cars = await this.getGateways().carGw.list({
      filter: { id: carIds, accountId },
    });
    const ownedCarIds: any = new Set((cars || []).map((car: any) => car.id));

    // Filter items to only include those belonging to the current account's cars
    const filteredItems = items.filter((item: ServiceIntervalNextRecord) => item && ownedCarIds.has(item.carId));

    if (filteredItems.length === 0) {
      return [];
    }

    // Get enrichment context
    const enrichCtx = await this.getEnrichmentContext([...ownedCarIds]);

    // Enrich records with computed fields
    return filteredItems.map((record: ServiceIntervalNextRecord) => this.enrichRecord(record, enrichCtx));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Service interval ID is required');
    }

    // Verify record exists and belongs to user's car
    const existingRecords = await this.getGateways().serviceIntervalNextGw.list({
      filter: { id },
    });

    if (!existingRecords || existingRecords.length === 0) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Service interval not found');
    }

    const record = existingRecords[0];

    // Verify car ownership
    const car = await this.getGateways().carGw.get(record.carId);

    if (!car || car.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Service interval not found');
    }

    // Get user profile for unit conversion
    const userProfile = await this.getCurrentUserProfile();
    const userDistanceUnit = userProfile.distanceIn;

    // Prepare update data
    const updateParams: Record<string, any> = {};
    const { nextWhenDo, nextOdometer } = params || {};

    if (nextWhenDo !== undefined) {
      updateParams.nextWhenDo = nextWhenDo;
    }

    if (nextOdometer !== undefined) {
      // Convert from user's unit to kilometers for storage
      updateParams.nextOdometer = toMetricDistance(nextOdometer, userDistanceUnit);
    }

    if (Object.keys(updateParams).length === 0) {
      return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'No update parameters provided');
    }

    // Store carId for afterUpdate enrichment
    const requestId = this.getRequestId();
    this.updateData.set(`update-${requestId}-${id}`, {
      carId: record.carId,
    });

    return updateParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const requestId = this.getRequestId();
    const carIds: string[] = [];

    // Collect car IDs and clean up stored data
    for (const item of items) {
      if (!item.id) continue;

      const updateInfo = this.updateData.get(`update-${requestId}-${item.id}`);
      if (updateInfo) {
        carIds.push(updateInfo.carId);
        // Clean up stored data
        this.updateData.delete(`update-${requestId}-${item.id}`);
      } else {
        // Fallback: use carId from item
        carIds.push(item.carId);
      }
    }

    // Get enrichment context
    const enrichCtx = await this.getEnrichmentContext(carIds);

    // Enrich records with computed fields
    const enrichedItems = items.map((record: ServiceIntervalNextRecord) => this.enrichRecord(record, enrichCtx));

    return enrichedItems.map((enrichedItem) => this.processItemOnOut(enrichedItem));
  }

  // ===========================================================================
  // Custom Methods
  // ===========================================================================

  public async recalculateAll(args: any) {
    return this.runAction({
      args,
      doAuth: false,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const db = this.getDb();
        const serviceIntervalUpdater = new ServiceIntervalNextUpdater(db, config.dbSchema);

        await serviceIntervalUpdater.recalculateAll();

        return this.success({});
      },
      hasTransaction: true,
      doingWhat: 'recalculating next service intervals for all the vehicles',
    });
  }
}

export { ServiceIntervalNextCore };
