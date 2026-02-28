// ./src/core/SavedPlaceCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/savedPlaceValidators';
import { STATUS, FIELDS, TABLES } from '../database';
import { USER_ROLES } from '../boundary';
import { camelKeys } from '@sdflc/utils';
import config from '../config';

dayjs.extend(utc);

// ===========================================================================
// Core Class
// ===========================================================================

class SavedPlaceCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'savedPlaceGw',
      name: 'SavedPlace',
      hasOrderNo: true,
      orderNoAsDecimal: true,
      doAuth: true,
      doingWhat: {
        list: 'listing saved places',
        get: 'getting a saved place',
        getMany: 'getting multiple saved places',
        create: 'creating a saved place',
        createMany: '',
        update: 'updating a saved place',
        updateMany: '',
        set: '',
        remove: 'removing a saved place',
        removeMany: 'removing multiple saved places',
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
  // Date/Time Formatting
  // ===========================================================================

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    const dateFields = ['lastUsedAt', 'createdAt', 'updatedAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    return item;
  }

  // ===========================================================================
  // Visibility Filter Helper
  // ===========================================================================

  /**
   * Apply saved place visibility rules:
   * - Show all non-private places in the account
   * - Show private places only to their creator
   */
  private applyVisibilityFilter(items: any[], userId: string | undefined): any[] {
    if (!Array.isArray(items)) {
      return items;
    }

    return items.filter((item) => {
      if (!item.isPrivate) {
        return true;
      }
      return item.createdBy === userId;
    });
  }

  // ===========================================================================
  // List
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const { userId } = this.getContext();

    const visibleItems = this.applyVisibilityFilter(items, userId);

    return visibleItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    const { accountId, userId } = this.getContext();

    if (item.accountId !== accountId) {
      return null;
    }

    // Check private visibility
    if (item.isPrivate && item.createdBy !== userId) {
      return null;
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const { accountId, userId } = this.getContext();

    const filteredItems = items.filter((item) => item && item.accountId === accountId);
    const visibleItems = this.applyVisibilityFilter(filteredItems, userId);

    return visibleItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to create saved places`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create saved places');
    }

    const now = this.now();

    const newPlace = {
      ...params,
      accountId,
      normalizedName: params.name ? params.name.trim().toLowerCase() : null,
      placeType: params.placeType || 'other',
      isPrivate: params.isPrivate ?? false,
      radiusM: params.radiusM ?? 150,
      useCount: 0,
      lastUsedAt: null,
      status: params.status ?? STATUS.ACTIVE,
      createdBy: userId,
      createdAt: now,
    };

    this.logger.debug(
      `Saved place is ready for creation: name="${newPlace.name}", ` +
      `placeType=${newPlace.placeType}, isPrivate=${newPlace.isPrivate}`,
    );

    return newPlace;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const created = items?.[0];

    if (created) {
      this.logger.log(
        `Saved place ${created.id} "${created.name}" was successfully created ` +
        `(type=${created.placeType}, private=${created.isPrivate})`,
      );
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Update
  // ===========================================================================

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId, roleId } = this.getContext();

    this.logger.debug(`User ${userId} is updating saved place ${id}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to update saved places`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update saved places');
    }

    // Fetch existing place
    const place = await this.getGateways().savedPlaceGw.get(id);

    if (!place || place.accountId !== accountId) {
      this.logger.log(`Saved place ${id} was not found or does not belong to account ${accountId}`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Saved place not found');
    }

    // Check private ownership: only creator can update private places
    if (place.isPrivate && place.createdBy !== userId) {
      this.logger.log(`User ${userId} cannot update private saved place ${id} created by ${place.createdBy}`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Saved place not found');
    }

    // Don't allow changing accountId
    const { accountId: _, ...restParams } = params;

    const now = this.now();

    const updateParams: any = {
      ...restParams,
      updatedBy: userId,
      updatedAt: now,
    };

    // Update normalized name if name changed
    if (params.name !== undefined) {
      updateParams.normalizedName = params.name ? params.name.trim().toLowerCase() : null;
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(`Saved place ${id} is ready for update`);

    return updateParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const updated = items?.[0];

    if (updated) {
      this.logger.log(`Saved place ${updated.id} "${updated.name}" was successfully updated`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, userId, roleId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Saved place ID is required');
    }

    this.logger.debug(`User ${userId} is removing saved place ${id}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to remove saved places`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove saved places');
    }

    const place = await this.getGateways().savedPlaceGw.get(id);

    if (!place || place.accountId !== accountId) {
      this.logger.log(`Saved place ${id} was not found or does not belong to account ${accountId}`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Saved place not found');
    }

    // Check private ownership
    if (place.isPrivate && place.createdBy !== userId) {
      this.logger.log(`User ${userId} cannot remove private saved place ${id} created by ${place.createdBy}`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Saved place not found');
    }

    where.accountId = accountId;

    this.logger.debug(`Saved place ${id} "${place.name}" is ready for removal`);

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const removed = items?.[0];

    if (removed) {
      this.logger.log(`Saved place ${removed.id} was successfully removed`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId, userId, roleId } = this.getContext();
    const allowedWhere: any[] = [];

    if (roleId === USER_ROLES.VIEWER) {
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove saved places');
    }

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const place = await this.getGateways().savedPlaceGw.get(id);

      if (!place || place.accountId !== accountId) {
        continue;
      }

      // Skip private places not owned by current user
      if (place.isPrivate && place.createdBy !== userId) {
        continue;
      }

      allowedWhere.push({ ...item, accountId });
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Custom Action: List by Proximity
  // ===========================================================================

  /**
   * Find saved places near GPS coordinates, ordered by distance.
   * Returns matching places within each place's own radius_m.
   */
  public async listByProximity(args: {
    proximity: { latitude: number; longitude: number; radiusM?: number };
    filter?: any;
  }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: false,
      doingWhat: 'listing saved places by proximity',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const { proximity, filter } = actionArgs || {};
        const { latitude, longitude, radiusM } = proximity || {};
        const { accountId, userId } = this.getContext();

        if (latitude == null || longitude == null) {
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Latitude and longitude are required for proximity search',
          );
        }

        // Use gateway proximity filter
        const listFilter = {
          ...filter,
          accountId,
          latitude,
          longitude,
          radiusM,
        };

        const items = await this.getGateways().savedPlaceGw.list(listFilter);

        if (!Array.isArray(items) || items.length === 0) {
          return OpResult.ok([]);
        }

        // Apply visibility filter
        const visibleItems = this.applyVisibilityFilter(items, userId);

        // Calculate distances and sort by nearest
        const itemsWithDistance = visibleItems.map((item: any) => {
          const distance = this.calculateHaversineDistance(
            latitude,
            longitude,
            parseFloat(item.latitude),
            parseFloat(item.longitude),
          );
          return { ...item, _distance: distance };
        });

        itemsWithDistance.sort((a: any, b: any) => a._distance - b._distance);

        // Remove internal _distance field and format output
        const result = itemsWithDistance.map((item: any) => {
          const { _distance, ...rest } = item;
          return this.processItemOnOut(rest, opt);
        });

        return OpResult.ok(result);
      },
    });
  }

  // ===========================================================================
  // Helper: Haversine Distance
  // ===========================================================================

  /**
   * Calculate distance in meters between two GPS coordinates using the Haversine formula.
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export { SavedPlaceCore };