import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/travelValidators';
import { EXPENSE_TYPES, STATUS } from '../database';
import { CarStatsUpdater, TravelStatsParams } from '../utils/CarStatsUpdater';

dayjs.extend(utc);

// Conversion factor: 1 mile = 1.60934 kilometers
const MI_TO_KM = 1.60934;

interface TravelOperationData {
  firstRecord?: any;
  lastRecord?: any;
  tagIds?: string[];
  existingTravel?: any;
}

class TravelCore extends AppCore {
  // Map to store data between before* and after* hooks
  private operationData: Map<string, TravelOperationData> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'travelGw',
      name: 'Travel',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing travels',
        get: 'getting a travel',
        getMany: 'getting multiple travels',
        create: 'creating a travel',
        createMany: '',
        update: 'updating a travel',
        updateMany: '',
        set: '',
        remove: 'removing a travel',
        removeMany: 'removing multiple travels',
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
  // Utility Methods
  // ===========================================================================

  /**
   * Convert distance to kilometers
   */
  private convertToKm(distance: number, unit: string): number {
    if (unit === 'mi') {
      return distance * MI_TO_KM;
    }
    return distance; // Already in km
  }

  /**
   * Calculate distance from odometer readings
   */
  private calculateDistanceFromOdometers(firstOdometer: number | null, lastOdometer: number | null): number | null {
    if (firstOdometer == null || lastOdometer == null) {
      return null;
    }

    const distance = lastOdometer - firstOdometer;
    return distance >= 0 ? distance : null; // Negative distance is invalid
  }

  /**
   * Calculate reimbursement amount
   */
  private calculateReimbursement(
    distance: number | null,
    reimbursementRate: number | null,
  ): number | null {
    if (distance == null || reimbursementRate == null) {
      return null;
    }

    // Reimbursement = rate × distance
    return distance * reimbursementRate;
  }

  /**
   * Get user's preferred distance unit from profile
   */
  private async getUserDistanceUnit(): Promise<string> {
    const { userId } = this.getContext();

    try {
      const userProfile = await this.getGateways().userProfileGw.get(userId);

      if (userProfile && userProfile.length > 0 && userProfile[0].distanceIn) {
        return userProfile[0].distanceIn;
      }
    } catch (error) {
      // If we can't get user profile, default to km
      console.error('Error getting user profile for distance unit:', error);
    }

    return 'km'; // Default to kilometers
  }

  /**
   * Create a travel point (expense_base with expenseType = 4)
   */
  private async createTravelPoint(
    travelId: string,
    carId: string,
    pointData: any,
  ): Promise<any> {
    const { accountId, userId } = this.getContext();

    const travelPointData = {
      accountId,
      userId,
      carId,
      expenseType: EXPENSE_TYPES.TRAVEL_POINT,
      travelId,
      whenDone: pointData.whenDone || this.now(),
      // Financial fields default to 0 for travel points
      //subtotal: 0,
      tax: 0,
      fees: 0,
      totalPrice: 0,
      paidInCurrency: pointData.paidInCurrency ?? 'USD',
      status: STATUS.ACTIVE,
      createdBy: userId,
      createdAt: this.now(),
      //
      ...(pointData || {})
    };

    const result = await this.getGateways().expenseBaseGw.create(travelPointData);

    if (result && result.length > 0) {
      return result[0];
    }

    return null;
  }

  /**
   * Update a travel point
   */
  private async updateTravelPoint(pointId: string, pointData: any): Promise<any> {
    const { accountId, userId } = this.getContext();

    const updateData: any = {
      updatedBy: userId,
      updatedAt: this.now(),
      ...(pointData || {})
    };

    const result = await this.getGateways().expenseBaseGw.update({ id: pointId, accountId }, updateData);

    if (result && result.length > 0) {
      return result[0];
    }

    return null;
  }

  /**
   * Sync tags for a travel record
   */
  private async syncTravelTags(travelId: string, tagIds: string[] | null | undefined): Promise<void> {
    // on tagsId undefiened we do nothing
    if (tagIds === undefined) {
      return;
    }

    // Delete existing tags for this travel
    await this.getGateways().travelExpenseTagGw.remove({ travelId });

    if (!tagIds || tagIds.length == 0) {
      return;
    }

    const travelExpenseTags = tagIds.map((tagId, idx) => ({
      travelId,
      expenseTagId: tagIds[idx],
      orderNo: idx + 1,
    }));

    this.getGateways().travelExpenseTagGw.create(travelExpenseTags);
  }

  /**
   * Build TravelStatsParams from a travel record for stats updates
   */
  private buildTravelStatsParams(travel: any): TravelStatsParams {
    return {
      travelId: travel.id,
      carId: travel.carId,
      firstDttm: travel.firstDttm,
      createdAt: travel.createdAt,
      distanceKm: travel.distanceKm,
      firstOdometer: travel.firstOdometer,
      lastOdometer: travel.lastOdometer,
      status: travel.status ?? STATUS.ACTIVE,
    };
  }

  /**
   * Get the CarStatsUpdater instance
   */
  private getStatsUpdater(): CarStatsUpdater {
    const db = this.getGateways().travelGw.getDb();
    const schema = this.getDb().getSchema();
    return new CarStatsUpdater(db, schema);
  }

  // ===========================================================================
  // Process Item Methods
  // ===========================================================================

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.firstDttm !== null && item.firstDttm !== undefined) {
      item.firstDttm = dayjs(item.firstDttm).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.lastDttm !== null && item.lastDttm !== undefined) {
      item.lastDttm = dayjs(item.lastDttm).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  // ===========================================================================
  // Core CRUD Hooks
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Filter by accountId for security
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the travel belongs to the current account
    if (item.accountId !== this.getContext().accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const accountId = this.getContext().accountId;

    // Filter items to only include those belonging to the current account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    // Extract nested inputs and tagIds
    const { firstRecord, lastRecord, tagIds, distance, distanceIn, ...travelParams } = params;

    // Get user's preferred distance unit
    const userDistanceUnit = await this.getUserDistanceUnit();
    const odometerIn = userDistanceUnit;
    const effectiveDistanceIn = distanceIn || odometerIn;

    // Build travel record
    const newTravel: any = {
      ...travelParams,
      accountId,
      userId,
      odometerIn,
      distanceIn: effectiveDistanceIn,
      createdBy: userId,
      createdAt: this.now(),
    };

    // Extract odometer and datetime from firstRecord if provided
    if (firstRecord) {
      if (firstRecord.odometer != null) {
        newTravel.firstOdometer = firstRecord.odometer;
      }
      if (firstRecord.whenDone) {
        newTravel.firstDttm = firstRecord.whenDone;
      }
    }

    // Extract odometer and datetime from lastRecord if provided
    if (lastRecord) {
      if (lastRecord.odometer != null) {
        newTravel.lastOdometer = lastRecord.odometer;
      }
      if (lastRecord.whenDone) {
        newTravel.lastDttm = lastRecord.whenDone;
      }
    }

    // Calculate distance
    let calculatedDistance: number | null = null;

    if (newTravel.firstOdometer != null && newTravel.lastOdometer != null) {
      // Calculate from odometers
      calculatedDistance = this.calculateDistanceFromOdometers(newTravel.firstOdometer, newTravel.lastOdometer);
    }

    // Use manual distance if odometer-based calculation is not available
    if (calculatedDistance == null && distance != null) {
      calculatedDistance = distance;
    }

    if (calculatedDistance != null) {
      newTravel.distance = calculatedDistance;
      newTravel.distanceKm = this.convertToKm(calculatedDistance, effectiveDistanceIn);
    }

    // Calculate reimbursement if we have distance and rate
    if (calculatedDistance != null && travelParams.reimbursementRate != null) {
      newTravel.calculatedReimbursement = this.calculateReimbursement(
        calculatedDistance,
        travelParams.reimbursementRate,
      );
    }

    // Store nested data for afterCreate processing
    const requestId = this.getRequestId();
    this.operationData.set(`create-${requestId}`, {
      firstRecord,
      lastRecord,
      tagIds,
    });

    return newTravel;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!items || items.length === 0) {
      return items;
    }

    const travel = items[0];
    const requestId = this.getRequestId();
    const createInfo = this.operationData.get(`create-${requestId}`);

    if (createInfo) {
      const { firstRecord, lastRecord, tagIds } = createInfo;

      // Create first travel point if provided
      if (firstRecord) {
        const firstPoint = await this.createTravelPoint(travel.id, travel.carId, firstRecord);

        if (firstPoint) {
          // Update travel with firstRecordId
          await this.getGateways().travelGw.update({ id: travel.id }, { firstRecordId: firstPoint.id });
          travel.firstRecordId = firstPoint.id;
        }
      }

      // Create last travel point if provided
      if (lastRecord) {
        const lastPoint = await this.createTravelPoint(travel.id, travel.carId, lastRecord);

        if (lastPoint) {
          // Update travel with lastRecordId
          await this.getGateways().travelGw.update({ id: travel.id }, { lastRecordId: lastPoint.id });
          travel.lastRecordId = lastPoint.id;
        }
      }

      // Sync tags
      await this.syncTravelTags(travel.id, tagIds);

      // Clean up stored data
      this.operationData.delete(`create-${requestId}`);
    }

    // Update car stats for travels with a car assigned
    if (travel.carId) {
      try {
        const statsParams = this.buildTravelStatsParams(travel);
        await this.getStatsUpdater().onTravelCreated(statsParams);
      } catch (error) {
        // Log error but don't fail the create operation
        console.error('Error updating car stats after travel create:', error);
      }
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID is required');
    }

    // Check if user owns the travel
    const travel = await this.getGateways().travelGw.get(id);

    if (!travel || travel.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
    }

    // Extract nested inputs and tagIds
    const { firstRecord, lastRecord, tagIds, distance, distanceIn, ...travelParams } = params;

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, id: ___, ...restParams } = travelParams;

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Get effective units (use existing if not provided)
    const odometerIn = travel.odometerIn || 'km';
    const effectiveDistanceIn = distanceIn || travel.distanceIn || odometerIn;

    if (distanceIn) {
      restParams.distanceIn = distanceIn;
    }

    // Track odometer values - start with existing
    let firstOdometer = travel.firstOdometer;
    let lastOdometer = travel.lastOdometer;
    let firstDttm = travel.firstDttm;
    let lastDttm = travel.lastDttm;

    // Update from firstRecord if provided
    if (firstRecord) {
      if (firstRecord.odometer != null) {
        firstOdometer = firstRecord.odometer;
        restParams.firstOdometer = firstOdometer;
      }
      if (firstRecord.whenDone) {
        firstDttm = firstRecord.whenDone;
        restParams.firstDttm = firstDttm;
      }
    }

    // Update from lastRecord if provided
    if (lastRecord) {
      if (lastRecord.odometer != null) {
        lastOdometer = lastRecord.odometer;
        restParams.lastOdometer = lastOdometer;
      }
      if (lastRecord.whenDone) {
        lastDttm = lastRecord.whenDone;
        restParams.lastDttm = lastDttm;
      }
    }

    // Recalculate distance
    let calculatedDistance: number | null = null;

    if (firstOdometer != null && lastOdometer != null) {
      calculatedDistance = this.calculateDistanceFromOdometers(firstOdometer, lastOdometer);
    }

    // Use manual distance if provided and odometer calculation not available
    if (calculatedDistance == null && distance != null) {
      calculatedDistance = distance;
    }

    // Update distance fields
    if (calculatedDistance != null) {
      restParams.distance = calculatedDistance;
      restParams.distanceKm = this.convertToKm(calculatedDistance, effectiveDistanceIn);
    }

    // Calculate reimbursement
    const reimbursementRate = restParams.reimbursementRate ?? travel.reimbursementRate;
    const finalDistance = calculatedDistance ?? travel.distance;

    if (finalDistance != null && reimbursementRate != null) {
      restParams.calculatedReimbursement = this.calculateReimbursement(
        finalDistance,
        reimbursementRate,
      );
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    // Store nested data and existing travel for afterUpdate processing
    const requestId = this.getRequestId();
    this.operationData.set(`update-${requestId}-${id}`, {
      firstRecord,
      lastRecord,
      tagIds,
      existingTravel: travel,
    });

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!items || items.length === 0) {
      return items;
    }

    const requestId = this.getRequestId();

    for (const travel of items) {
      if (!travel.id) continue;

      const updateInfo = this.operationData.get(`update-${requestId}-${travel.id}`);

      if (!updateInfo) continue;

      const { firstRecord, lastRecord, tagIds, existingTravel } = updateInfo;

      // Handle first travel point
      if (firstRecord) {
        if (existingTravel?.firstRecordId) {
          // Update existing first point
          await this.updateTravelPoint(existingTravel.firstRecordId, firstRecord);
        } else {
          // Create new first point
          const firstPoint = await this.createTravelPoint(travel.id, travel.carId, firstRecord);

          if (firstPoint) {
            await this.getGateways().travelGw.update({ id: travel.id }, { firstRecordId: firstPoint.id });
            travel.firstRecordId = firstPoint.id;
          }
        }
      }

      // Handle last travel point
      if (lastRecord) {
        if (existingTravel?.lastRecordId) {
          // Update existing last point
          await this.updateTravelPoint(existingTravel.lastRecordId, lastRecord);
        } else {
          // Create new last point
          const lastPoint = await this.createTravelPoint(travel.id, travel.carId, lastRecord);

          if (lastPoint) {
            await this.getGateways().travelGw.update({ id: travel.id }, { lastRecordId: lastPoint.id });
            travel.lastRecordId = lastPoint.id;
          }
        }
      }

      // Sync tags if provided
      await this.syncTravelTags(travel.id, tagIds);

      // Update car stats
      // Need to handle: old car, new car, or both if car changed
      const oldCarId = existingTravel?.carId;
      const newCarId = travel.carId;

      if (oldCarId || newCarId) {
        try {
          // Fetch the fully updated travel record to ensure we have all fields
          const updatedTravel = await this.getGateways().travelGw.get(travel.id);

          if (updatedTravel) {
            const oldStatsParams = this.buildTravelStatsParams(existingTravel);
            const newStatsParams = this.buildTravelStatsParams(updatedTravel);

            await this.getStatsUpdater().onTravelUpdated(oldStatsParams, newStatsParams);
          }
        } catch (error) {
          // Log error but don't fail the update operation
          console.error('Error updating car stats after travel update:', error);
        }
      }

      // Clean up stored data
      this.operationData.delete(`update-${requestId}-${travel.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID is required');
    }

    // Check if user owns the travel
    const travel = await this.getGateways().travelGw.get(id);

    if (!travel || travel.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
    }

    // Store travel for afterRemove cleanup
    const requestId = this.getRequestId();
    this.operationData.set(`remove-${requestId}-${id}`, {
      existingTravel: travel,
    });

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!items || items.length === 0) {
      return items;
    }

    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) continue;

      const removeInfo = this.operationData.get(`remove-${requestId}-${item.id}`);

      if (removeInfo && removeInfo.existingTravel) {
        const existingTravel = removeInfo.existingTravel;

        // Soft-delete associated travel points
        await this.getGateways().expenseBaseGw.remove(
          {
            travelId: existingTravel.id,
            accountId,
            expenseType: EXPENSE_TYPES.TRAVEL_POINT,
          });

        // Remove tag associations
        await this.getGateways().travelExpenseTagGw.remove({ travelId: existingTravel.id });

        // Update car stats
        if (existingTravel.carId) {
          try {
            const statsParams = this.buildTravelStatsParams(existingTravel);
            await this.getStatsUpdater().onTravelRemoved(statsParams);
          } catch (error) {
            // Log error but don't fail the remove operation
            console.error('Error updating car stats after travel remove:', error);
          }
        }
      }

      // Clean up stored data
      this.operationData.delete(`remove-${requestId}-${item.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();
    const allowedWhere: any[] = [];
    const requestId = this.getRequestId();

    // Check ownership for each travel
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const travel = await this.getGateways().travelGw.get(id);

      if (travel && travel.accountId === accountId) {
        // Store travel for afterRemoveMany cleanup
        this.operationData.set(`removeMany-${requestId}-${id}`, {
          existingTravel: travel,
        });

        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) continue;

      const removeInfo = this.operationData.get(`removeMany-${requestId}-${item.id}`);

      if (removeInfo && removeInfo.existingTravel) {
        const existingTravel = removeInfo.existingTravel;

        // Soft-delete associated travel points
        await this.getGateways().expenseBaseGw.remove(
          {
            travelId: existingTravel.id,
            accountId,
            expenseType: EXPENSE_TYPES.TRAVEL_POINT,
          },
        );

        // Remove tag associations
        await this.getGateways().travelExpenseTagGw.remove({ travelId: existingTravel.id });

        // Update car stats
        if (existingTravel.carId) {
          try {
            const statsParams = this.buildTravelStatsParams(existingTravel);
            await this.getStatsUpdater().onTravelRemoved(statsParams);
          } catch (error) {
            // Log error but don't fail the remove operation
            console.error('Error updating car stats after travel removeMany:', error);
          }
        }
      }

      // Clean up stored data
      this.operationData.delete(`removeMany-${requestId}-${item.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { TravelCore };