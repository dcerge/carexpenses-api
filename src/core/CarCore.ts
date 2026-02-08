// ./src/core/CarCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { CarStatsUpdater } from '../utils';
import { toMetricDistance } from '../utils/unitConversions';

import { AppCore } from './AppCore';
import { validators } from './validators/carValidators';
import { trialCheckMiddleware } from '../middleware';
import { FEATURE_CODES } from '../utils';
import { ENTITY_TYPE_IDS, USER_CAR_ROLES, CAR_STATUSES, USER_ROLES, OPERATION_RIGHTS } from '../boundary';
import config from '../config';

dayjs.extend(utc);

interface CarUserInput {
  id?: string;
  userId?: string;
  carId?: string;
  roleId?: number;
  status?: number;
}

interface CarUpdateData {
  uploadedFilesIds?: string[];
  carUsers?: CarUserInput[];
  oldCar?: any; // Store old car for stats delta calculation
}

class CarCore extends AppCore {
  private updateData: Map<string, CarUpdateData> = new Map();
  private statsUpdater: CarStatsUpdater | null = null;

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carGw',
      name: 'Car',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing cars',
        get: 'getting a car',
        getMany: 'getting multiple cars',
        create: 'creating a car',
        createMany: '',
        update: 'updating a car',
        updateMany: '',
        set: '',
        remove: 'removing a car',
        removeMany: 'removing multiple cars',
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
   * Convert car's initial mileage to metric (km) for stats storage.
   *
   * @param initialMileage - The initial mileage value as entered by user
   * @param mileageIn - The unit the mileage was entered in ('km' or 'mi')
   * @returns The mileage converted to kilometers
   */
  private convertInitialMileageToMetric(initialMileage: number | null | undefined, mileageIn: string | null | undefined): number {
    const mileage = initialMileage ?? 0;
    const unit = mileageIn || 'km';
    return toMetricDistance(mileage, unit) ?? 0;
  }

  public async carsQty(): Promise<number> {
    return this.getGateways().carGw.count({ accountId: this.getContext().accountId });
  }

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.whenBought !== null && item.whenBought !== undefined) {
      item.whenBought = dayjs(item.whenBought).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.whenSold !== null && item.whenSold !== undefined) {
      item.whenSold = dayjs(item.whenSold).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  // ===========================================================================
  // List
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Use AppCore's filterAccessibleCarIds for DRIVER role restriction
    const carIdFilter = await this.filterAccessibleCarIds(filter?.id);

    this.logger.debug(
      `Listing cars for account ${accountId}${carIdFilter ? `, restricted to ${Array.isArray(carIdFilter) ? carIdFilter.length : 1} accessible car(s)` : ''}`,
    );

    // Filter by accountId for security
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
        ...(carIdFilter ? { id: carIdFilter } : {}),
      },
    };
  }

  // ===========================================================================
  // Get / GetMany
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      this.logger.debug('Car was not found, returning null');
      return item;
    }

    // Use AppCore's validateCarAccess for security check
    const hasAccess = await this.validateCarAccess(item);

    if (!hasAccess) {
      this.logger.log(
        `User does not have access to car ${item.id}, returning not found`,
      );
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      this.logger.debug('Items passed to afterGetMany is not an array, returning as-is');
      return items;
    }

    // Use AppCore's getAccessibleCarIdsFromCars for batch validation
    const accessibleCarIds = await this.getAccessibleCarIdsFromCars(items);

    // Filter to only accessible cars
    const filteredItems = items.filter((item) => item && accessibleCarIds.has(item.id));

    if (filteredItems.length < items.length) {
      this.logger.debug(
        `Filtered out ${items.length - filteredItems.length} car(s) that the user cannot access`,
      );
    }

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with VIEWER role is not allowed to create vehicles`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create vehicles');
    }

    const trialCheck = await trialCheckMiddleware({
      core: this,
      operation: 'create',
      featureCode: FEATURE_CODES.MAX_VEHICLES,
      featureValue: await this.carsQty(),
    });

    if (trialCheck.code !== OP_RESULT_CODES.OK) {
      this.logger.log(
        `Trial check failed for user ${userId} when creating a vehicle: code=${trialCheck.code}`,
      );
      return trialCheck;
    }

    const { uploadedFilesIds, carUsers, ...restParams } = params;

    // Store data for afterCreate using requestId
    const requestId = this.getRequestId();
    const stageKey = `create-${requestId}`;

    this.updateData.set(stageKey, {
      uploadedFilesIds,
      carUsers,
    });

    this.logger.debug(
      `Vehicle creation data prepared for account ${accountId}: stageKey=${stageKey}, attachments=${uploadedFilesIds?.length || 0}, carUsers=${carUsers?.length || 0}`,
    );

    const newCar = {
      ...restParams,
      accountId,
      userId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newCar;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    // Create user_cars junction record for the owner
    for (const car of items) {
      this.logger.debug(
        `Creating owner user-car assignment for car ${car.id} and user ${userId}`,
      );

      await this.getGateways().userCarGw.create({
        accountId: car.accountId,
        userId,
        carId: car.id,
        roleId: USER_CAR_ROLES.OWNER,
        status: CAR_STATUSES.ACTIVE,
        createdBy: userId,
        createdAt: this.now(),
      });

      // Initialize car stats with initial mileage
      try {
        const initialMileageMetric = this.convertInitialMileageToMetric(
          car.initialMileage,
          car.mileageIn,
        );

        // Only initialize stats if there's an initial mileage > 0
        if (initialMileageMetric > 0) {
          // Get user's home currency for stats
          const userProfile = await this.getCurrentUserProfile();
          const homeCurrency = userProfile.homeCurrency || 'USD';

          await this.getStatsUpdater().onCarCreated(car.id, homeCurrency, initialMileageMetric);

          this.logger.debug(
            `Initialized car stats for car ${car.id} with initial mileage ${initialMileageMetric} km and currency ${homeCurrency}`,
          );
        } else {
          this.logger.debug(
            `Skipping car stats initialization for car ${car.id} because initial mileage is zero`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to initialize car stats for car ${car.id}:`, error);
      }
    }

    const requestId = this.getRequestId();
    const stageKey = `create-${requestId}`;
    const createInfo = this.updateData.get(stageKey);

    if (createInfo) {
      // Handle uploaded files attachments
      if (Array.isArray(createInfo.uploadedFilesIds) && createInfo.uploadedFilesIds.length > 0) {
        this.logger.debug(
          `Attaching ${createInfo.uploadedFilesIds.length} file(s) to newly created car ${items[0].id}`,
        );

        const attachments = createInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
          return {
            entityTypeId: ENTITY_TYPE_IDS.CAR,
            entityId: items[0].id,
            uploadedFileId,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().entityEntityAttachmentGw.create(attachments);
      }

      // Handle additional car users (non-owners)
      if (Array.isArray(createInfo.carUsers) && createInfo.carUsers.length > 0) {
        this.logger.debug(
          `Syncing ${createInfo.carUsers.length} additional car user(s) for car ${items[0].id}`,
        );
        await this.syncCarUsers(items[0].id, accountId, userId, createInfo.carUsers);
      }

      // Clean up stored data
      this.updateData.delete(stageKey);
    } else {
      this.logger.debug(
        `No staged create data found for stageKey=${stageKey}, skipping attachments and car users`,
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

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with VIEWER role is not allowed to update vehicles`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update vehicles');
    }

    // Check if user has access to the car
    const car = await this.getGateways().carGw.get(id);

    if (!car) {
      this.logger.log(`Car ${id} was not found, cannot update`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle not found');
    }

    const hasAccess = await this.validateCarAccess(car);

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to car ${id}, cannot update`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to update the vehicle');
    }

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, uploadedFilesIds, carUsers, ...restParams } = params;

    // Store data for afterUpdate using requestId
    const requestId = this.getRequestId();
    const stageKey = `update-${requestId}-${id}`;

    this.updateData.set(stageKey, {
      uploadedFilesIds,
      carUsers,
      oldCar: car, // Store old car for stats delta calculation
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(
      `Car ${id} update data prepared: stageKey=${stageKey}, attachments=${uploadedFilesIds?.length ?? 'unchanged'}, carUsers=${carUsers?.length ?? 'unchanged'}`,
    );

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        this.logger.log('Updated car item has no ID, skipping post-update processing');
        continue;
      }

      const stageKey = `update-${requestId}-${item.id}`;
      const updateInfo = this.updateData.get(stageKey);

      if (!updateInfo) {
        this.logger.debug(
          `No staged update data found for car ${item.id} with stageKey=${stageKey}`,
        );
        continue;
      }

      // Check if initial mileage or mileage unit changed and update stats
      if (updateInfo.oldCar) {
        const oldCar = updateInfo.oldCar;
        const mileageChanged =
          oldCar.initialMileage !== item.initialMileage ||
          oldCar.mileageIn !== item.mileageIn;

        if (mileageChanged) {
          this.logger.debug(
            `Initial mileage changed for car ${item.id}: ${oldCar.initialMileage} ${oldCar.mileageIn} -> ${item.initialMileage} ${item.mileageIn}, updating stats`,
          );

          try {
            const initialMileageMetric = this.convertInitialMileageToMetric(
              item.initialMileage,
              item.mileageIn,
            );

            // Get user's home currency for stats
            const userProfile = await this.getCurrentUserProfile();
            const homeCurrency = userProfile.homeCurrency || 'USD';

            await this.getStatsUpdater().onCarInitialMileageChanged(item.id, homeCurrency, initialMileageMetric);

            this.logger.debug(
              `Successfully updated car stats for car ${item.id} with new initial mileage ${initialMileageMetric} km`,
            );
          } catch (error) {
            this.logger.error(`Failed to update car stats on mileage change for car ${item.id}:`, error);
          }
        }
      }

      // Handle uploaded files attachments
      if (Array.isArray(updateInfo.uploadedFilesIds)) {
        this.logger.debug(
          `Replacing file attachments for car ${item.id} with ${updateInfo.uploadedFilesIds.length} file(s)`,
        );

        await this.getGateways().entityEntityAttachmentGw.remove({
          entityTypeId: ENTITY_TYPE_IDS.CAR,
          entityId: item.id,
        });

        if (updateInfo.uploadedFilesIds.length > 0) {
          const attachments = updateInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
            return {
              entityTypeId: ENTITY_TYPE_IDS.CAR,
              entityId: item.id,
              uploadedFileId,
              orderNo: 1000000 + (idx + 1) * 1000,
            };
          });

          await this.getGateways().entityEntityAttachmentGw.create(attachments);
        }
      }

      // Handle car users sync
      if (Array.isArray(updateInfo.carUsers)) {
        this.logger.debug(
          `Syncing ${updateInfo.carUsers.length} car user(s) for car ${item.id}`,
        );
        await this.syncCarUsers(item.id, accountId, userId, updateInfo.carUsers);
      }

      // Clean up stored data
      this.updateData.delete(stageKey);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Car Users Sync
  // ===========================================================================

  /**
   * Synchronizes car users for a given car.
   * - Preserves the owner (roleId = OWNER) - never deletes or modifies
   * - Removes existing non-owner users that are not in the input
   * - Creates or updates users from the input
   *
   * @param carId - The car ID to sync users for
   * @param accountId - The account ID
   * @param currentUserId - The current user performing the action
   * @param carUsersInput - Array of car user inputs from the request
   */
  private async syncCarUsers(
    carId: string,
    accountId: string | null | undefined,
    currentUserId: string | null | undefined,
    carUsersInput: CarUserInput[],
  ): Promise<void> {
    const userCarGw = this.getGateways().userCarGw;

    // Get all existing car users for this car within the same account
    const existingCarUsers = await userCarGw.list({
      filter: {
        carId,
        accountId,
        status: [CAR_STATUSES.ACTIVE],
      },
    });

    // Separate owner from other users
    const ownerRecord = existingCarUsers.find((uc: any) => uc.roleId === USER_CAR_ROLES.OWNER);
    const existingNonOwners = existingCarUsers.filter((uc: any) => uc.roleId !== USER_CAR_ROLES.OWNER);

    this.logger.debug(
      `Syncing car users for car ${carId}: ${existingCarUsers.length} existing (${ownerRecord ? '1 owner' : 'no owner'}, ${existingNonOwners.length} non-owner(s)), ${carUsersInput.length} input user(s)`,
    );

    // Filter out any attempt to set OWNER role through carUsers input (owner is managed separately)
    const validInputUsers = carUsersInput.filter(
      (input) => input.roleId !== USER_CAR_ROLES.OWNER && input.userId,
    );

    if (validInputUsers.length < carUsersInput.length) {
      this.logger.debug(
        `Filtered out ${carUsersInput.length - validInputUsers.length} input user(s) that either had OWNER role or missing userId`,
      );
    }

    // Create a map of existing non-owner users by userId for quick lookup
    const existingByUserId = new Map<string, any>();
    for (const existing of existingNonOwners) {
      existingByUserId.set(existing.userId, existing);
    }

    // Create a set of user IDs from input for quick lookup
    const inputUserIds = new Set(validInputUsers.map((input) => input.userId));

    // Track which existing records we've matched to input
    const matchedExistingIds = new Set<string>();

    // Process input: create new or update existing
    for (const input of validInputUsers) {
      // Check if this user already has a record for this car
      const existingRecord = existingByUserId.get(input.userId!);

      if (existingRecord) {
        // Update existing record if roleId or status changed
        const updates: any = {};
        let hasChanges = false;

        if (input.roleId !== undefined && input.roleId !== existingRecord.roleId) {
          updates.roleId = input.roleId;
          hasChanges = true;
        }

        if (input.status !== undefined && input.status !== existingRecord.status) {
          updates.status = input.status;
          hasChanges = true;
        }

        if (hasChanges) {
          updates.updatedBy = currentUserId;
          updates.updatedAt = this.now();

          await userCarGw.update({ id: existingRecord.id }, updates);

          this.logger.debug(
            `Updated car user assignment ${existingRecord.id} for user ${input.userId} on car ${carId}`,
          );
        }

        matchedExistingIds.add(existingRecord.id);
      } else {
        // Create new user-car assignment
        const newRole = input.roleId ?? USER_CAR_ROLES.VIEWER;

        await userCarGw.create({
          accountId,
          userId: input.userId,
          carId,
          roleId: newRole,
          status: input.status ?? CAR_STATUSES.ACTIVE,
          createdBy: currentUserId,
          createdAt: this.now(),
        });

        this.logger.debug(
          `Created new car user assignment for user ${input.userId} on car ${carId} with role ${newRole}`,
        );
      }
    }

    // Remove non-owner users that are not in the input
    const toRemove = existingNonOwners.filter(
      (existing) => !matchedExistingIds.has(existing.id) && !inputUserIds.has(existing.userId),
    );

    for (const existing of toRemove) {
      await userCarGw.remove({ id: existing.id });
    }

    if (toRemove.length > 0) {
      this.logger.debug(
        `Removed ${toRemove.length} car user assignment(s) from car ${carId} that were no longer in the input`,
      );
    }
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    // DRIVER role cannot remove any vehicles
    if (this.isDriverOrViewerRole()) {
      this.logger.log(
        `User ${userId} with driver or viewer role is not allowed to remove vehicles`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.FORBIDDEN,
        {},
        'You do not have permission to remove vehicles',
      );
    }

    // Check if user has access to the car
    const car = await this.getGateways().carGw.get(id);

    if (!car) {
      this.logger.log(`Car ${id} was not found, cannot remove`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle not found');
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(`Car ${id} is ready for removal by user ${userId}`);

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    await this.removeCarUsersForCars(items);

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { userId } = this.getContext();

    // DRIVER role cannot remove any vehicles
    if (this.isDriverOrViewerRole()) {
      this.logger.log(
        `User ${userId} with driver or viewer role is not allowed to remove vehicles in bulk`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.FORBIDDEN,
        {},
        'You do not have permission to remove vehicles',
      );
    }

    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();
    const allowedWhere: any[] = [];

    // Collect all car IDs from the where array
    const carIds = where.map((item) => item?.id).filter(Boolean);

    if (carIds.length === 0) {
      this.logger.debug('No valid car IDs provided for bulk removal, returning empty list');
      return [];
    }

    // Single batch query to fetch all cars at once, filtered by accountId for security
    const cars = await this.getGateways().carGw.list({ filter: { id: carIds, accountId } });

    // Get accessible car IDs using batch validation (handles DRIVER role filtering)
    const accessibleCarIds = await this.getAccessibleCarIdsFromCars(cars);

    // Build allowed where with only accessible cars
    for (const item of where) {
      const { id } = item || {};

      if (id && accessibleCarIds.has(id)) {
        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    if (allowedWhere.length < where.length) {
      this.logger.debug(
        `Bulk removal: ${where.length - allowedWhere.length} car(s) excluded due to access restrictions or not found`,
      );
    }

    this.logger.debug(
      `Bulk removal approved for ${allowedWhere.length} out of ${where.length} car(s)`,
    );

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    await this.removeCarUsersForCars(items);

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Car User Cleanup Helpers
  // ===========================================================================

  /**
   * Batch removes all user-car assignments for the given cars.
   * Fetches all assignments in a single query instead of one query per car,
   * then removes them individually (gateway.remove does soft-delete via
   * setting removed_at which requires per-record calls).
   *
   * @param cars - Array of car objects (must have `id` property)
   */
  private async removeCarUsersForCars(cars: any[]): Promise<void> {
    const carIds = (cars || []).map((item: any) => item?.id).filter(Boolean);

    if (carIds.length === 0) {
      return;
    }

    // Single batch query to get all user-car assignments for all removed cars
    const allCarUsers = await this.getGateways().userCarGw.list({
      filter: {
        carId: carIds,
      },
    });

    if (allCarUsers.length === 0) {
      this.logger.debug(
        `No user-car assignments found for ${carIds.length} removed car(s), nothing to clean up`,
      );
      return;
    }

    this.logger.debug(
      `Removing ${allCarUsers.length} user-car assignment(s) across ${carIds.length} removed car(s)`,
    );

    for (const carUser of allCarUsers) {
      await this.getGateways().userCarGw.remove({ id: carUser.id });
    }
  }
}

export { CarCore };