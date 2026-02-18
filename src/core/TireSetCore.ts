import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { STATUSES } from '@sdflc/utils';

import { AppCore } from './AppCore';
import { validators } from './validators/tireSetValidators';
import { EXPENSE_TYPES, TIRE_CONDITIONS, TIRE_POSITIONS, TIRE_SET_STATUSES, TIRE_WARNING_DEFAULTS, TIRE_WARNING_FLAGS } from '../database';
import { USER_ROLES } from '../boundary';
import { toMetricDistance, fromMetricDistance } from '../utils/unitConversions';

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
  treadDepthCurrent?: number | null;
  dotCode?: string | null;
  isRegistered?: boolean;
  mileageAccumulatedKm?: number | null;
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
  // Date/Time Formatting & Unit Conversion on Output
  // ===========================================================================

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) {
      this.logger.debug('processItemOnOut received a null/undefined item, returning as-is');
      return item;
    }

    const dateFields = ['createdAt', 'updatedAt', 'installedAt', 'storedAt', 'treadDepthMeasuredAt'];

    for (const field of dateFields) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = dayjs(item[field]).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
      }
    }

    // --- mileageWarranty: km → user's distanceIn ---
    if (item.mileageWarrantyKm !== null && item.mileageWarrantyKm !== undefined) {
      const userDistanceIn = this.stageData.get('userDistanceIn') || 'km';
      item.mileageWarranty = fromMetricDistance(Number(item.mileageWarrantyKm), userDistanceIn);
    } else {
      item.mileageWarranty = null;
    }

    // -------------------------------------------------------------------------
    // Convert mileage fields on tire set items (km → car's mileageIn unit)
    // -------------------------------------------------------------------------
    // DB columns:
    //   - mileageAccumulatedKm: frozen historical mileage from past installations
    //   - odometerAtInstallKm: odometer when current installation started
    //
    // Output fields (7 total):
    //   - odometerAtInstall:                car's mileageIn
    //   - mileageAccumulatedPrevious:        car's mileageIn
    //   - mileageAccumulatedPreviousDisplay: user's distanceIn
    //   - mileageSinceInstall:               car's mileageIn  (null if stored)
    //   - mileageSinceInstallDisplay:        user's distanceIn (null if stored)
    //   - mileageTotal:                      car's mileageIn
    //   - mileageTotalDisplay:               user's distanceIn
    // -------------------------------------------------------------------------
    if (item.odometerAtInstallKm !== undefined || item.mileageAccumulatedKm !== undefined) {
      // Resolve car-specific units. For tire set parents, carId is on the item.
      // For tire set items processed as children, carId was set by the parent loop.
      const itemCarId = item.carId || this.stageData.get('currentProcessingCarId');
      const carMileageIn = (itemCarId ? this.stageData.get(`carMileageIn:${itemCarId}`) : null) || 'km';
      const userDistanceIn = this.stageData.get('userDistanceIn') || 'km';
      const currentOdometerKm = itemCarId ? Number(this.stageData.get(`currentOdometerKm:${itemCarId}`) ?? null) : null;
      const carInitialMileageKm = this.stageData.get('initialMileageKm') || 0

      // --- odometerAtInstall: km → car's mileageIn ---
      if (item.odometerAtInstallKm !== null && item.odometerAtInstallKm !== undefined) {
        item.odometerAtInstall = fromMetricDistance(Number(item.odometerAtInstallKm), carMileageIn);
      } else {
        item.odometerAtInstall = null;
      }

      // --- mileageAccumulatedPrevious: frozen historical total ---
      const previousKm = Number(item.mileageAccumulatedKm) || 0;
      item.mileageAccumulatedPrevious = fromMetricDistance(previousKm, carMileageIn);
      item.mileageAccumulatedPreviousDisplay = fromMetricDistance(previousKm, userDistanceIn);

      // --- mileageSinceInstall: live delta (null if not currently installed) ---
      let sinceInstallKm: number | null = null;

      if (
        item.odometerAtInstallKm != null &&
        Number(item.odometerAtInstallKm) > 0 &&
        currentOdometerKm != null &&
        currentOdometerKm > Number(item.odometerAtInstallKm)
      ) {
        sinceInstallKm = currentOdometerKm - Number(item.odometerAtInstallKm);
      } else if (
        item.odometerAtInstallKm != null &&
        Number(item.odometerAtInstallKm) > 0
      ) {
        // Installed but hasn't moved yet (or no current odometer available)
        sinceInstallKm = 0;
      } else if (currentOdometerKm != null && item.tireSetStatus == TIRE_SET_STATUSES.ACTIVE) {
        sinceInstallKm = currentOdometerKm - previousKm;
      }

      if (sinceInstallKm !== null) {
        item.mileageSinceInstall = fromMetricDistance(sinceInstallKm, carMileageIn);
        item.mileageSinceInstallDisplay = fromMetricDistance(sinceInstallKm, userDistanceIn);
      } else {
        // Stored tires: null signals "not applicable"
        item.mileageSinceInstall = null;
        item.mileageSinceInstallDisplay = null;
      }

      // --- mileageTotal: previous + sinceInstall ---
      const totalKm = previousKm + (sinceInstallKm ?? 0);
      item.mileageTotal = fromMetricDistance(totalKm, carMileageIn);
      item.mileageTotalDisplay = fromMetricDistance(totalKm, userDistanceIn);

      this.logger.debug('Tire set item mileage conversion', {
        itemId: item.id,
        itemCarId,
        carMileageIn,
        userDistanceIn,
        currentOdometerKm,
        odometerAtInstallKm: item.odometerAtInstallKm,
        odometerAtInstall: item.odometerAtInstall,
        previousKm,
        sinceInstallKm,
        totalKm,
        mileageAccumulatedPrevious: item.mileageAccumulatedPrevious,
        mileageSinceInstall: item.mileageSinceInstall,
        mileageTotal: item.mileageTotal,
      });
    }

    // Format child items if present — set currentProcessingCarId for children
    if (Array.isArray(item.items)) {
      if (item.carId) {
        this.stageData.set('currentProcessingCarId', item.carId);
      }
      item.items = item.items.map((child: any) => {
        child.tireSetStatus = item.status;
        return this.processItemOnOut(child, opt)
      });
    }

    return item;
  }

  // ===========================================================================
  // Helper: Resolve car's mileageIn unit and user's distanceIn unit
  // ===========================================================================

  /**
   * Load the car's mileageIn unit, the user's distanceIn preference, and the
   * car's current odometer from car_total_summaries, then store them in
   * stageData for processItemOnOut to use.
   *
   * Values are stored keyed by carId so that listing tire sets across multiple
   * vehicles uses the correct units and odometer for each car.
   *
   * The currentOdometerKm is needed to calculate live mileage for tire set
   * items that are currently installed on the vehicle.
   *
   * @param carId - Vehicle ID to look up mileageIn and current odometer
   */
  private async resolveDisplayUnits(carId: string): Promise<{
    carMileageIn: string;
    userDistanceIn: string;
    currentOdometerKm: number | null;
    initialMileageKm: number | null;
  }> {
    // Check if we already resolved units for this car (avoid duplicate lookups
    // when listing tire sets that share the same vehicle)
    const cachedMileageIn = this.stageData.get(`carMileageIn:${carId}`);
    if (cachedMileageIn !== undefined) {
      return {
        carMileageIn: cachedMileageIn,
        userDistanceIn: this.stageData.get('userDistanceIn') || 'km',
        currentOdometerKm: this.stageData.get(`currentOdometerKm:${carId}`) ?? null,
        initialMileageKm: this.stageData.get(`initialMileageKm:${carId}`) ?? null
      };
    }

    let carMileageIn = 'km';
    let userDistanceIn = 'km';
    let currentOdometerKm: number | null = null;
    let initialMileageKm: number | null = null;

    try {
      const car = await this.getGateways().carGw.get(carId);
      if (car?.mileageIn) {
        carMileageIn = car.mileageIn;
      }
      if (car?.initialMileage) {
        initialMileageKm = toMetricDistance(car?.initialMileage, carMileageIn);
      }
    } catch (error) {
      this.logger.debug(`Could not load car ${carId} for mileageIn, defaulting to km`);
    }

    // User's distanceIn is the same regardless of car, resolve once
    if (!this.stageData.has('userDistanceIn')) {
      try {
        const userProfile = await this.getCurrentUserProfile();
        if (userProfile?.distanceIn) {
          userDistanceIn = userProfile.distanceIn;
        }
      } catch (error) {
        this.logger.debug('Could not load user profile for distanceIn, defaulting to km');
      }
      this.stageData.set('userDistanceIn', userDistanceIn);
    } else {
      userDistanceIn = this.stageData.get('userDistanceIn');
    }

    // Fetch current odometer from car_total_summaries for live mileage calculation
    currentOdometerKm = await this.getCarOdometerKm(carId, this.getContext().accountId);

    // Store in stageData keyed by carId
    this.stageData.set(`carMileageIn:${carId}`, carMileageIn);
    this.stageData.set(`currentOdometerKm:${carId}`, currentOdometerKm);
    this.stageData.set(`initialMileageKm:${carId}`, initialMileageKm);

    return { carMileageIn, userDistanceIn, currentOdometerKm, initialMileageKm };
  }

  // ===========================================================================
  // Helper: Get car's current odometer in km
  // ===========================================================================

  /**
   * Get the car's latest known odometer reading in km from car summary stats.
   *
   * @param carId - Vehicle ID
   * @param accountId - Account ID for security
   * @returns Odometer in km, or null if not available
   */
  private async getCarOdometerKm(carId: string, accountId: string | undefined): Promise<number | null> {
    try {
      const summaries = await this.getGateways().carTotalSummaryGw.list({
        filter: { carId, accountId },
      });

      const summary = Array.isArray(summaries) && summaries.length > 0 ? summaries[0] : null;

      return summary.latestKnownMileage; // summary has mileage in km at all times

    } catch (error) {
      this.logger.debug(`Could not load car summary for ${carId} to get current odometer`);
    }

    return null;
  }

  // ===========================================================================
  // Helper: Accumulate mileage on items during swap-out
  // ===========================================================================

  /**
   * Accumulate driven mileage on all active items of a tire set during swap-out.
   * For each item: mileageAccumulatedKm += (swapOdometerKm - odometerAtInstallKm)
   * Then clears odometerAtInstallKm.
   *
   * @param tireSetId - Tire set being moved to storage
   * @param accountId - Account ID
   * @param userId - User ID for audit
   * @param swapOdometerKm - Odometer at time of swap, in km
   */
  private async accumulateMileageOnSwapOut(
    tireSetId: string,
    accountId: string | undefined,
    userId: string | undefined,
    swapOdometerKm: number,
  ): Promise<void> {
    const now = this.now();

    const items = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId,
        accountId,
      },
    });

    if (!items || items.length === 0) {
      this.logger.debug(
        `No items found for tire set ${tireSetId} during swap-out mileage accumulation`,
      );
      return;
    }

    let updatedCount = 0;

    for (const item of items) {
      const installOdometer = parseFloat(item.odometerAtInstallKm) || 0;
      const previousAccumulated = parseFloat(item.mileageAccumulatedKm) || 0;

      // Only accumulate if we have a valid install odometer
      if (installOdometer > 0 && swapOdometerKm > installOdometer) {
        const drivenKm = swapOdometerKm - installOdometer;
        const newAccumulated = previousAccumulated + drivenKm;

        await this.getGateways().tireSetItemGw.update(
          { id: item.id, accountId },
          {
            mileageAccumulatedKm: newAccumulated,
            odometerAtInstallKm: null,
            updatedBy: userId,
            updatedAt: now,
          },
        );

        updatedCount++;

        this.logger.debug(
          `Item ${item.id}: accumulated ${drivenKm.toFixed(1)} km ` +
          `(${previousAccumulated.toFixed(1)} → ${newAccumulated.toFixed(1)} km total), ` +
          `cleared odometerAtInstallKm`,
        );
      } else {
        // Clear install odometer even if we can't calculate mileage
        await this.getGateways().tireSetItemGw.update(
          { id: item.id, accountId },
          {
            odometerAtInstallKm: null,
            updatedBy: userId,
            updatedAt: now,
          },
        );

        this.logger.debug(
          `Item ${item.id}: no valid install odometer (${installOdometer}), ` +
          `cleared odometerAtInstallKm without accumulating`,
        );
      }
    }

    this.logger.debug(
      `Swap-out mileage accumulation complete for tire set ${tireSetId}: ` +
      `${updatedCount} of ${items.length} item(s) had mileage accumulated`,
    );
  }

  // ===========================================================================
  // Helper: Set install odometer on items during swap-in
  // ===========================================================================

  /**
   * Set odometerAtInstallKm on all active items of a tire set during swap-in.
   *
   * @param tireSetId - Tire set being installed
   * @param accountId - Account ID
   * @param userId - User ID for audit
   * @param odometerKm - Odometer at time of installation, in km
   */
  private async setInstallOdometerOnItems(
    tireSetId: string,
    accountId: string | undefined,
    userId: string | undefined,
    odometerKm: number,
  ): Promise<void> {
    const now = this.now();

    const items = await this.getGateways().tireSetItemGw.list({
      filter: {
        tireSetId,
        accountId,
      },
    });

    if (!items || items.length === 0) {
      this.logger.debug(
        `No items found for tire set ${tireSetId} during swap-in odometer assignment`,
      );
      return;
    }

    for (const item of items) {
      await this.getGateways().tireSetItemGw.update(
        { id: item.id, accountId },
        {
          odometerAtInstallKm: odometerKm,
          updatedBy: userId,
          updatedAt: now,
        },
      );
    }

    this.logger.debug(
      `Set odometerAtInstallKm=${odometerKm.toFixed(1)} km on ${items.length} item(s) ` +
      `for tire set ${tireSetId}`,
    );
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
   * @param odometerAtInstallKm - Odometer in km to set on new items (if set is active)
   * @returns Object with arrays of created, updated, and removed item IDs
   */
  private async syncTireSetItems(
    tireSetId: string,
    accountId: string | undefined,
    userId: string | undefined,
    inputItems: TireSetItemData[],
    odometerAtInstallKm?: number | null
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
      const { id, tireSetId: _, accountId: __, mileageAccumulatedKm: ___, ...updateFields } = inputItem;

      // Handle tread depth update: auto-set treadDepthMeasuredAt
      if (inputItem.treadDepthCurrent !== undefined) {
        (updateFields as any).treadDepthMeasuredAt = now;
      }

      if (inputItem.tireCondition === TIRE_CONDITIONS.CAME_WITH_VEHICLE) {
        (updateFields as any).odometerAtInstallKm = null;
      }

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
        treadDepthCurrent: inputItem.treadDepthCurrent ?? null,
        treadDepthMeasuredAt: inputItem.treadDepthCurrent != null ? now : null,
        dotCode: inputItem.dotCode ?? null,
        isRegistered: inputItem.isRegistered ?? false,
        expenseId: inputItem.expenseId ?? null,
        // Mileage fields: mileageAccumulatedKm is already converted to km by
        // the caller (beforeCreate/beforeUpdate). odometerAtInstallKm is set
        // if the parent tire set is active.
        odometerAtInstallKm: inputItem.tireCondition === TIRE_CONDITIONS.CAME_WITH_VEHICLE
          ? null
          : odometerAtInstallKm ?? null,
        mileageAccumulatedKm: inputItem.mileageAccumulatedKm ?? 0,
        notes: inputItem.notes ?? null,
        status: STATUSES.ACTIVE,
        createdBy: userId,
        createdAt: now,
      }));

      const createdResults = await this.getGateways().tireSetItemGw.create(newItems);

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

    // Resolve display units for each unique car in the result set
    const uniqueCarIds = [...new Set(items.map((item: any) => item.carId).filter(Boolean))];
    for (const carId of uniqueCarIds) {
      await this.resolveDisplayUnits(carId as string);
    }

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

    // Resolve display units for conversion
    await this.resolveDisplayUnits(item.carId);

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


    // Resolve display units for each unique car in the result set
    const uniqueCarIds = [...new Set(items.map((item: any) => item.carId).filter(Boolean))];
    for (const carId of uniqueCarIds) {
      await this.resolveDisplayUnits(carId as string);
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

    const isActive = !params.status || params.status === TIRE_SET_STATUSES.ACTIVE;

    // Enforce single active tire set per vehicle
    if (isActive) {
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

    // Resolve car's mileageIn for converting item mileage input
    const car = await this.getGateways().carGw.get(params.carId);
    const carMileageIn = car?.mileageIn || 'km';
    const carInitialMileageKm = toMetricDistance(car?.initialMileage, carMileageIn);

    // Convert mileageAccumulated on items from car's unit to km
    let convertedItems = params.items;
    if (Array.isArray(params.items)) {
      convertedItems = params.items.map((item: TireSetItemData) => {
        if (item.tireCondition === 'came_with_vehicle') {
          return {
            ...item,
            mileageAccumulatedKm: toMetricDistance(item.mileageAccumulatedKm ?? car?.initialMileage, carMileageIn),
          };
        } else if (item.mileageAccumulatedKm != null) {
          return {
            ...item,
            mileageAccumulatedKm: toMetricDistance(item.mileageAccumulatedKm, carMileageIn),
          };
        }

        return item;
      });
    }

    // Get odometer for items if set is active
    let odometerAtInstallKm: number | null = null;
    if (isActive) {
      // Try to get odometer from expense details first, then from car summary
      if (params.expenseDetails?.odometer != null) {
        odometerAtInstallKm = toMetricDistance(params.expenseDetails.odometer, carMileageIn);
      } else {
        odometerAtInstallKm = await this.getCarOdometerKm(params.carId, accountId);
      }
    }

    // Extract items and expense details — they are handled in afterCreate
    const {
      items,
      createExpense,
      expenseDetails,
      mileageWarranty,
      ageLimitYears: _aly,
      treadLimitMm: _tlm,
      ...restParams
    } = params;

    const requestId = this.getRequestId();
    const stageKey = `create-${requestId}`;

    this.stageData.set(stageKey, {
      items: convertedItems,
      createExpense,
      expenseDetails,
      odometerAtInstallKm,
      carInitialMileageKm
    });

    const now = this.now();

    const userProfile = await this.getCurrentUserProfile();
    const userDistanceIn = userProfile?.distanceIn || 'km';

    const newTireSet = {
      ...restParams,
      // Threshold fields (pass through, not destructured away)
      mileageWarrantyKm: params.mileageWarranty != null
        ? toMetricDistance(params.mileageWarranty, userDistanceIn)
        : null,
      ageLimitYears: params.ageLimitYears ?? null,
      treadLimitMm: params.treadLimitMm ?? null,
      // Installation tracking
      installedAt: isActive ? now : null,
      storedAt: params.status === TIRE_SET_STATUSES.STORED ? now : null,
      warningFlags: 0,
      accountId,
      userId,
      status: restParams.status || TIRE_SET_STATUSES.ACTIVE,
      quantity: restParams.quantity || 4,
      createdBy: userId,
      createdAt: now,
    };

    this.logger.debug(
      `Tire set data prepared for creation: carId=${params.carId}, status=${newTireSet.status}, ` +
      `installedAt=${newTireSet.installedAt ? 'set' : 'null'}, ` +
      `odometerAtInstallKm=${odometerAtInstallKm ?? 'null'}, ` +
      `stageKey=${stageKey}`,
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
        // Create tire set items (pass odometerAtInstallKm for active sets)
        let syncResult: SyncTireSetItemsResult | null = null;

        if (Array.isArray(stageInfo.items) && stageInfo.items.length > 0) {
          syncResult = await this.syncTireSetItems(
            tireSet.id,
            accountId,
            userId,
            stageInfo.items,
            stageInfo.odometerAtInstallKm
          );
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

      // Resolve display units and reload tire set with items for response
      await this.resolveDisplayUnits(tireSet.carId);

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

    // Resolve car's mileageIn for converting item mileage input
    const car = await this.getGateways().carGw.get(tireSet.carId);
    const carMileageIn = car?.mileageIn || 'km';
    const userProfile = await this.getCurrentUserProfile();
    const userDistanceIn = userProfile?.distanceIn || 'km';

    // Convert mileageAccumulated on new items from car's unit to km
    let convertedItems = params.items;
    if (Array.isArray(params.items)) {
      convertedItems = params.items.map((item: TireSetItemData) => {
        // Only convert for new items (no id) that have mileageAccumulatedKm set
        if (!item.id && item.mileageAccumulatedKm != null) {
          return {
            ...item,
            mileageAccumulatedKm: toMetricDistance(item.mileageAccumulatedKm, carMileageIn),
          };
        }
        return item;
      });
    }

    // Get odometer for new items if set is active
    let odometerAtInstallKm: number | null = null;
    const isActive = (params.status ?? tireSet.status) === TIRE_SET_STATUSES.ACTIVE;
    if (isActive) {
      odometerAtInstallKm = await this.getCarOdometerKm(tireSet.carId, accountId);
    }

    // Extract items and expense details for afterUpdate
    const { accountId: _, userId: __, items, createExpense, expenseDetails, mileageWarranty, ...restParams } = params;

    const requestId = this.getRequestId();
    const stageKey = `update-${requestId}-${id}`;

    this.stageData.set(stageKey, {
      items: convertedItems,
      createExpense,
      expenseDetails,
      carId: tireSet.carId,
      odometerAtInstallKm,
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    restParams.mileageWarrantyKm = mileageWarranty != null
      ? toMetricDistance(mileageWarranty, userDistanceIn)
      : null;

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
        // Sync tire set items (pass odometerAtInstallKm for new items in active sets)
        let syncResult: SyncTireSetItemsResult | null = null;

        if (Array.isArray(stageInfo.items)) {
          syncResult = await this.syncTireSetItems(
            tireSet.id,
            accountId,
            userId,
            stageInfo.items,
            stageInfo.odometerAtInstallKm,
          );
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

      // Resolve display units and reload tire set with items for response
      const carId = stageInfo?.carId || tireSet.carId;
      await this.resolveDisplayUnits(carId);

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
      await this.getGateways().tireSetItemGw.remove(
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
   * 2. Accumulate mileage on outgoing set items, clear their install odometer
   * 3. Set outgoing set status to 'stored' with storage location and storedAt
   * 4. Set incoming set status to 'active' with installedAt, set install odometer on items
   * 5. Optionally create a swap expense linked to the incoming set
   * 6. Return both sets and the expense
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
          //odometer,
          storageLocation,
          //createExpense,
          expenseDetails, // expenseDetails are required
        } = params;
        const odometer = expenseDetails.odometer; // odometer in car's units
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

        // Resolve car's mileageIn for odometer conversion
        const car = await this.getGateways().carGw.get(carId);
        const carMileageIn = car?.mileageIn || 'km';

        // Convert odometer from car's unit to km
        const swapOdometerKm = odometer != null
          ? toMetricDistance(odometer, carMileageIn)
          : await this.getCarOdometerKm(carId, accountId);

        if (swapOdometerKm == null) {
          this.logger.log(
            `No odometer available for tire set swap on vehicle ${carId}. ` +
            `Provide odometer in the swap request or ensure the car has recorded mileage.`,
          );
          return OpResult.fail(
            OP_RESULT_CODES.VALIDATION_FAILED,
            {},
            'Odometer reading is required for tire set swap to track mileage accurately',
          );
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
            // Accumulate mileage on items before storing
            await this.accumulateMileageOnSwapOut(
              activeSet.id,
              accountId,
              userId,
              swapOdometerKm,
            );

            // Update the tire set itself
            await this.getGateways().tireSetGw.update(
              { id: activeSet.id, accountId },
              {
                status: TIRE_SET_STATUSES.STORED,
                storageLocation: storageLocation ?? activeSet.storageLocation,
                storedAt: now,
                updatedBy: userId,
                updatedAt: now,
              },
            );

            outgoingSets.push(activeSet);

            this.logger.debug(
              `Moved outgoing tire set ${activeSet.id} (${activeSet.name}) to storage, ` +
              `mileage accumulated at odometer ${swapOdometerKm.toFixed(1)} km`,
            );
          }
        } else {
          this.logger.debug(
            `Vehicle ${carId} has no currently active tire set, only installing the incoming set`,
          );
        }

        // Install the incoming set
        await this.getGateways().tireSetGw.update(
          { id: installTireSetId, accountId },
          {
            status: TIRE_SET_STATUSES.ACTIVE,
            storageLocation: null,
            installedAt: now,
            storedAt: null,
            updatedBy: userId,
            updatedAt: now,
          },
        );

        // Set install odometer on incoming set items
        await this.setInstallOdometerOnItems(
          installTireSetId,
          accountId,
          userId,
          swapOdometerKm,
        );

        this.logger.debug(
          `Installed tire set ${installTireSetId} (${incomingSet.name}) on vehicle ${carId} ` +
          `at odometer ${swapOdometerKm.toFixed(1)} km`,
        );

        // Create swap expense if requested
        let swapExpenseId: string | null = null;

        if (expenseDetails) {
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

        // Resolve display units for the response
        await this.resolveDisplayUnits(carId);

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
          `Tire set swap completed on vehicle ${carId}: ` +
          `installed=${installTireSetId}, ` +
          `stored=${outgoingSets.map(s => s.id).join(', ') || 'none'}, ` +
          `odometer=${swapOdometerKm.toFixed(1)} km, ` +
          `expense=${swapExpenseId || 'none'}`,
        );

        return OpResult.ok([swapData]);
      },
    });
  }

  // ===========================================================================
  // Warning Flags: DOT Code Parsing
  // ===========================================================================

  /**
   * Parse a DOT manufacturing date code and return the manufacture date.
   * DOT codes are 4-digit strings: first 2 digits = week, last 2 digits = year.
   * Example: "2319" = week 23 of 2019.
   *
   * @param dotCode - Raw DOT code string (e.g., "2319", "0521")
   * @returns Manufacture date as a dayjs object, or null if unparseable
   */
  private parseDotCode(dotCode: string | null | undefined): dayjs.Dayjs | null {
    if (!dotCode || typeof dotCode !== 'string') {
      return null;
    }

    // Strip whitespace and any non-digit characters
    const cleaned = dotCode.replace(/\D/g, '');

    if (cleaned.length !== 4) {
      this.logger.debug(`DOT code "${dotCode}" is not 4 digits after cleaning ("${cleaned}"), skipping`);
      return null;
    }

    const week = parseInt(cleaned.substring(0, 2), 10);
    const year = parseInt(cleaned.substring(2, 4), 10);

    // Validate ranges: week 1-53, year 0-99
    if (week < 1 || week > 53 || isNaN(week) || isNaN(year)) {
      this.logger.debug(`DOT code "${dotCode}" has invalid week (${week}) or year (${year}), skipping`);
      return null;
    }

    // Convert 2-digit year to 4-digit year.
    // DOT codes use 2-digit years. Tires manufactured after 2000 are the norm,
    // but we handle 90-99 as 1990s for very old tires.
    const fullYear = year >= 90 ? 1900 + year : 2000 + year;

    // Convert week number to approximate date (start of that week)
    // dayjs doesn't have native ISO week support, so we calculate manually:
    // Jan 1 + (week - 1) * 7 days
    const manufactureDate = dayjs.utc(`${fullYear}-01-01`).add((week - 1) * 7, 'day');

    // Sanity check: date should not be in the future
    if (manufactureDate.isAfter(dayjs.utc())) {
      this.logger.debug(`DOT code "${dotCode}" resolves to future date ${manufactureDate.format('YYYY-MM-DD')}, skipping`);
      return null;
    }

    return manufactureDate;
  }

  // ===========================================================================
  // Warning Flags: Item-Level Flag Computation
  // ===========================================================================

  /**
   * Compute warning flags for a single tire set item.
   *
   * @param item - Tire set item record from DB
   * @param tireSet - Parent tire set record
   * @param currentOdometerKm - Current car odometer in km (null if unavailable)
   * @param now - Current timestamp
   * @returns Computed warning flags bitmask
   */
  private computeItemWarningFlags(
    item: any,
    tireSet: any,
    currentOdometerKm: number | null,
    now: dayjs.Dayjs,
  ): number {
    let flags = 0;

    // -----------------------------------------------------------------------
    // AGE warnings (from DOT code)
    // -----------------------------------------------------------------------
    const manufactureDate = this.parseDotCode(item.dotCode);

    if (manufactureDate) {
      const ageLimitYears = tireSet.ageLimitYears ?? TIRE_WARNING_DEFAULTS.ageLimitYears;
      const ageYears = now.diff(manufactureDate, 'year', true);

      if (ageYears >= ageLimitYears) {
        flags |= TIRE_WARNING_FLAGS.AGE_CRITICAL;
      } else if (ageYears >= ageLimitYears * TIRE_WARNING_DEFAULTS.warningRatio) {
        flags |= TIRE_WARNING_FLAGS.AGE_WARNING;
      }
    }

    // -----------------------------------------------------------------------
    // MILEAGE warnings
    // -----------------------------------------------------------------------
    const mileageWarrantyKm = parseFloat(tireSet.mileageWarrantyKm) || TIRE_WARNING_DEFAULTS.mileageWarrantyKm;
    const accumulatedKm = parseFloat(item.mileageAccumulatedKm) || 0;
    const installOdometerKm = parseFloat(item.odometerAtInstallKm) || 0;

    let totalMileageKm = accumulatedKm;

    // If item is currently installed (has install odometer) and we have current odometer
    if (installOdometerKm > 0 && currentOdometerKm != null && currentOdometerKm > installOdometerKm) {
      totalMileageKm += (currentOdometerKm - installOdometerKm);
    }

    if (totalMileageKm >= mileageWarrantyKm) {
      flags |= TIRE_WARNING_FLAGS.MILEAGE_CRITICAL;
    } else if (totalMileageKm >= mileageWarrantyKm * TIRE_WARNING_DEFAULTS.warningRatio) {
      flags |= TIRE_WARNING_FLAGS.MILEAGE_WARNING;
    }

    // -----------------------------------------------------------------------
    // TREAD warnings
    // -----------------------------------------------------------------------
    const treadCurrent = item.treadDepthCurrent != null ? parseFloat(item.treadDepthCurrent) : null;

    if (treadCurrent != null) {
      const treadLimitMm = parseFloat(tireSet.treadLimitMm) || TIRE_WARNING_DEFAULTS.treadLimitMm;

      if (treadCurrent <= treadLimitMm) {
        flags |= TIRE_WARNING_FLAGS.TREAD_CRITICAL;
      } else if (treadCurrent <= treadLimitMm * TIRE_WARNING_DEFAULTS.treadWarningMultiplier) {
        flags |= TIRE_WARNING_FLAGS.TREAD_WARNING;
      }

      // TREAD_STALE: measurement exists but is old
      if (item.treadDepthMeasuredAt) {
        const measurementAgeMonths = now.diff(dayjs.utc(item.treadDepthMeasuredAt), 'month', true);

        if (measurementAgeMonths >= TIRE_WARNING_DEFAULTS.treadStaleMonths) {
          flags |= TIRE_WARNING_FLAGS.TREAD_STALE;
        }
      } else {
        // Has tread value but no measurement date — treat as stale
        flags |= TIRE_WARNING_FLAGS.TREAD_STALE;
      }
    }

    return flags;
  }

  // ===========================================================================
  // Warning Flags: Set-Level Flag Computation
  // ===========================================================================

  /**
   * Compute set-level warning flags (flags that apply to the set as a whole,
   * not derived from individual items).
   *
   * @param tireSet - Tire set record from DB
   * @param now - Current timestamp
   * @returns Set-level warning flags bitmask (SEASONAL_MISMATCH, STORAGE_LONG)
   */
  private computeSetLevelFlags(tireSet: any, now: dayjs.Dayjs): number {
    let flags = 0;

    // -----------------------------------------------------------------------
    // STORAGE_LONG: stored set sitting too long
    // -----------------------------------------------------------------------
    if (
      tireSet.status === TIRE_SET_STATUSES.STORED &&
      tireSet.storedAt
    ) {
      const storedMonths = now.diff(dayjs.utc(tireSet.storedAt), 'month', true);

      if (storedMonths >= TIRE_WARNING_DEFAULTS.storageWarningMonths) {
        flags |= TIRE_WARNING_FLAGS.STORAGE_LONG;
      }
    }

    // -----------------------------------------------------------------------
    // SEASONAL_MISMATCH: tire type vs current season
    // -----------------------------------------------------------------------
    // TODO: Implement seasonal mismatch detection.
    // Requirements:
    // - Determine the user's hemisphere (Northern vs Southern) based on their
    //   profile location or a dedicated account/user setting.
    // - Define season boundaries per hemisphere:
    //   Northern: winter = Nov-Mar, summer = May-Sep, transition = Apr, Oct
    //   Southern: winter = May-Sep, summer = Nov-Mar, transition = Apr, Oct
    // - Flag SEASONAL_MISMATCH when:
    //   - Summer tires are active during winter months
    //   - Winter tires are active during summer months
    //   - all_season / all_weather / performance / off_road are never flagged
    // - Only applies to ACTIVE sets (not stored).
    // - Consider making transition months configurable or simply not flagging
    //   during transition periods to avoid false positives.
    // - Will need access to user profile or car location to resolve hemisphere.

    return flags;
  }

  // ===========================================================================
  // Warning Flags: Process a Single Account
  // ===========================================================================

  /**
   * Process all tire sets for a single account: compute and update warning flags
   * on both items and sets.
   *
   * @param accountId - Account to process
   * @param now - Current timestamp
   * @returns Processing stats for this account
   */
  private async processAccountWarningFlags(
    accountId: string,
    now: dayjs.Dayjs,
  ): Promise<{
    setsProcessed: number;
    itemsProcessed: number;
    setsUpdated: number;
    itemsUpdated: number;
  }> {
    const stats = {
      setsProcessed: 0,
      itemsProcessed: 0,
      setsUpdated: 0,
      itemsUpdated: 0,
    };

    // Load all non-deleted tire sets for this account (ACTIVE + STORED)
    const tireSets = await this.getGateways().tireSetGw.list({
      filter: {
        accountId,
        status: [TIRE_SET_STATUSES.ACTIVE, TIRE_SET_STATUSES.STORED],
      },
    });

    if (!tireSets || tireSets.length === 0) {
      return stats;
    }

    // Collect unique car IDs and batch-fetch odometers
    const carIds = [...new Set(tireSets.map((ts: any) => ts.carId).filter(Boolean))] as string[];

    const odometerMap = await this.getGateways().carTotalSummaryGw.getMaxMileageByCarIds(
      carIds,
      accountId,
    );

    // Batch-load all items for all tire sets in this account
    const tireSetIds = tireSets.map((ts: any) => ts.id);

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

    // Process each tire set
    for (const tireSet of tireSets) {
      stats.setsProcessed++;

      const currentOdometerKm = odometerMap.get(tireSet.carId) ?? null;
      const items = itemsBySetId.get(tireSet.id) || [];

      // Compute item-level flags and collect for set-level OR
      let combinedItemFlags = 0;

      for (const item of items) {
        stats.itemsProcessed++;

        const computedFlags = this.computeItemWarningFlags(item, tireSet, currentOdometerKm, now);
        combinedItemFlags |= computedFlags;

        // Update item only if flags changed
        const currentFlags = parseInt(item.warningFlags) || 0;

        if (computedFlags !== currentFlags) {
          await this.getGateways().tireSetItemGw.update(
            { id: item.id, accountId },
            { warningFlags: computedFlags },
          );

          stats.itemsUpdated++;
        }
      }

      // Compute set-level flags and OR with combined item flags
      const setLevelFlags = this.computeSetLevelFlags(tireSet, now);
      const computedSetFlags = combinedItemFlags | setLevelFlags;

      // Update set only if flags changed
      const currentSetFlags = parseInt(tireSet.warningFlags) || 0;

      if (computedSetFlags !== currentSetFlags) {
        await this.getGateways().tireSetGw.update(
          { id: tireSet.id, accountId },
          { warningFlags: computedSetFlags },
        );

        stats.setsUpdated++;
      }
    }

    return stats;
  }

  // ===========================================================================
  // Warning Flags: Main Entry Point (called from CLI)
  // ===========================================================================

  /**
   * Compute and update warning flags for all tire sets and items across all accounts.
   * Designed to be called by a daily cron job via CLI.
   *
   * Processes accounts in batches. Safe to run multiple times — only writes to DB
   * when flags have actually changed (idempotent).
   *
   * Warning flags computed:
   * - Item-level: AGE_WARNING, AGE_CRITICAL, MILEAGE_WARNING, MILEAGE_CRITICAL,
   *   TREAD_WARNING, TREAD_CRITICAL, TREAD_STALE
   * - Set-level: STORAGE_LONG (+ bitwise OR of all item flags)
   * - TODO: SEASONAL_MISMATCH
   *
   * @param args.batchSize - Number of accounts between progress log entries (default: 50)
   * @returns Summary of processing results
   */
  public async computeWarningFlags(args?: {
    batchSize?: number;
  }): Promise<OpResult> {
    return this.runAction({
      args,
      doAuth: false,
      hasTransaction: false,
      doingWhat: 'computing tire warning flags',
      action: async (actionArgs: any, opt: BaseCoreActionsInterface) => {
        const batchSize = actionArgs?.batchSize ?? 50;
        const now = dayjs.utc();

        let totalAccountsProcessed = 0;
        let totalSetsProcessed = 0;
        let totalItemsProcessed = 0;
        let totalSetsUpdated = 0;
        let totalItemsUpdated = 0;
        let errorCount = 0;
        const errors: Array<{ accountId: string; error: string }> = [];

        this.logger.log(
          `[TireSetCore] Starting warning flags computation at ${now.toISOString()}`,
        );

        // Get all accounts that have tire sets in ACTIVE or STORED status
        const accountIds = await this.getGateways().tireSetGw.getDistinctAccountIds([
          TIRE_SET_STATUSES.ACTIVE,
          TIRE_SET_STATUSES.STORED,
        ]);

        this.logger.log(
          `[TireSetCore] Found ${accountIds.length} account(s) with active/stored tire sets`,
        );

        for (let i = 0; i < accountIds.length; i++) {
          const accountId = accountIds[i];

          try {
            const accountStats = await this.processAccountWarningFlags(accountId, now);

            totalAccountsProcessed++;
            totalSetsProcessed += accountStats.setsProcessed;
            totalItemsProcessed += accountStats.itemsProcessed;
            totalSetsUpdated += accountStats.setsUpdated;
            totalItemsUpdated += accountStats.itemsUpdated;
          } catch (error: any) {
            errorCount++;
            errors.push({
              accountId,
              error: error.message || 'Unknown error',
            });

            this.logger.error(
              `[TireSetCore] Failed to process warning flags for account ${accountId}:`,
              error,
            );
          }

          // Log progress every batchSize accounts
          if ((i + 1) % batchSize === 0) {
            this.logger.log(
              `[TireSetCore] Progress: ${i + 1}/${accountIds.length} accounts processed, ` +
              `${totalSetsUpdated} sets updated, ${totalItemsUpdated} items updated`,
            );
          }
        }

        const summary = {
          processedAt: now.toISOString(),
          accountsProcessed: totalAccountsProcessed,
          setsProcessed: totalSetsProcessed,
          itemsProcessed: totalItemsProcessed,
          setsUpdated: totalSetsUpdated,
          itemsUpdated: totalItemsUpdated,
          errorCount,
          errors: errors.slice(0, 50),
        };

        this.logger.log(`[TireSetCore] Warning flags computation complete:`, {
          accountsProcessed: totalAccountsProcessed,
          setsProcessed: totalSetsProcessed,
          itemsProcessed: totalItemsProcessed,
          setsUpdated: totalSetsUpdated,
          itemsUpdated: totalItemsUpdated,
          errorCount,
        });

        return OpResult.ok([summary]);
      },
    });
  }
}

export { TireSetCore };