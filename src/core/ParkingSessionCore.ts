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
const PARKING_EXPENSE_KIND_ID = 306;

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
  // Create (Start Parking Session or Create Past Completed Session)
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

    const isCompleted = params.status === PARKING_SESSION_STATUS.COMPLETED;

    // Check for existing active session on this vehicle (only when creating an active session)
    if (!isCompleted) {
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
    }

    // Validate endTime is provided for completed sessions
    if (isCompleted && !params.endTime) {
      this.logger.log('Cannot create a completed parking session without an end time');
      return OpResult.fail(
        OP_RESULT_CODES.VALIDATION_FAILED,
        {},
        'End time is required when creating a completed parking session',
      );
    }

    const now = this.now();

    const newSession: any = {
      ...params,
      accountId,
      startTime: params.startTime || now,
      status: isCompleted ? PARKING_SESSION_STATUS.COMPLETED : PARKING_SESSION_STATUS.ACTIVE,
      startedBy: userId,
      createdBy: userId,
      createdAt: now,
    };

    // Set end fields for completed sessions
    if (isCompleted) {
      newSession.endedBy = userId;
    }

    this.logger.debug(
      `Parking session is ready for creation: car=${newSession.carId}, ` +
      `startTime=${newSession.startTime}, ` +
      `status=${isCompleted ? 'COMPLETED' : 'ACTIVE'}, ` +
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

      // Auto-generate parking expense if session was created as completed with price > 0
      if (created.status === PARKING_SESSION_STATUS.COMPLETED) {
        const price = created.finalPrice ?? created.initialPrice;

        if (price && price > 0) {
          this.logger.debug(
            `Generating parking expense for newly created completed session ${created.id} with price=${price}`,
          );

          try {
            const expenseId = await this.createParkingExpense(created, price);

            if (expenseId) {
              // Link the expense back to the parking session
              await this.getGateways().parkingSessionGw.update(
                { id: created.id, accountId: created.accountId },
                { expenseId },
              );

              created.expenseId = expenseId;

              this.logger.log(
                `Parking expense ${expenseId} was auto-generated for completed session ${created.id}`,
              );
            }
          } catch (err: any) {
            // Log but don't fail the session creation
            this.logger.log(
              `Failed to auto-generate parking expense for session ${created.id}: ${err.message}`,
            );
          }
        } else {
          this.logger.debug(
            `No expense generated for completed parking session ${created.id} (free parking or no price)`,
          );
        }
      }
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Update (Edit Active/Completed Session or End Parking Session)
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

    // Don't allow changing accountId or carId
    const { accountId: _a, carId: _c, ...restParams } = params;

    const now = this.now();

    const updateParams: any = {
      ...restParams,
      updatedBy: userId,
      updatedAt: now,
    };

    // Determine the resulting status after this update
    const resultingStatus = params.status ?? session.status;

    // Validate endTime is provided when the resulting session is completed
    // (either completing an active session or updating an already completed session)
    if (resultingStatus === PARKING_SESSION_STATUS.COMPLETED) {
      const resultingEndTime = params.endTime ?? session.endTime;

      if (!resultingEndTime) {
        this.logger.log(`Parking session ${id} requires end time when status is completed`);
        return OpResult.fail(
          OP_RESULT_CODES.VALIDATION_FAILED,
          {},
          'End time is required for a completed parking session',
        );
      }
    }

    // Handle transition from ACTIVE to COMPLETED
    if (
      session.status === PARKING_SESSION_STATUS.ACTIVE &&
      params.status === PARKING_SESSION_STATUS.COMPLETED
    ) {
      this.logger.debug(`Parking session ${id} is being ended by user ${userId}`);

      updateParams.endTime = params.endTime || now;
      updateParams.endedBy = userId;
    }

    // Store session for afterUpdate expense handling
    const requestId = this.getRequestId();
    this.operationData.set(`update-${requestId}-${id}`, {
      existingSession: session,
    });

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

      const wasActive = existingSession.status === PARKING_SESSION_STATUS.ACTIVE;
      const isNowCompleted = session.status === PARKING_SESSION_STATUS.COMPLETED;
      const wasAlreadyCompleted = existingSession.status === PARKING_SESSION_STATUS.COMPLETED;

      // Case 1: Transitioning from ACTIVE to COMPLETED — create expense if price > 0
      if (wasActive && isNowCompleted) {
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

      // Case 2: Updating an already completed session — sync expense if any mapped field changed
      if (wasAlreadyCompleted && isNowCompleted) {
        const newPrice = session.finalPrice ?? session.initialPrice;
        const hasLinkedExpense = !!session.expenseId;

        if (newPrice && newPrice > 0 && hasLinkedExpense) {
          // Check if any expense-relevant field has changed
          const hasExpenseFieldChanges = this.hasExpenseRelevantChanges(existingSession, session);

          if (hasExpenseFieldChanges) {
            this.logger.debug(
              `Updating linked expense ${session.expenseId} for session ${session.id} ` +
              `due to expense-relevant field changes`,
            );

            try {
              await this.updateParkingExpense(session, newPrice);

              this.logger.log(
                `Parking expense ${session.expenseId} was updated for session ${session.id}`,
              );
            } catch (err: any) {
              this.logger.log(
                `Failed to update parking expense ${session.expenseId} for session ${session.id}: ${err.message}`,
              );
            }
          }
        } else if (newPrice && newPrice > 0 && !hasLinkedExpense) {
          // Price added to a previously free session — create expense
          this.logger.debug(
            `Creating parking expense for session ${session.id} that now has price=${newPrice}`,
          );

          try {
            const expenseId = await this.createParkingExpense(session, newPrice);

            if (expenseId) {
              await this.getGateways().parkingSessionGw.update(
                { id: session.id, accountId: session.accountId },
                { expenseId },
              );

              session.expenseId = expenseId;

              this.logger.log(
                `Parking expense ${expenseId} was created for session ${session.id}`,
              );
            }
          } catch (err: any) {
            this.logger.log(
              `Failed to create parking expense for session ${session.id}: ${err.message}`,
            );
          }
        } else if ((!newPrice || newPrice <= 0) && hasLinkedExpense) {
          // Price removed — remove linked expense
          this.logger.debug(
            `Removing linked expense ${session.expenseId} for session ${session.id} (price set to ${newPrice})`,
          );

          try {
            await this.getContext().cores.expenseCore.remove({
              where: { id: session.expenseId },
              requestId: this.getContext().requestId,
            });

            await this.getGateways().parkingSessionGw.update(
              { id: session.id, accountId: session.accountId },
              { expenseId: null },
            );

            session.expenseId = null;

            this.logger.log(
              `Parking expense was removed for session ${session.id} (price cleared)`,
            );
          } catch (err: any) {
            this.logger.log(
              `Failed to remove parking expense for session ${session.id}: ${err.message}`,
            );
          }
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
  // Expense Field Change Detection
  // ===========================================================================

  /**
   * Mapping of parking session fields to expense fields:
   *
   *   session.startTime        → expense.whenDone
   *   session.finalPrice/initialPrice → expense.totalPrice
   *   session.currency         → expense.paidInCurrency
   *   session.latitude         → expense.latitude
   *   session.longitude        → expense.longitude
   *   session.formattedAddress → expense.location
   *   session.notes            → expense.shortNote
   *   session.travelId         → expense.travelId
   *   session.uploadedFileId   → expense.uploadedFilesIds
   */
  private hasExpenseRelevantChanges(oldSession: any, newSession: any): boolean {
    // Price comparison: use finalPrice ?? initialPrice for both
    const oldPrice = oldSession.finalPrice ?? oldSession.initialPrice ?? 0;
    const newPrice = newSession.finalPrice ?? newSession.initialPrice ?? 0;

    if (oldPrice !== newPrice) return true;

    // Simple field comparisons (null-safe via loose string coercion)
    const fieldsToCompare = [
      'startTime',
      'currency',
      'latitude',
      'longitude',
      'formattedAddress',
      'notes',
      'travelId',
      'uploadedFileId',
    ];

    for (const field of fieldsToCompare) {
      const oldVal = oldSession[field] ?? null;
      const newVal = newSession[field] ?? null;

      if (oldVal === newVal) continue;

      // For date fields, compare formatted UTC strings
      if (field === 'startTime' && oldVal && newVal) {
        const oldFormatted = dayjs(oldVal).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
        const newFormatted = dayjs(newVal).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');

        if (oldFormatted === newFormatted) continue;
      }

      // For numeric fields, compare as numbers
      if ((field === 'latitude' || field === 'longitude') && oldVal != null && newVal != null) {
        if (Number(oldVal) === Number(newVal)) continue;
      }

      return true;
    }

    return false;
  }

  // ===========================================================================
  // Expense Generation/Update Helpers
  // ===========================================================================

  /**
   * Build the expense params object from a parking session.
   */
  private buildExpenseParams(session: any, price: number): any {
    return {
      accountId: this.getContext().accountId,
      carId: session.carId,
      expenseType: EXPENSE_TYPES.EXPENSE,
      kindId: PARKING_EXPENSE_KIND_ID,
      whenDone: dayjs(session.startTime).utc().format('YYYY-MM-DDTHH:mm:ss.000Z'),
      totalPrice: price,
      paidInCurrency: session.currency,
      latitude: session.latitude,
      longitude: session.longitude,
      location: session.formattedAddress,
      whereDone: '',
      comments: '',
      travelId: session.travelId,
      shortNote: session.notes,
      uploadedFilesIds: session.uploadedFileId ? [session.uploadedFileId] : undefined,
    };
  }

  /**
   * Create a parking expense record from a completed parking session.
   *
   * Creates an expense record through the expense core so all expense
   * business logic (stats updates, home currency conversion, etc.) is applied.
   *
   * @returns The created expense ID, or null on failure
   */
  private async createParkingExpense(session: any, finalPrice: number): Promise<string | null> {
    const expenseParams = this.buildExpenseParams(session, finalPrice);

    this.logger.debug(
      `Creating parking expense for session ${session.id}: ` +
      `amount=${finalPrice} ${session.currency || 'N/A'}, car=${session.carId}`,
    );

    const result = await this.getContext().cores.expenseCore.create({
      params: expenseParams,
      requestId: this.getContext().requestId,
    });

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

  /**
   * Update an existing parking expense record linked to a parking session.
   *
   * Updates the expense through the expense core so all expense business
   * logic (stats updates, home currency conversion, etc.) is re-applied.
   */
  private async updateParkingExpense(session: any, newPrice: number): Promise<void> {
    const expenseParams = this.buildExpenseParams(session, newPrice);

    this.logger.debug(
      `Updating parking expense ${session.expenseId} for session ${session.id}: ` +
      `newPrice=${newPrice} ${session.currency || 'N/A'}`,
    );

    const result = await this.getContext().cores.expenseCore.update({
      where: { id: session.expenseId },
      params: expenseParams,
      requestId: this.getContext().requestId,
    });

    if (result?.code !== OP_RESULT_CODES.OK) {
      this.logger.log(
        `Failed to update parking expense ${session.expenseId} for session ${session.id}: ` +
        `code=${result?.code}, errors=${JSON.stringify(result?.errors)}`,
      );
      throw new Error(`Expense update failed with code ${result?.code}`);
    }

    this.logger.debug(`Updated parking expense ${session.expenseId} for session ${session.id}`);
  }
}

export { ParkingSessionCore };