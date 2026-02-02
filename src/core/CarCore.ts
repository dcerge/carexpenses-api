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
import { ENTITY_TYPE_IDS, USER_CAR_ROLES, CAR_STATUSES } from '../boundary';
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

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Use AppCore's filterAccessibleCarIds for DRIVER role restriction
    const carIdFilter = await this.filterAccessibleCarIds(filter?.id);

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

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Use AppCore's validateCarAccess for security check
    const hasAccess = await this.validateCarAccess(item);

    if (!hasAccess) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    // Use AppCore's getAccessibleCarIdsFromCars for batch validation
    const accessibleCarIds = await this.getAccessibleCarIdsFromCars(items);

    // Filter to only accessible cars
    const filteredItems = items.filter((item) => item && accessibleCarIds.has(item.id));

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const trialCheck = await trialCheckMiddleware({
      core: this,
      operation: 'create',
      featureCode: FEATURE_CODES.MAX_VEHICLES,
      featureValue: await this.carsQty(),
    });

    if (trialCheck.code !== OP_RESULT_CODES.OK) {
      return trialCheck;
    }

    const { uploadedFilesIds, carUsers, ...restParams } = params;

    // Store data for afterCreate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`create-${requestId}`, {
      uploadedFilesIds,
      carUsers,
    });

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
          car.mileageIn
        );

        // Only initialize stats if there's an initial mileage > 0
        if (initialMileageMetric > 0) {
          // Get user's home currency for stats
          const userProfile = await this.getCurrentUserProfile();
          const homeCurrency = userProfile.homeCurrency || 'USD';

          await this.getStatsUpdater().onCarCreated(car.id, homeCurrency, initialMileageMetric);
        }
      } catch (error) {
        // Log error but don't fail the create operation
        console.error('Failed to initialize car stats:', error);
      }
    }

    const requestId = this.getRequestId();
    const createInfo = this.updateData.get(`create-${requestId}`);

    if (createInfo) {
      // Handle uploaded files attachments
      if (Array.isArray(createInfo.uploadedFilesIds)) {
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
        await this.syncCarUsers(items[0].id, accountId, userId, createInfo.carUsers);
      }

      // Clean up stored data
      this.updateData.delete(`create-${requestId}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car ID is required');
    }

    // Check if user has access to the car
    const car = await this.getGateways().carGw.get(id);
    const hasAccess = await this.validateCarAccess(car);

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car not found');
    }

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, uploadedFilesIds, carUsers, ...restParams } = params;

    // Store data for afterUpdate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`update-${requestId}-${id}`, {
      uploadedFilesIds,
      carUsers,
      oldCar: car, // Store old car for stats delta calculation
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        continue;
      }

      const updateInfo = this.updateData.get(`update-${requestId}-${item.id}`);

      if (!updateInfo) {
        continue;
      }

      // Check if initial mileage or mileage unit changed and update stats
      if (updateInfo.oldCar) {
        const oldCar = updateInfo.oldCar;
        const mileageChanged =
          oldCar.initialMileage !== item.initialMileage ||
          oldCar.mileageIn !== item.mileageIn;

        if (mileageChanged) {
          try {
            const initialMileageMetric = this.convertInitialMileageToMetric(
              item.initialMileage,
              item.mileageIn
            );

            // Get user's home currency for stats
            const userProfile = await this.getCurrentUserProfile();
            const homeCurrency = userProfile.homeCurrency || 'USD';

            await this.getStatsUpdater().onCarInitialMileageChanged(item.id, homeCurrency, initialMileageMetric);
          } catch (error) {
            // Log error but don't fail the update operation
            console.error('Failed to update car stats on mileage change:', error);
          }
        }
      }

      // Handle uploaded files attachments
      if (Array.isArray(updateInfo.uploadedFilesIds)) {
        await this.getGateways().entityEntityAttachmentGw.remove({
          entityTypeId: ENTITY_TYPE_IDS.CAR,
          entityId: item.id,
        });

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

      // Handle car users sync
      if (Array.isArray(updateInfo.carUsers)) {
        await this.syncCarUsers(item.id, accountId, userId, updateInfo.carUsers);
      }

      // Clean up stored data
      this.updateData.delete(`update-${requestId}-${item.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

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

    // Get all existing car users for this car
    const existingCarUsers = await userCarGw.list({
      filter: {
        carId,
        status: [CAR_STATUSES.ACTIVE],
      },
    });

    // Separate owner from other users
    const ownerRecord = existingCarUsers.find((uc: any) => uc.roleId === USER_CAR_ROLES.OWNER);
    const existingNonOwners = existingCarUsers.filter((uc: any) => uc.roleId !== USER_CAR_ROLES.OWNER);

    // Filter out any attempt to set OWNER role through carUsers input (owner is managed separately)
    const validInputUsers = carUsersInput.filter(
      (input) => input.roleId !== USER_CAR_ROLES.OWNER && input.userId,
    );

    // Create a map of existing non-owner users by their ID for quick lookup
    const existingMap = new Map<string, any>();
    for (const existing of existingNonOwners) {
      existingMap.set(existing.id, existing);
    }

    // Create a set of user IDs from input for quick lookup
    const inputUserIds = new Set(validInputUsers.map((input) => input.userId));

    // Track which existing records we've processed
    const processedIds = new Set<string>();

    // Process input: create new or update existing
    for (const input of validInputUsers) {
      // Check if this user already has a record for this car
      const existingRecord = existingNonOwners.find((uc: any) => uc.userId === input.userId);

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
        }

        processedIds.add(existingRecord.id);
      } else {
        // Create new user-car assignment
        await userCarGw.create({
          accountId,
          userId: input.userId,
          carId,
          roleId: input.roleId ?? USER_CAR_ROLES.VIEWER, // Default to viewer if not specified
          status: input.status ?? CAR_STATUSES.ACTIVE,
          createdBy: currentUserId,
          createdAt: this.now(),
        });
      }
    }

    // Remove non-owner users that are not in the input
    for (const existing of existingNonOwners) {
      if (!processedIds.has(existing.id) && !inputUserIds.has(existing.userId)) {
        // Soft delete by setting removedAt
        await userCarGw.remove({ id: existing.id });
      }
    }
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    // DRIVER role cannot remove any vehicles
    if (this.isDriverRole()) {
      return OpResult.fail(
        OP_RESULT_CODES.FORBIDDEN,
        {},
        'You do not have permission to remove vehicles',
      );
    }

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car ID is required');
    }

    // Check if user has access to the car
    const car = await this.getGateways().carGw.get(id);
    const hasAccess = await this.validateCarAccess(car);

    if (!hasAccess) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car not found');
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // Also remove all user-car assignments when a car is removed
    for (const item of items) {
      if (item.id) {
        // Get all user-car assignments for this car and remove them
        const carUsers = await this.getGateways().userCarGw.list({
          filter: {
            carId: item.id,
          },
        });

        for (const carUser of carUsers) {
          await this.getGateways().userCarGw.remove({ id: carUser.id });
        }
      }
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // DRIVER role cannot remove any vehicles
    if (this.isDriverRole()) {
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

    // Batch fetch all cars and validate access
    const carIds = where.map((item) => item?.id).filter(Boolean);

    if (carIds.length === 0) {
      return [];
    }

    const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
    const cars = carsResult.data || carsResult || [];

    // Get accessible car IDs
    const accessibleCarIds = await this.getAccessibleCarIdsFromCars(cars);

    // Build allowed where with only accessible cars
    for (const item of where) {
      const { id } = item || {};

      if (id && accessibleCarIds.has(id)) {
        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // Also remove all user-car assignments when cars are removed
    for (const item of items) {
      if (item.id) {
        const carUsers = await this.getGateways().userCarGw.list({
          filter: {
            carId: item.id,
          },
        });

        for (const carUser of carUsers) {
          await this.getGateways().userCarGw.remove({ id: carUser.id });
        }
      }
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { CarCore };