import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/travelValidators';
import { EXPENSE_TYPES, STATUS } from '../database';
import { CarStatsUpdater, TravelStatsParams } from '../utils/CarStatsUpdater';
import { weatherGateway } from '../weatherClient';
import { mapWeatherToDbFields } from '../gateways/apis/weather';
import { toMetricDistance } from '../utils';
import { USER_ROLES } from '../boundary';

dayjs.extend(utc);

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
      const createdPoint = result[0];

      // Fetch and store weather data (non-blocking)
      await this.enrichWithWeather(
        createdPoint.id,
        createdPoint.latitude,
        createdPoint.longitude,
        createdPoint.whenDone
      );

      return createdPoint;
    }

    return null;
  }

  /**
   * Update a travel point
   */
  private async updateTravelPoint(pointId: string, pointData: any): Promise<any> {
    const { accountId, userId } = this.getContext();

    // Fetch existing point to check if coordinates changed
    const existingPoint = await this.getGateways().expenseBaseGw.get(pointId);

    const updateData: any = {
      updatedBy: userId,
      updatedAt: this.now(),
      ...(pointData || {})
    };

    const result = await this.getGateways().expenseBaseGw.update({ id: pointId, accountId }, updateData);

    if (result && result.length > 0) {
      const updatedPoint = result[0];

      // Fetch weather only if coordinates have changed
      if (this.haveCoordinatesChanged(existingPoint, updatedPoint)) {
        await this.enrichWithWeather(
          updatedPoint.id,
          updatedPoint.latitude,
          updatedPoint.longitude,
          updatedPoint.whenDone
        );
      }

      return updatedPoint;
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
  private buildTravelStatsParams(travel: any, odometerIn?: string): TravelStatsParams {
    // Get the highest odometer in car's unit
    const lastOdometerInCarUnit = travel.lastOdometer ?? travel.firstOdometer ?? null;

    // Convert to metric for stats (car_total_summaries stores in metric)
    const lastRecordOdometerMetric = lastOdometerInCarUnit != null && odometerIn
      ? toMetricDistance(lastOdometerInCarUnit, odometerIn)
      : null;

    return {
      travelId: travel.id,
      carId: travel.carId,
      firstDttm: travel.firstDttm,
      createdAt: travel.createdAt,
      distanceKm: travel.distanceKm,
      firstOdometer: travel.firstOdometer,
      lastOdometer: travel.lastOdometer,
      status: travel.status ?? STATUS.ACTIVE,
      lastRecordOdometer: lastRecordOdometerMetric,
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
  // Weather Integration
  // ===========================================================================

  /**
   * Fetch and store weather data for a travel point (expense_base record).
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
      console.error(`Failed to fetch weather for travel point ${expenseBaseId}:`, error);
    }
  }

  /**
   * Check if coordinates have changed between old and new data
   */
  private haveCoordinatesChanged(
    oldData: any,
    newData: any
  ): boolean {
    const oldLat = oldData?.latitude;
    const oldLon = oldData?.longitude;
    const newLat = newData?.latitude;
    const newLon = newData?.longitude;

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
    const { accountId, userId, roleId } = this.getContext();

    // Extract nested inputs and tagIds
    // the input value for "distance" is always in the car's units - car.mileageIn
    const { firstRecord, lastRecord, tagIds, distance, ...travelParams } = params;

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create travels');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to create a travel for the vehicle');
    }

    // Get user's preferred distance unit
    const { homeCurrency } = await this.getCurrentUserProfile();
    const car = await this.getGateways().carGw.get(params.carId);
    const odometerIn = car?.mileageIn || 'km';

    // Build travel record
    const newTravel: any = {
      ...travelParams,
      accountId,
      userId,
      odometerIn,
      distanceIn: odometerIn,
      createdBy: userId,
      createdAt: this.now(),
    };

    let firstOdometerInCarUnit: number | null = null;
    let lastOdometerInCarUnit: number | null = null;

    // Extract odometer and datetime from firstRecord if provided
    if (firstRecord) {
      firstRecord.homeCurrency = homeCurrency;

      if (firstRecord.odometer != null) {
        // Save original value in car's unit
        firstOdometerInCarUnit = firstRecord.odometer;

        // Travel table stores in car's unit
        newTravel.firstOdometer = firstOdometerInCarUnit;

        // Convert to metric for expense_base storage
        firstRecord.odometer = toMetricDistance(firstRecord.odometer, odometerIn);
      }

      if (firstRecord.whenDone) {
        newTravel.firstDttm = firstRecord.whenDone;
      }
    }

    // Extract odometer and datetime from lastRecord if provided
    if (lastRecord) {
      lastRecord.homeCurrency = homeCurrency;

      if (lastRecord.odometer != null) {
        // Save original value in car's unit
        lastOdometerInCarUnit = lastRecord.odometer;

        // Travel table stores in car's unit
        newTravel.lastOdometer = lastOdometerInCarUnit;

        // Convert to metric for expense_base storage
        lastRecord.odometer = toMetricDistance(lastRecord.odometer, odometerIn);
      }

      if (lastRecord.whenDone) {
        newTravel.lastDttm = lastRecord.whenDone;
      }
    }

    // Calculate distance
    let calculatedDistanceInCarUnit: number | null = null;
    let calculatedDistanceKm: number | null = null;

    if (firstOdometerInCarUnit != null && lastOdometerInCarUnit != null) {
      // Distance in car's unit
      calculatedDistanceInCarUnit = this.calculateDistanceFromOdometers(firstOdometerInCarUnit, lastOdometerInCarUnit);

      // Convert to km
      if (calculatedDistanceInCarUnit != null) {
        calculatedDistanceKm = toMetricDistance(calculatedDistanceInCarUnit, odometerIn);
      }
    }

    // if odometer was provided then use it for distance calculations
    // otherwise use distance provided by user in car's units
    if (calculatedDistanceInCarUnit != null) {
      newTravel.distance = calculatedDistanceInCarUnit;
      newTravel.distanceKm = calculatedDistanceKm;
    } else if (distance != null) {
      newTravel.distance = distance;
      newTravel.distanceKm = toMetricDistance(distance, odometerIn);
    }

    // Calculate reimbursement if we have distance and rate
    if (newTravel.distanceKm != null && travelParams.reimbursementRate != null) {
      newTravel.calculatedReimbursement = this.calculateReimbursement(
        newTravel.distanceKm,
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
        const car = await this.getGateways().carGw.get(travel.carId);
        const odometerIn = car?.mileageIn || 'km';
        const statsParams = this.buildTravelStatsParams(travel, odometerIn);
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
    const { accountId, userId, roleId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID is required');
    }

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update travels');
    }

    // Check if user owns the travel
    const travel = await this.getGateways().travelGw.get(id);
    const { homeCurrency } = await this.getCurrentUserProfile();

    if (!travel || travel.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: travel.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to update the travel');
    }

    // Get car for mileage unit
    const car = await this.getGateways().carGw.get(travel.carId);
    const odometerIn = car?.mileageIn || 'km';

    // Extract nested inputs and tagIds
    // the input value for "distance" is always in the car's units - car.mileageIn
    const { firstRecord, lastRecord, tagIds, distance, ...travelParams } = params;

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, id: ___, ...restParams } = travelParams;

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Track odometer values in car's unit - start with existing
    let firstOdometerInCarUnit: number | null = travel.firstOdometer;
    let lastOdometerInCarUnit: number | null = travel.lastOdometer;
    let firstDttm = travel.firstDttm;
    let lastDttm = travel.lastDttm;

    // Update from firstRecord if provided
    if (firstRecord) {
      firstRecord.homeCurrency = homeCurrency;

      if (firstRecord.odometer != null) {
        // Save original value in car's unit
        firstOdometerInCarUnit = firstRecord.odometer;

        // Travel table stores in car's unit
        restParams.firstOdometer = firstOdometerInCarUnit;

        // Convert to metric for expense_base storage
        firstRecord.odometer = toMetricDistance(firstRecord.odometer, odometerIn);
      }

      if (firstRecord.whenDone) {
        firstDttm = firstRecord.whenDone;
        restParams.firstDttm = firstDttm;
      }
    }

    // Update from lastRecord if provided
    if (lastRecord) {
      lastRecord.homeCurrency = homeCurrency;

      if (lastRecord.odometer != null) {
        // Save original value in car's unit
        lastOdometerInCarUnit = lastRecord.odometer;

        // Travel table stores in car's unit
        restParams.lastOdometer = lastOdometerInCarUnit;

        // Convert to metric for expense_base storage
        lastRecord.odometer = toMetricDistance(lastRecord.odometer, odometerIn);
      }

      if (lastRecord.whenDone) {
        lastDttm = lastRecord.whenDone;
        restParams.lastDttm = lastDttm;
      }
    }

    // Calculate distance
    let calculatedDistanceInCarUnit: number | null = null;
    let calculatedDistanceKm: number | null = null;

    if (firstOdometerInCarUnit != null && lastOdometerInCarUnit != null) {
      // Distance in car's unit
      calculatedDistanceInCarUnit = this.calculateDistanceFromOdometers(firstOdometerInCarUnit, lastOdometerInCarUnit);

      // Convert to km
      if (calculatedDistanceInCarUnit != null) {
        calculatedDistanceKm = toMetricDistance(calculatedDistanceInCarUnit, odometerIn);
      }
    }

    // if odometer was provided then use it for distance calculations
    // otherwise use distance provided by user in car's units
    if (calculatedDistanceInCarUnit != null) {
      restParams.distance = calculatedDistanceInCarUnit;
      restParams.distanceKm = calculatedDistanceKm;
    } else if (distance != null) {
      restParams.distance = distance;
      restParams.distanceKm = toMetricDistance(distance, odometerIn);
    }

    // Calculate reimbursement
    const reimbursementRate = restParams.reimbursementRate ?? travel.reimbursementRate;
    const finalDistanceKm = restParams.distanceKm ?? travel.distanceKm;

    if (finalDistanceKm != null && reimbursementRate != null) {
      restParams.calculatedReimbursement = this.calculateReimbursement(
        finalDistanceKm,
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
            const car = await this.getGateways().carGw.get(updatedTravel.carId);
            const odometerIn = car?.mileageIn || 'km';

            const oldStatsParams = this.buildTravelStatsParams(existingTravel, odometerIn);
            const newStatsParams = this.buildTravelStatsParams(updatedTravel, odometerIn);

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
    const { accountId, roleId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID is required');
    }

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove travels');
    }

    // Check if user owns the travel
    const travel = await this.getGateways().travelGw.get(id);

    if (!travel || travel.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: travel.carId, accountId });

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to remove the travel');
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

    const { accountId } = this.getContext();
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
            const car = await this.getGateways().carGw.get(existingTravel.carId);
            const odometerIn = car?.mileageIn || 'km';
            const statsParams = this.buildTravelStatsParams(existingTravel, odometerIn);
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

    const { accountId, roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove travels');
    }

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

        const hasAccess = await this.validateCarAccess({ id: travel.carId, accountId });

        if (hasAccess) {
          // Add accountId to where clause for SQL-level security
          allowedWhere.push({ ...item, accountId });
        }
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
            const car = await this.getGateways().carGw.get(existingTravel.carId);
            const odometerIn = car?.mileageIn || 'km';
            const statsParams = this.buildTravelStatsParams(existingTravel, odometerIn);
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