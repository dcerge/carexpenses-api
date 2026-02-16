// ./src/core/ParkingSessionCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/parkingSessionValidators';
import { PARKING_SESSION_STATUS, EXPENSE_TYPES } from '../database';
import { USER_ROLES } from '../boundary';

dayjs.extend(utc);

// ===========================================================================
// Constants
// ===========================================================================

/** Expense category ID for "Parking" in the expense_categories lookup table */
const PARKING_EXPENSE_CATEGORY_ID = 8;

/** Expense kind ID for "Parking" in the expense_kinds lookup table */
const PARKING_EXPENSE_KIND_ID = 30;

// ===========================================================================
// Interfaces
// ===========================================================================

interface ParkingSessionOperationData {
  existingSession?: any;
}

// ===========================================================================
// Core Class
// ===========================================================================

class ParkingSessionCore extends AppCore {
  // Map to store data between before* and after* hooks
  private operationData: Map<string, ParkingSessionOperationData> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'parkingSessionGw',
      name: 'ParkingSession',
      hasOrderNo: false,
      orderNoAsDecimal: false,
      doAuth: true,
      doingWhat: {
        list: 'listing parking sessions',
        get: 'getting a parking session',
        getMany: 'getting multiple parking sessions',
        create: 'starting a parking session',
        createMany: '',
        update: 'updating a parking session',
        updateMany: '',
        set: '',
        remove: 'removing a parking session',
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

  // ===========================================================================
  // Date/Time Formatting
  // ===========================================================================

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    const dateFields = ['startTime', 'endTime', 'createdAt', 'updatedAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    return item;
  }

  // ===========================================================================
  // List
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    this.logger.debug(`Listing parking sessions for account ${accountId} with filter:`, filter);

    const carIdFilter = await this.filterAccessibleCarIds(filter?.carId);

    const updArgs = {
      ...args,
      filter: {
        ...filter,
        accountId,
        ...(carIdFilter ? { carId: carIdFilter } : {}),
      },
    };

    return updArgs;
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    this.logger.debug(`Returning ${items.length} parking session(s) from list query`);

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      this.logger.debug('Parking session was not found by the gateway');
      return item;
    }

    const hasAccess = await this.validateCarAccess({ id: item.carId, accountId: item.accountId });

    if (!hasAccess) {
      this.logger.log(
        `Access denied to parking session ${item.id} because user does not have access ` +
        `to vehicle ${item.carId}`,
      );
      return null;
    }

    this.logger.debug(`Returning parking session ${item.id} (status=${item.status}, car=${item.carId})`);

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const { accountId } = this.getContext();

    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    const carIds = [...new Set(filteredItems.map((item) => item.carId))];
    const accessibleCarIds = await this.filterAccessibleCarIds(carIds);
    const accessibleSet = new Set(accessibleCarIds);

    const accessibleItems = filteredItems.filter((item) => accessibleSet.has(item.carId));

    this.logger.debug(
      `Returning ${accessibleItems.length} of ${items.length} requested parking sessions ` +
      `(${items.length - accessibleItems.length} filtered out by account or car access)`,
    );

    return accessibleItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Create (Start Parking Session)
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    this.logger.debug(`User ${userId} is starting a parking session for vehicle ${params.carId}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to start parking sessions`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to start parking sessions');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${params.carId}, cannot start parking session`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.NOT_FOUND,
        {},
        'You do not have permission to start parking sessions for this vehicle',
      );
    }

    // Check for existing active session on this vehicle
    const existingSessions = await this.getGateways().parkingSessionGw.list({
      filter: {
        accountId,
        carId: params.carId,
        status: PARKING_SESSION_STATUS.ACTIVE,
      },
    });

    if (existingSessions && existingSessions.length > 0) {
      this.logger.log(
        `Vehicle ${params.carId} already has an active parking session ${existingSessions[0].id}, ` +
        `cannot start a new one`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.VALIDATION_FAILED,
        {},
        'This vehicle already has an active parking session',
      );
    }

    const now = this.now();

    const newSession = {
      ...params,
      accountId,
      startTime: params.startTime || now,
      status: PARKING_SESSION_STATUS.ACTIVE,
      startedBy: userId,
      createdBy: userId,
      createdAt: now,
    };

    this.logger.debug(
      `Parking session is ready for creation: car=${newSession.carId}, ` +
      `startTime=${newSession.startTime}, ` +
      `durationMinutes=${newSession.durationMinutes || 'none'}, ` +
      `initialPrice=${newSession.initialPrice || 'none'}`,
    );

    return newSession;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const created = items?.[0];

    if (created) {
      this.logger.log(
        `Parking session ${created.id} was successfully started ` +
        `for vehicle ${created.carId} at ${created.formattedAddress || 'unknown location'}`,
      );
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Update (Edit Active Session or End Parking Session)
  // ===========================================================================

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId, roleId } = this.getContext();

    this.logger.debug(`User ${userId} is updating parking session ${id}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to update parking sessions`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update parking sessions');
    }

    // Fetch existing session
    const session = await this.getGateways().parkingSessionGw.get(id);

    if (!session || session.accountId !== accountId) {
      this.logger.log(
        `Parking session ${id} was not found or does not belong to account ${accountId}, cannot update`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Parking session not found');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: session.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${session.carId} for parking session ${id}, cannot update`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to update this parking session');
    }

    // Prevent updates to already completed sessions
    if (session.status === PARKING_SESSION_STATUS.COMPLETED) {
      this.logger.log(`Parking session ${id} is already completed, cannot update`);
      return OpResult.fail(OP_RESULT_CODES.VALIDATION_FAILED, {}, 'Cannot update a completed parking session');
    }

    // Don't allow changing accountId or carId
    const { accountId: _a, carId: _c, ...restParams } = params;

    const now = this.now();

    const updateParams: any = {
      ...restParams,
      updatedBy: userId,
      updatedAt: now,
    };

    // Handle ending the parking session (status change to COMPLETED)
    if (params.status === PARKING_SESSION_STATUS.COMPLETED) {
      this.logger.debug(`Parking session ${id} is being ended by user ${userId}`);

      updateParams.endTime = params.endTime || now;
      updateParams.endedBy = userId;

      // Store session for afterUpdate expense generation
      const requestId = this.getRequestId();
      this.operationData.set(`update-${requestId}-${id}`, {
        existingSession: session,
      });
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(`Parking session ${id} is ready for update`);

    return updateParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!items || items.length === 0) {
      return items;
    }

    const requestId = this.getRequestId();

    for (const session of items) {
      if (!session.id) continue;

      const updateInfo = this.operationData.get(`update-${requestId}-${session.id}`);

      if (!updateInfo) continue;

      const { existingSession } = updateInfo;

      // Auto-generate parking expense if session was just ended with price > 0
      if (
        existingSession.status === PARKING_SESSION_STATUS.ACTIVE &&
        session.status === PARKING_SESSION_STATUS.COMPLETED
      ) {
        const finalPrice = session.finalPrice ?? existingSession.initialPrice;

        if (finalPrice && finalPrice > 0) {
          this.logger.debug(
            `Generating parking expense for session ${session.id} with finalPrice=${finalPrice}`,
          );

          try {
            const expenseId = await this.createParkingExpense(session, finalPrice);

            if (expenseId) {
              // Link the expense back to the parking session
              await this.getGateways().parkingSessionGw.update(
                { id: session.id, accountId: session.accountId },
                { expenseId },
              );

              session.expenseId = expenseId;

              this.logger.log(
                `Parking expense ${expenseId} was auto-generated for session ${session.id}`,
              );
            }
          } catch (err: any) {
            // Log but don't fail the session update — session is already ended
            this.logger.log(
              `Failed to auto-generate parking expense for session ${session.id}: ${err.message}`,
            );
          }
        } else {
          this.logger.debug(
            `No expense generated for parking session ${session.id} (free parking or no price)`,
          );
        }
      }

      // Clean up stored data
      this.operationData.delete(`update-${requestId}-${session.id}`);
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
      this.logger.log('Cannot remove parking session because no ID was provided in the request');
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Parking session ID is required');
    }

    this.logger.debug(`User ${userId} is removing parking session ${id}`);

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with role ${roleId} is not allowed to remove parking sessions`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove parking sessions');
    }

    const session = await this.getGateways().parkingSessionGw.get(id);

    if (!session || session.accountId !== accountId) {
      this.logger.log(
        `Parking session ${id} was not found or does not belong to account ${accountId}, cannot remove`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Parking session not found');
    }

    const hasAccess = await this.validateCarAccess({ id: session.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${session.carId} for parking session ${id}, cannot remove`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'You do not have permission to remove this parking session');
    }

    where.accountId = accountId;

    this.logger.debug(
      `Parking session ${id} at ${session.formattedAddress || 'unknown location'} is ready for removal`,
    );

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const removed = items?.[0];

    if (removed) {
      this.logger.log(`Parking session ${removed.id} was successfully removed`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Expense Generation Helper
  // ===========================================================================

  /**
   * Create a parking expense record from a completed parking session.
   *
   * Creates an expense record through the expense core so all expense
   * business logic (stats updates, home currency conversion, etc.) is applied.
   *
   * @returns The created expense ID, or null on failure
   */
  private async createParkingExpense(session: any, finalPrice: number): Promise<string | null> {
    const { accountId, userId } = this.getContext();

    const expenseParams = {
      accountId,
      carId: session.carId,
      expenseType: EXPENSE_TYPES.EXPENSE,
      kindId: PARKING_EXPENSE_KIND_ID,
      whenDone: dayjs(session.startTime).utc().format('YYYY-MM-DDTHH:mm:ss.000Z'),
      totalPrice: finalPrice,
      paidInCurrency: session.currency,
      latitude: session.latitude,
      longitude: session.longitude,
      location: session.formattedAddress,
      whereDone: '',
      comments: '', //session.notes,
      travelId: session.travelId,
      shortNote: session.notes,
      uploadedFilesIds: session.uploadedFileId ? [session.uploadedFileId] : undefined,
    };

    this.logger.debug(
      `Creating parking expense for session ${session.id}: ` +
      `amount=${finalPrice} ${session.currency || 'N/A'}, car=${session.carId}`,
    );

    const result = await this.getContext().cores.expenseCore.create({ params: expenseParams, requestId: this.getContext().requestId });

    if (result?.code !== OP_RESULT_CODES.OK || !result?.data?.[0]?.id) {
      this.logger.log(
        `Failed to create parking expense for session ${session.id}: ` +
        `code=${result?.code}, errors=${JSON.stringify(result?.errors)}`,
      );
      return null;
    }

    const expenseId = result.data[0].id;

    this.logger.debug(`Created parking expense ${expenseId} for session ${session.id}`);

    return expenseId;
  }
}

export { ParkingSessionCore };