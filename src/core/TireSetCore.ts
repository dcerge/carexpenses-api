import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { STATUSES } from '@sdflc/utils';

import { AppCore } from './AppCore';
import { validators } from './validators/tireSetValidators';
import { EXPENSE_TYPES, TIRE_CONDITIONS, TIRE_POSITIONS, TIRE_SET_STATUSES } from '../database';
import { USER_ROLES } from '../boundary';

dayjs.extend(utc);

/** Expense kind IDs for tire-related operations */
const TIRE_EXPENSE_KINDS = {
  TIRE_REPAIR_REPLACEMENT: 213,
  SEASONAL_TIRE_SERVICE: 22,
  TIRE_BALANCE: 23,
  TIRE_ROTATION: 24,
} as const;

// ===========================================================================
// Interfaces
// ===========================================================================

interface TireSetItemData {
  id?: string;
  tireSetId?: string;
  accountId?: string;
  expenseId?: string | null;
  brand?: string;
  model?: string;
  tireSize?: string;
  position?: string;
  quantity?: number;
  tireCondition?: string;
  treadDepthInitial?: number | null;
  dotCode?: string | null;
  isRegistered?: boolean;
  notes?: string | null;
  status?: number;
}

/**
 * Result of syncing tire set items.
 * Tracks which items were created, updated, or removed.
 */
interface SyncTireSetItemsResult {
  /** IDs of newly created items */
  createdItemIds: string[];
  /** IDs of updated items */
  updatedItemIds: string[];
  /** IDs of removed (soft-deleted) items */
  removedItemIds: string[];
}

// ===========================================================================
// Core Class
// ===========================================================================

class TireSetCore extends AppCore {
  // ===========================================================================
  // Staging data storage (for before/after hook communication)
  // ===========================================================================
  private stageData: Map<string, any> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'tireSetGw',
      name: 'TireSet',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing tire sets',
        get: 'getting a tire set',
        getMany: 'getting multiple tire sets',
        create: 'creating a tire set',
        createMany: '',
        update: 'updating a tire set',
        updateMany: '',
        set: '',
        remove: 'removing a tire set',
        removeMany: 'removing multiple tire sets',
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
    if (!item) {
      this.logger.debug('processItemOnOut received a null/undefined item, returning as-is');
      return item;
    }

    const dateFields = ['createdAt', 'updatedAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    // Format items if present
    if (Array.isArray(item.items)) {
      item.items = item.items.map((child: any) => this.processItemOnOut(child, opt));
    }

    return item;
  }

  // ===========================================================================
  // Helper: Load tire set with items
  // ===========================================================================

  /**
   * Load a tire set by ID and attach its active items.
   * Returns null if not found or not accessible.
   */
  private async loadTireSetWithItems(id: string, accountId: string | undefined): Promise<any | null> {
    const tireSet = await this.getGateways().tireSetGw.get(id);

    if (!tireSet || tireSet.accountId !== accountId) {
      this.logger.log(
        `Tire set ${id} was not found or does not belong to account ${accountId}`,
      );
      return null;
    }

    const items = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId: id,
        accountId,
      },
    });

    tireSet.items = items || [];

    this.logger.debug(
      `Loaded tire set ${id} with ${tireSet.items.length} item(s)`,
    );

    return tireSet;
  }

  // ===========================================================================
  // Helper: Sync tire set items
  // ===========================================================================

  /**
   * Synchronize tire set items based on the input array.
   * - Items with an `id` that exists: update
   * - Items without `id`: create new
   * - Items with `status: 10000` (REMOVED): soft-delete
   *
   * @param tireSetId - Parent tire set ID
   * @param accountId - Account ID for security
   * @param userId - Current user ID for audit fields
   * @param inputItems - Array of item inputs from the request
   * @returns Object with arrays of created, updated, and removed item IDs
   */
  private async syncTireSetItems(
    tireSetId: string,
    accountId: string | undefined,
    userId: string | undefined,
    inputItems: TireSetItemData[],
  ): Promise<SyncTireSetItemsResult> {
    const now = this.now();
    const result: SyncTireSetItemsResult = {
      createdItemIds: [],
      updatedItemIds: [],
      removedItemIds: [],
    };

    this.logger.debug(
      `Syncing ${inputItems.length} item(s) for tire set ${tireSetId}`,
    );

    // Separate items into groups by operation type
    const itemsToRemove: TireSetItemData[] = [];
    const itemsToUpdate: TireSetItemData[] = [];
    const itemsToCreate: TireSetItemData[] = [];

    for (const inputItem of inputItems) {
      if (inputItem.id) {
        if (inputItem.status === STATUSES.REMOVED) {
          itemsToRemove.push(inputItem);
        } else {
          itemsToUpdate.push(inputItem);
        }
      } else {
        itemsToCreate.push(inputItem);
      }
    }

    // Batch remove
    if (itemsToRemove.length > 0) {
      const removeIds = itemsToRemove.map((item) => item.id!);

      await this.getGateways().tireSetItemGw.removeMany(
        removeIds.map((id) => ({ id, accountId })),
      );

      result.removedItemIds = removeIds;

      this.logger.debug(
        `Batch-removed ${removeIds.length} tire set item(s) from set ${tireSetId}`,
      );
    }

    // Update existing items (per-item where clause required by gateway)
    for (const inputItem of itemsToUpdate) {
      const { id, tireSetId: _, accountId: __, ...updateFields } = inputItem;

      await this.getGateways().tireSetItemGw.update(
        { id: inputItem.id, accountId },
        {
          ...updateFields,
          updatedBy: userId,
          updatedAt: now,
        },
      );

      result.updatedItemIds.push(inputItem.id!);
    }

    if (itemsToUpdate.length > 0) {
      this.logger.debug(
        `Updated ${itemsToUpdate.length} tire set item(s) in set ${tireSetId}`,
      );
    }

    // Batch create
    if (itemsToCreate.length > 0) {
      const newItems = itemsToCreate.map((inputItem) => ({
        accountId,
        tireSetId,
        brand: inputItem.brand,
        model: inputItem.model || null,
        tireSize: inputItem.tireSize,
        position: inputItem.position || TIRE_POSITIONS.ALL,
        quantity: inputItem.quantity,
        tireCondition: inputItem.tireCondition || TIRE_CONDITIONS.NEW,
        treadDepthInitial: inputItem.treadDepthInitial ?? null,
        dotCode: inputItem.dotCode ?? null,
        isRegistered: inputItem.isRegistered ?? false,
        expenseId: inputItem.expenseId ?? null,
        notes: inputItem.notes ?? null,
        status: STATUSES.ACTIVE,
        createdBy: userId,
        createdAt: now,
      }));

      const createdResults = await this.getGateways().tireSetItemGw.createMany(newItems);

      const createdItems = Array.isArray(createdResults) ? createdResults : [createdResults];

      for (const created of createdItems) {
        const createdId = created?.id;
        if (createdId) {
          result.createdItemIds.push(createdId);
        }
      }

      this.logger.debug(
        `Batch-created ${result.createdItemIds.length} tire set item(s) in set ${tireSetId}`,
      );
    }

    this.logger.debug(
      `Sync complete for tire set ${tireSetId}: ` +
      `${result.createdItemIds.length} created, ` +
      `${result.updatedItemIds.length} updated, ` +
      `${result.removedItemIds.length} removed`,
    );

    return result;
  }

  // ===========================================================================
  // Helper: Link expense to tire set items
  // ===========================================================================

  /**
   * Set the expense_id on the given tire set items.
   * Used after creating an expense to link it back to the items it covers.
   *
   * @param itemIds - Item IDs to link
   * @param expenseId - Expense ID to set
   * @param accountId - Account ID for security
   * @param userId - User ID for audit
   */
  private async linkExpenseToItems(
    itemIds: string[],
    expenseId: string,
    accountId: string | undefined,
    userId: string | undefined,
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    const now = this.now();

    for (const itemId of itemIds) {
      await this.getGateways().tireSetItemGw.update(
        { id: itemId, accountId },
        {
          expenseId,
          updatedBy: userId,
          updatedAt: now,
        },
      );
    }

    this.logger.debug(
      `Linked expense ${expenseId} to ${itemIds.length} tire set item(s): [${itemIds.join(', ')}]`,
    );
  }

  // ===========================================================================
  // Helper: Create expense for tire operations
  // ===========================================================================

  /**
   * Create an expense_base + expense record for a tire operation.
   * Links the expense to the tire set via tire_set_id on the expense record.
   *
   * @param tireSetId - Tire set to link the expense to
   * @param carId - Vehicle ID
   * @param accountId - Account ID
   * @param userId - User performing the action
   * @param expenseDetails - ExpenseInput fields
   * @param defaultKindId - Default expense kind if not specified in expenseDetails
   * @returns The created expense ID, or null on failure
   */
  private async createTireExpense(
    tireSetId: string,
    carId: string,
    accountId: string | undefined,
    userId: string | undefined,
    expenseDetails: any,
    defaultKindId: number,
  ): Promise<string | null> {
    const now = this.now();

    this.logger.debug(
      `Building tire expense for tire set ${tireSetId} on vehicle ${carId} with default kind ${defaultKindId}`,
    );

    // Get user's home currency if not specified
    let paidInCurrency = expenseDetails.paidInCurrency;
    let homeCurrency = paidInCurrency;

    if (!paidInCurrency) {
      const userProfile = await this.getCurrentUserProfile();
      paidInCurrency = userProfile?.homeCurrency || 'USD';
      homeCurrency = paidInCurrency;
      this.logger.debug(
        `No currency specified in expense details, resolved to ${paidInCurrency} from user profile`,
      );
    }

    const costWork = parseFloat(expenseDetails.costWork) || 0;
    const costParts = parseFloat(expenseDetails.costParts) || 0;
    const tax = parseFloat(expenseDetails.tax) || 0;
    const fees = parseFloat(expenseDetails.fees) || 0;
    const subtotal = expenseDetails.subtotal != null
      ? parseFloat(expenseDetails.subtotal)
      : costWork + costParts;
    const totalPrice = expenseDetails.totalPrice != null
      ? parseFloat(expenseDetails.totalPrice)
      : subtotal + tax + fees;

    // Create expense_base record
    const expenseBaseResult = await this.getGateways().expenseBaseGw.create({
      accountId,
      userId,
      carId,
      expenseType: EXPENSE_TYPES.EXPENSE,
      odometer: expenseDetails.odometer ?? null,
      whenDone: expenseDetails.whenDone ? new Date(expenseDetails.whenDone) : now,
      location: expenseDetails.location ?? null,
      whereDone: expenseDetails.whereDone ?? null,
      subtototal: subtotal,
      tax,
      fees,
      totalPrice,
      paidInCurrency,
      homeCurrency,
      totalPriceInHc: expenseDetails.totalPriceInHc ?? totalPrice,
      comments: expenseDetails.comments ?? null,
      fuelInTank: expenseDetails.fuelInTank ?? null,
      // Address fields
      address1: expenseDetails.address1 ?? null,
      address2: expenseDetails.address2 ?? null,
      city: expenseDetails.city ?? null,
      postalCode: expenseDetails.postalCode ?? null,
      stateProvince: expenseDetails.stateProvince ?? null,
      country: expenseDetails.country ?? null,
      countryId: expenseDetails.countryId ?? null,
      longitude: expenseDetails.longitude ?? null,
      latitude: expenseDetails.latitude ?? null,
      ownerNumber: 1,
      status: STATUSES.ACTIVE,
      createdBy: userId,
      createdAt: now,
    });

    const expenseBaseId = Array.isArray(expenseBaseResult)
      ? expenseBaseResult[0]?.id
      : expenseBaseResult?.id;

    if (!expenseBaseId) {
      this.logger.error(`Failed to create expense_base for tire set ${tireSetId}`);
      return null;
    }

    // Create expense record (same ID as expense_base)
    await this.getGateways().expenseGw.create({
      id: expenseBaseId,
      kindId: expenseDetails.kindId ?? defaultKindId,
      costWork,
      costParts,
      costWorkHc: expenseDetails.costWorkHc ?? costWork,
      costPartsHc: expenseDetails.costPartsHc ?? costParts,
      shortNote: expenseDetails.shortNote ?? null,
      tireSetId,
    });

    this.logger.debug(
      `Created tire expense ${expenseBaseId} linked to tire set ${tireSetId}`,
    );

    return expenseBaseId;
  }

  // ===========================================================================
  // List
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Restrict to accessible cars for DRIVER role
    const carIdFilter = await this.filterAccessibleCarIds(filter?.carId);

    this.logger.debug(
      `Preparing tire set list query for account ${accountId}`,
    );

    return {
      ...args,
      filter: {
        ...filter,
        accountId,
        ...(carIdFilter ? { carId: carIdFilter } : {}),
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      this.logger.debug('No tire sets were returned from the list query, skipping enrichment');
      return items;
    }

    const { accountId } = this.getContext();

    this.logger.debug(`Enriching ${items.length} tire set(s) with their items`);

    // Batch-load items for all tire sets
    const tireSetIds = items.map((item: any) => item.id);
    const allItems = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId: tireSetIds,
        accountId,
      },
    });

    // Group items by tire set ID
    const itemsBySetId = new Map<string, any[]>();
    for (const item of allItems) {
      const setItems = itemsBySetId.get(item.tireSetId) || [];
      setItems.push(item);
      itemsBySetId.set(item.tireSetId, setItems);
    }

    this.logger.debug(
      `Batch-loaded ${allItems.length} tire set item(s) across ${itemsBySetId.size} set(s)`,
    );

    // Attach items to their tire sets
    return items.map((tireSet: any) => {
      tireSet.items = itemsBySetId.get(tireSet.id) || [];
      return this.processItemOnOut(tireSet, opt);
    });
  }

  // ===========================================================================
  // Get
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      this.logger.debug('Tire set was not found, returning null');
      return item;
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: item.carId, accountId: item.accountId });

    if (!hasAccess) {
      this.logger.log(
        `User does not have access to vehicle ${item.carId} referenced by tire set ${item.id}`,
      );
      return null;
    }

    const { accountId } = this.getContext();

    this.logger.debug(`Enriching tire set ${item.id} with its items`);

    // Load items
    const items = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId: item.id,
        accountId,
      },
    });

    item.items = items || [];

    this.logger.debug(
      `Tire set ${item.id} has ${item.items.length} item(s)`,
    );

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      this.logger.debug('No tire sets were returned from the getMany query, skipping enrichment');
      return items;
    }

    const { accountId } = this.getContext();

    // Filter to items in this account
    const filteredItems = items.filter((item: any) => item && item.accountId === accountId);

    if (filteredItems.length < items.length) {
      this.logger.debug(
        `Excluded ${items.length - filteredItems.length} tire set(s) that belong to other accounts`,
      );
    }

    // Get accessible car IDs
    const carIds = [...new Set(filteredItems.map((item: any) => item.carId))];
    const accessibleCarIds = await this.filterAccessibleCarIds(carIds);
    const accessibleSet = new Set(accessibleCarIds);

    const accessibleItems = filteredItems.filter((item: any) => accessibleSet.has(item.carId));

    if (accessibleItems.length < filteredItems.length) {
      this.logger.debug(
        `Excluded ${filteredItems.length - accessibleItems.length} tire set(s) for vehicles the user cannot access`,
      );
    }

    this.logger.debug(`Enriching ${accessibleItems.length} accessible tire set(s) with their items`);

    // Batch-load items
    const tireSetIds = accessibleItems.map((item: any) => item.id);
    const allItems = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId: tireSetIds,
        accountId,
      },
    });

    const itemsBySetId = new Map<string, any[]>();
    for (const childItem of allItems) {
      const setItems = itemsBySetId.get(childItem.tireSetId) || [];
      setItems.push(childItem);
      itemsBySetId.set(childItem.tireSetId, setItems);
    }

    this.logger.debug(
      `Batch-loaded ${allItems.length} tire set item(s) across ${itemsBySetId.size} set(s)`,
    );

    return accessibleItems.map((tireSet: any) => {
      tireSet.items = itemsBySetId.get(tireSet.id) || [];
      return this.processItemOnOut(tireSet, opt);
    });
  }

  // ===========================================================================
  // Create
  // ===========================================================================

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId, roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with VIEWER role is not allowed to create tire sets`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to create tire sets');
    }

    // Validate car access
    const hasAccess = await this.validateCarAccess({ id: params.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${params.carId}, cannot create tire set`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.NOT_FOUND,
        {},
        'You do not have permission to create tire sets for this vehicle',
      );
    }

    // Enforce single active tire set per vehicle
    if (!params.status || params.status === TIRE_SET_STATUSES.ACTIVE) {
      const existingActiveSets = await this.getGateways().tireSetGw.list({
        filter: {
          carId: params.carId,
          accountId,
          status: TIRE_SET_STATUSES.ACTIVE,
        },
      });

      if (existingActiveSets.length > 0) {
        this.logger.log(
          `Vehicle ${params.carId} already has an active tire set (${existingActiveSets[0].id}), ` +
          `cannot create another active set. Use tire set swap instead.`,
        );
        return OpResult.fail(
          OP_RESULT_CODES.VALIDATION_FAILED,
          {},
          'This vehicle already has an active tire set. Use the swap feature to replace it, or create the new set with a different status (e.g., stored).',
        );
      }
    }

    // Extract items and expense details — they are handled in afterCreate
    const { items, createExpense, expenseDetails, ...restParams } = params;

    const requestId = this.getRequestId();
    const stageKey = `create-${requestId}`;

    this.stageData.set(stageKey, {
      items,
      createExpense,
      expenseDetails,
    });

    const newTireSet = {
      ...restParams,
      accountId,
      userId,
      status: restParams.status || TIRE_SET_STATUSES.ACTIVE,
      quantity: restParams.quantity || 4,
      createdBy: userId,
      createdAt: this.now(),
    };

    this.logger.debug(
      `Tire set data prepared for creation: carId=${params.carId}, status=${newTireSet.status}, stageKey=${stageKey}`,
    );

    return newTireSet;
  }

  public async afterCreate(createdItems: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();
    const stageKey = `create-${requestId}`;
    const stageInfo = this.stageData.get(stageKey);

    for (const tireSet of createdItems) {
      if (!tireSet.id) {
        this.logger.log('Created tire set item has no ID, skipping items sync and expense creation');
        continue;
      }

      if (stageInfo) {
        // Create tire set items
        let syncResult: SyncTireSetItemsResult | null = null;

        if (Array.isArray(stageInfo.items) && stageInfo.items.length > 0) {
          syncResult = await this.syncTireSetItems(tireSet.id, accountId, userId, stageInfo.items);
        } else {
          this.logger.debug(
            `No items provided for newly created tire set ${tireSet.id}, skipping items sync`,
          );
        }

        // Create installation expense if requested
        if (stageInfo.createExpense) {
          try {
            const expenseId = await this.createTireExpense(
              tireSet.id,
              tireSet.carId,
              accountId,
              userId,
              stageInfo.expenseDetails || {},
              TIRE_EXPENSE_KINDS.TIRE_REPAIR_REPLACEMENT,
            );

            if (expenseId) {
              this.logger.debug(
                `Created installation expense ${expenseId} for tire set ${tireSet.id}`,
              );

              // Link newly created items to the expense
              if (syncResult && syncResult.createdItemIds.length > 0) {
                await this.linkExpenseToItems(
                  syncResult.createdItemIds,
                  expenseId,
                  accountId,
                  userId,
                );
              }
            } else {
              this.logger.log(
                `Expense creation returned no ID for tire set ${tireSet.id}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to create installation expense for newly created tire set ${tireSet.id}`,
              error,
            );
          }
        } else {
          this.logger.debug(
            `No expense creation requested for tire set ${tireSet.id}`,
          );
        }

        this.stageData.delete(stageKey);
      } else {
        this.logger.debug(
          `No staged create data found for tire set ${tireSet.id} with stageKey=${stageKey}`,
        );
      }

      // Reload tire set with items for response
      const loaded = await this.loadTireSetWithItems(tireSet.id, accountId);
      if (loaded) {
        Object.assign(tireSet, loaded);
      } else {
        this.logger.log(
          `Failed to reload tire set ${tireSet.id} after creation`,
        );
      }
    }

    return createdItems.map((item: any) => this.processItemOnOut(item, opt));
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
      this.logger.log(`User ${userId} with VIEWER role is not allowed to update tire sets`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to update tire sets');
    }

    // Check if tire set exists and user has access
    const tireSet = await this.getGateways().tireSetGw.get(id);

    if (!tireSet || tireSet.accountId !== accountId) {
      this.logger.log(
        `Tire set ${id} was not found or does not belong to account ${accountId}`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Tire set not found');
    }

    const hasAccess = await this.validateCarAccess({ id: tireSet.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${tireSet.carId} referenced by tire set ${id}`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.NOT_FOUND,
        {},
        'You do not have permission to update this tire set',
      );
    }

    // Enforce single active tire set per vehicle when changing status to active
    if (params.status === TIRE_SET_STATUSES.ACTIVE && tireSet.status !== TIRE_SET_STATUSES.ACTIVE) {
      const existingActiveSets = await this.getGateways().tireSetGw.list({
        filter: {
          carId: tireSet.carId,
          accountId,
          status: TIRE_SET_STATUSES.ACTIVE,
        },
      });

      if (existingActiveSets.length > 0) {
        this.logger.log(
          `Vehicle ${tireSet.carId} already has an active tire set (${existingActiveSets[0].id}), ` +
          `cannot set tire set ${id} to active. Use tire set swap instead.`,
        );
        return OpResult.fail(
          OP_RESULT_CODES.VALIDATION_FAILED,
          {},
          'This vehicle already has an active tire set. Use the swap feature to replace it.',
        );
      }
    }

    // Extract items and expense details for afterUpdate
    const { accountId: _, userId: __, items, createExpense, expenseDetails, ...restParams } = params;

    const requestId = this.getRequestId();
    const stageKey = `update-${requestId}-${id}`;

    this.stageData.set(stageKey, {
      items,
      createExpense,
      expenseDetails,
      carId: tireSet.carId,
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(
      `Tire set ${id} update data prepared with stageKey=${stageKey}`,
    );

    return restParams;
  }

  public async afterUpdate(updatedItems: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();
    const requestId = this.getRequestId();

    for (const tireSet of updatedItems) {
      if (!tireSet.id) {
        this.logger.log('Updated tire set item has no ID, skipping items sync and expense creation');
        continue;
      }

      const stageKey = `update-${requestId}-${tireSet.id}`;
      const stageInfo = this.stageData.get(stageKey);

      if (stageInfo) {
        // Sync tire set items
        let syncResult: SyncTireSetItemsResult | null = null;

        if (Array.isArray(stageInfo.items)) {
          syncResult = await this.syncTireSetItems(tireSet.id, accountId, userId, stageInfo.items);
        } else {
          this.logger.debug(
            `No items provided for tire set ${tireSet.id} update, skipping items sync`,
          );
        }

        // Create expense if requested
        if (stageInfo.createExpense) {
          const carId = stageInfo.carId || tireSet.carId;

          try {
            const expenseId = await this.createTireExpense(
              tireSet.id,
              carId,
              accountId,
              userId,
              stageInfo.expenseDetails || {},
              TIRE_EXPENSE_KINDS.TIRE_REPAIR_REPLACEMENT,
            );

            if (expenseId) {
              this.logger.debug(
                `Created expense ${expenseId} for tire set ${tireSet.id} update`,
              );

              // Link newly created items to the expense.
              // This covers the partial replacement scenario: user removes 2 old
              // tires, adds 2 new ones, and toggles "create expense" — the expense
              // gets linked to the new items via their expense_id field, so we know
              // exactly which tires were purchased in this transaction.
              if (syncResult && syncResult.createdItemIds.length > 0) {
                await this.linkExpenseToItems(
                  syncResult.createdItemIds,
                  expenseId,
                  accountId,
                  userId,
                );

                this.logger.debug(
                  `Linked expense ${expenseId} to ${syncResult.createdItemIds.length} newly added item(s) ` +
                  `in tire set ${tireSet.id}`,
                );
              } else {
                this.logger.debug(
                  `No new items were created during this update of tire set ${tireSet.id}, ` +
                  `expense ${expenseId} is linked at the set level only`,
                );
              }
            } else {
              this.logger.log(
                `Expense creation returned no ID for tire set ${tireSet.id} update`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to create expense while updating tire set ${tireSet.id}`,
              error,
            );
          }
        } else {
          this.logger.debug(
            `No expense creation requested for tire set ${tireSet.id} update`,
          );
        }

        this.stageData.delete(stageKey);
      } else {
        this.logger.debug(
          `No staged update data found for tire set ${tireSet.id} with stageKey=${stageKey}`,
        );
      }

      // Reload tire set with items for response
      const loaded = await this.loadTireSetWithItems(tireSet.id, accountId);
      if (loaded) {
        Object.assign(tireSet, loaded);
      } else {
        this.logger.log(
          `Failed to reload tire set ${tireSet.id} after update`,
        );
      }
    }

    return updatedItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Remove
  // ===========================================================================

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, roleId, userId } = this.getContext();

    if (!id) {
      this.logger.log('Cannot remove tire set because no ID was provided in the request');
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Tire set ID is required');
    }

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with VIEWER role is not allowed to remove tire sets`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove tire sets');
    }

    const tireSet = await this.getGateways().tireSetGw.get(id);

    if (!tireSet || tireSet.accountId !== accountId) {
      this.logger.log(
        `Tire set ${id} was not found or does not belong to account ${accountId}, cannot remove`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Tire set not found');
    }

    const hasAccess = await this.validateCarAccess({ id: tireSet.carId, accountId });

    if (!hasAccess) {
      this.logger.log(
        `User ${userId} does not have access to vehicle ${tireSet.carId} referenced by tire set ${id}, cannot remove`,
      );
      return OpResult.fail(
        OP_RESULT_CODES.NOT_FOUND,
        {},
        'You do not have permission to remove this tire set',
      );
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    this.logger.debug(`Tire set ${id} is ready for removal`);

    return where;
  }

  public async afterRemove(removedItems: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId } = this.getContext();

    // Collect all tire set IDs that were removed
    const tireSetIds = removedItems
      .map((tireSet: any) => tireSet.id)
      .filter(Boolean);

    if (tireSetIds.length === 0) {
      this.logger.debug('No valid tire set IDs in removed items, skipping child cleanup');
      return removedItems.map((item: any) => this.processItemOnOut(item, opt));
    }

    // Batch-load all items belonging to all removed tire sets
    const allItems = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId: tireSetIds,
        accountId,
      },
    });

    if (allItems.length === 0) {
      this.logger.debug(
        `No items found for ${tireSetIds.length} removed tire set(s)`,
      );
    } else {
      // Batch soft-delete all child items
      await this.getGateways().tireSetItemGw.removeMany(
        allItems.map((item: any) => ({ id: item.id, accountId })),
      );

      this.logger.debug(
        `Batch-removed ${allItems.length} item(s) across ${tireSetIds.length} tire set(s)`,
      );
    }

    return removedItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      this.logger.debug('beforeRemoveMany received a non-array where clause, returning as-is');
      return where;
    }

    const { accountId, roleId, userId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      this.logger.log(`User ${userId} with VIEWER role is not allowed to remove tire sets in bulk`);
      return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to remove tire sets');
    }

    // Collect all IDs and batch-fetch tire sets
    const ids = where.map((item: any) => item?.id).filter(Boolean);

    if (ids.length === 0) {
      this.logger.debug('No valid IDs in bulk removal request');
      return [];
    }

    const tireSets = await this.getGateways().tireSetGw.getMany(ids);

    // Build lookup map: id -> tireSet
    const tireSetMap = new Map<string, any>();
    for (const ts of tireSets) {
      if (ts && ts.accountId === accountId) {
        tireSetMap.set(ts.id, ts);
      }
    }

    this.logger.debug(
      `Batch-fetched ${tireSets.length} tire set(s), ${tireSetMap.size} belong to account ${accountId}`,
    );

    // Collect unique car IDs for batch access validation
    const carIds = [...new Set(
      Array.from(tireSetMap.values()).map((ts: any) => ts.carId),
    )];
    const accessibleCarIds = await this.filterAccessibleCarIds(carIds);
    const accessibleCarIdSet = new Set(accessibleCarIds);

    const allowedWhere: any[] = [];

    for (const item of where) {
      const { id } = item || {};
      if (!id) continue;

      const tireSet = tireSetMap.get(id);
      if (!tireSet) {
        this.logger.debug(
          `Tire set ${id} not found or belongs to another account, skipping`,
        );
        continue;
      }

      if (accessibleCarIdSet.has(tireSet.carId)) {
        allowedWhere.push({ ...item, accountId });
      } else {
        this.logger.debug(
          `User does not have access to vehicle ${tireSet.carId} for tire set ${id}, skipping`,
        );
      }
    }

    this.logger.debug(
      `Bulk removal approved for ${allowedWhere.length} out of ${where.length} tire set(s)`,
    );

    return allowedWhere;
  }

  public async afterRemoveMany(removedItems: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // Reuse afterRemove logic for cleaning up items
    return this.afterRemove(removedItems, opt);
  }

  // ===========================================================================
  // Custom Action: Swap Tire Sets
  // ===========================================================================

  /**
   * Swap tire sets on a vehicle: install a stored set, move the current active set to storage.
   *
   * Workflow:
   * 1. Validate both sets belong to the same vehicle and are in correct states
   * 2. Set outgoing set status to 'stored' with optional storage location
   * 3. Set incoming set status to 'active'
   * 4. Optionally create a swap expense linked to the incoming set
   * 5. Return both sets and the expense
   */
  public async swap(args: { params: any }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: true,
      hasTransaction: true,
      doingWhat: 'swapping tire sets',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const params = actionArgs?.params || {};
        const {
          carId,
          installTireSetId,
          storageLocation,
          createExpense,
          expenseDetails,
        } = params;

        const { accountId, userId, roleId } = this.getContext();

        if (roleId === USER_ROLES.VIEWER) {
          this.logger.log(`User ${userId} with VIEWER role is not allowed to swap tire sets`);
          return OpResult.fail(OP_RESULT_CODES.FORBIDDEN, [], 'You do not have permission to swap tire sets');
        }

        // Validate inputs
        if (!carId || !installTireSetId) {
          this.logger.log(
            `Swap request is missing required fields: carId=${carId}, installTireSetId=${installTireSetId}`,
          );
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Vehicle ID and tire set ID to install are required',
          );
        }

        // Validate car access
        const hasAccess = await this.validateCarAccess({ id: carId, accountId });

        if (!hasAccess) {
          this.logger.log(
            `User ${userId} does not have access to vehicle ${carId}, cannot perform tire set swap`,
          );
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Vehicle not found or not accessible');
        }

        // Load the incoming set (to be installed)
        const incomingSet = await this.getGateways().tireSetGw.get(installTireSetId);

        if (!incomingSet || incomingSet.accountId !== accountId) {
          this.logger.log(
            `Tire set ${installTireSetId} to install was not found or does not belong to account ${accountId}`,
          );
          return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Tire set to install not found');
        }

        if (incomingSet.carId !== carId) {
          this.logger.log(
            `Tire set ${installTireSetId} belongs to vehicle ${incomingSet.carId}, not the requested vehicle ${carId}`,
          );
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Tire set to install does not belong to this vehicle',
          );
        }

        if (incomingSet.status === TIRE_SET_STATUSES.ACTIVE) {
          this.logger.log(
            `Tire set ${installTireSetId} is already active on vehicle ${carId}, cannot swap`,
          );
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Tire set is already installed on the vehicle',
          );
        }

        if (incomingSet.status === TIRE_SET_STATUSES.RETIRED) {
          this.logger.log(
            `Tire set ${installTireSetId} is retired and cannot be installed on vehicle ${carId}`,
          );
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Cannot install a retired tire set',
          );
        }

        const now = this.now();

        // Find the currently active set for this vehicle (if any)
        const activeSets = await this.getGateways().tireSetGw.list({
          filter: {
            carId,
            accountId,
            status: TIRE_SET_STATUSES.ACTIVE,
          },
        });

        const outgoingSets: any[] = [];

        if (activeSets.length > 0) {
          if (activeSets.length > 1) {
            this.logger.warn(
              `Vehicle ${carId} has ${activeSets.length} active tire sets — all will be moved to storage`,
            );
          }

          // Move ALL active sets to storage
          for (const activeSet of activeSets) {
            await this.getGateways().tireSetGw.update(
              { id: activeSet.id, accountId },
              {
                status: TIRE_SET_STATUSES.STORED,
                storageLocation: storageLocation ?? activeSet.storageLocation,
                updatedBy: userId,
                updatedAt: now,
              },
            );

            outgoingSets.push(activeSet);

            this.logger.debug(
              `Moved outgoing tire set ${activeSet.id} (${activeSet.name}) to storage`,
            );
          }
        } else {
          this.logger.debug(
            `Vehicle ${carId} has no currently active tire set, only installing the incoming set`,
          );
        }

        // Install the incoming set
        const updIstalledSet = await this.getGateways().tireSetGw.update(
          { id: installTireSetId, accountId },
          {
            status: TIRE_SET_STATUSES.ACTIVE,
            storageLocation: null, // Clear storage location since it's now on the vehicle
            updatedBy: userId,
            updatedAt: now,
          },
        );

        this.logger.debug(
          `Installed tire set ${installTireSetId} (${incomingSet.name}) on vehicle ${carId}`, updIstalledSet
        );

        // Create swap expense if requested
        let swapExpenseId: string | null = null;

        if (createExpense && expenseDetails) {
          try {
            swapExpenseId = await this.createTireExpense(
              installTireSetId,
              carId,
              accountId,
              userId,
              expenseDetails,
              TIRE_EXPENSE_KINDS.SEASONAL_TIRE_SERVICE,
            );

            if (swapExpenseId) {
              this.logger.debug(
                `Created swap expense ${swapExpenseId} for tire set swap on vehicle ${carId}`,
              );
            } else {
              this.logger.log(
                `Swap expense creation returned no ID for tire set swap on vehicle ${carId}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Failed to create swap expense for tire set swap on vehicle ${carId}`,
              error,
            );
          }
        } else {
          this.logger.debug(
            `No expense creation requested for tire set swap on vehicle ${carId}`,
          );
        }

        // Reload both sets with items for the response
        const installedSet = await this.loadTireSetWithItems(installTireSetId, accountId);
        // Load the primary outgoing set (first active) for the response
        const primaryOutgoingSet = outgoingSets.length > 0 ? outgoingSets[0] : null;
        const storedSet = primaryOutgoingSet
          ? await this.loadTireSetWithItems(primaryOutgoingSet.id, accountId)
          : null;

        // Load the swap expense if created
        let swapExpense: any = null;
        if (swapExpenseId) {
          swapExpense = await this.getGateways().expenseBaseGw.get(swapExpenseId);
        }

        const swapData = {
          installedSet: installedSet ? this.processItemOnOut(installedSet, opt) : null,
          storedSet: storedSet ? this.processItemOnOut(storedSet, opt) : null,
          expense: swapExpense || null,
        };

        this.logger.debug(
          `Tire set swap completed on vehicle ${carId}: installed=${installTireSetId}, stored=${outgoingSets.map(outgoingSet => outgoingSet.id).join(', ') || 'none'}, expense=${swapExpenseId || 'none'}`,
        );

        return OpResult.ok([swapData]);
      },
    });
  }
}

export { TireSetCore };