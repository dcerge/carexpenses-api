import { BaseCore, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { UserProfile, USER_ROLES, CAR_STATUSES } from '../boundary';
import { logger } from '../logger';
import { STATUS } from '../database';

/**
 * Options for resolveSavedPlace method
 */
interface ResolveSavedPlaceOptions {
  /** If true, save the record's location as a saved place (create or match existing) */
  savePlace?: boolean;
  /** If true, lookup a saved place by coordinates and copy its address fields into the record */
  lookupSavedPlaceByCoordinates?: boolean;
  /** Place type to assign when creating a new saved place (e.g., 'gas_station', 'service', 'other') */
  placeType?: string;
}

/**
 * Base Core File for the project to be able to add common methods if needed
 */
class AppCore extends BaseCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      logger,
    });
  }

  public now() {
    return new Date();
  }

  // ===========================================================================
  // User Profile Methods
  // ===========================================================================

  /**
   * Get default user profile when no profile exists
   */
  protected getDefaultUserProfile(): UserProfile {
    return {
      id: '',
      accountId: '',
      homeCurrency: 'USD',
      distanceIn: 'km',
      volumeIn: 'l',
      consumptionIn: 'l100km',
      notifyInMileage: 500,
      notifyInDays: 14,
    };
  }

  /**
   * Get user profile by userId, returns default if not found
   */
  protected async getUserProfile(userId: string): Promise<UserProfile> {
    const profile = await this.getGateways().userProfileGw.get(userId);

    if (profile) {
      return profile;
    }

    return this.getDefaultUserProfile();
  }

  /**
   * Get user profile for current context user, returns default if userId is not available
   */
  protected async getCurrentUserProfile(): Promise<UserProfile> {
    const { userId } = this.getContext();

    if (!userId) {
      return this.getDefaultUserProfile();
    }

    return this.getUserProfile(userId);
  }

  // ===========================================================================
  // Vehicle Access Control Methods
  // ===========================================================================

  /**
   * Checks if the current user has DRIVER role (limited access)
   * DRIVER role users can only access cars they are explicitly assigned to
   */
  protected isDriverOrViewerRole(): boolean {
    const { roleId } = this.getContext();

    return roleId
      ? [USER_ROLES.DRIVER, USER_ROLES.VIEWER].includes(roleId)
      : true;
  }

  /**
   * Gets the list of car IDs that the current user (as DRIVER) is assigned to.
   * Returns empty array if user has no assignments or userId is not available.
   */
  protected async getAssignedCarIds(): Promise<string[]> {
    const { userId } = this.getContext();

    if (!userId) {
      return [];
    }

    const userCars = await this.getGateways().userCarGw.list({
      filter: {
        userId,
        status: [CAR_STATUSES.ACTIVE],
      },
    });

    return userCars.map((uc: any) => uc.carId);
  }

  /**
   * Checks if the current user (as DRIVER) has access to a specific car.
   * Returns false if userId or carId is not available.
   */
  protected async hasAccessToCar(carId: string): Promise<boolean> {
    const { userId } = this.getContext();

    if (!userId || !carId) {
      return false;
    }

    const userCars = await this.getGateways().userCarGw.list({
      filter: {
        userId,
        carId,
        status: [CAR_STATUSES.ACTIVE],
      },
    });

    return userCars.length > 0;
  }

  /**
   * Filters an array of car IDs to only include those the current user has access to.
   * For non-DRIVER roles, returns the original array unchanged.
   * For DRIVER role, returns intersection with assigned car IDs.
   *
   * @param carIds Array of car IDs to filter (or undefined/null)
   * @returns Filtered array of accessible car IDs, or null if no restriction needed
   */
  protected async filterAccessibleCarIds(carIds?: string[] | string | null): Promise<string[] | null> {
    if (!this.isDriverOrViewerRole()) {
      // Non-driver users have full access to all account cars
      return carIds ? (Array.isArray(carIds) ? carIds : [carIds]) : null;
    }

    const assignedCarIds = await this.getAssignedCarIds();

    if (assignedCarIds.length === 0) {
      // No assigned cars - return impossible filter
      return ['00000000-0000-0000-0000-000000000000'];
    }

    if (!carIds) {
      // No specific filter requested - use all assigned cars
      return assignedCarIds;
    }

    // Intersect requested IDs with assigned IDs
    const requestedIds = Array.isArray(carIds) ? carIds : [carIds];
    const intersection = requestedIds.filter((id: string) => assignedCarIds.includes(id));

    if (intersection.length === 0) {
      // No intersection - return impossible filter
      return ['00000000-0000-0000-0000-000000000000'];
    }

    return intersection;
  }

  /**
   * Validates that the current user has access to a specific car.
   * For non-DRIVER roles, only checks account ownership.
   * For DRIVER role, also checks user-car assignment.
   *
   * @param car The car object to validate access for
   * @returns true if user has access, false otherwise
   */
  protected async validateCarAccess(car: any): Promise<boolean> {
    if (!car) {
      return false;
    }

    const { accountId } = this.getContext();

    // First check: car must belong to the same account
    if (car.accountId !== accountId) {
      return false;
    }

    // Second check: for DRIVER or VIEWER role, must be assigned to the car
    if (this.isDriverOrViewerRole()) {
      return this.hasAccessToCar(car.id);
    }

    return true;
  }

  /**
   * Batch validates access to multiple cars.
   * Returns a Set of car IDs that the user has access to.
   *
   * @param cars Array of car objects to validate
   * @returns Set of accessible car IDs
   */
  protected async getAccessibleCarIdsFromCars(cars: any[]): Promise<Set<string>> {
    const { accountId } = this.getContext();
    const accessibleIds = new Set<string>();

    // Filter by account first
    const accountCars = cars.filter((car) => car && car.accountId === accountId);

    if (!this.isDriverOrViewerRole()) {
      // Non-driver users have access to all account cars
      for (const car of accountCars) {
        accessibleIds.add(car.id);
      }
      return accessibleIds;
    }

    // For DRIVER role, check assignments
    const assignedCarIds = await this.getAssignedCarIds();
    const assignedSet = new Set(assignedCarIds);

    for (const car of accountCars) {
      if (assignedSet.has(car.id)) {
        accessibleIds.add(car.id);
      }
    }

    return accessibleIds;
  }

  // ===========================================================================
  // Saved Place Methods
  // ===========================================================================

  /**
   * Resolve saved place for a record (expense_base).
   * Handles both `savePlace` and `lookupSavedPlaceByCoordinates` flags.
   *
   * - savePlace=true: Save the record's location as a saved place.
   *   If a nearby place with matching address exists, reuse it; otherwise create a new one.
   * - lookupSavedPlaceByCoordinates=true: Find a nearby saved place and copy its
   *   address fields into the record.
   *
   * Both flags also set savedPlaceId on the record and touch (increment useCount) the place.
   *
   * @param recordData The expense_base record data (mutable - will be modified in place)
   * @param options Configuration flags and placeType
   * @returns The mutated recordData with savedPlaceId set (if a place was resolved)
   */
  protected async resolveSavedPlace(recordData: any, options: ResolveSavedPlaceOptions): Promise<any> {
    if (!recordData) {
      return recordData;
    }

    const { savePlace, lookupSavedPlaceByCoordinates, placeType } = options;

    // Nothing to do if neither flag is set
    if (!savePlace && !lookupSavedPlaceByCoordinates) {
      return recordData;
    }

    // Need coordinates for any saved place operation
    const latitude = recordData.latitude;
    const longitude = recordData.longitude;

    if (latitude == null || longitude == null) {
      return recordData;
    }

    try {
      // Find nearest saved place within proximity
      const nearestPlace = await this.findSavedPlaceByProximity(latitude, longitude);

      if (savePlace) {
        await this.handleSavePlace(recordData, nearestPlace, placeType);
      } else if (lookupSavedPlaceByCoordinates) {
        await this.handleLookupByCoordinates(recordData, nearestPlace);
      }
    } catch (error) {
      // Log but don't fail the main operation
      console.error('Error resolving saved place:', error);
    }

    return recordData;
  }

  /**
   * Handle the savePlace=true flow:
   * - If nearby place found with matching address → touch it, set savedPlaceId
   * - Otherwise → create new saved place, set savedPlaceId
   */
  private async handleSavePlace(recordData: any, nearestPlace: any | null, placeType?: string): Promise<void> {
    if (nearestPlace && this.doesAddressMatch(recordData, nearestPlace)) {
      // Existing place matches — reuse it
      await this.touchSavedPlace(nearestPlace.id);
      recordData.savedPlaceId = nearestPlace.id;
    } else {
      // No match — create a new saved place
      const newPlace = await this.createSavedPlaceFromRecord(recordData, placeType || 'other');

      if (newPlace) {
        recordData.savedPlaceId = newPlace.id;
      }
    }
  }

  /**
   * Handle the lookupSavedPlaceByCoordinates=true flow:
   * - If nearby place found → copy its address fields into the record, touch it
   * - Otherwise → do nothing
   */
  private async handleLookupByCoordinates(recordData: any, nearestPlace: any | null): Promise<void> {
    if (!nearestPlace) {
      return;
    }

    this.applySavedPlaceToRecord(recordData, nearestPlace);
    await this.touchSavedPlace(nearestPlace.id);
  }

  /**
   * Decrement useCount on a saved place.
   *
   * @param savedPlaceId The ID of the saved place
   */
  protected async decrementSavedPlaceUsage(savedPlaceId: string): Promise<void> {
    const { accountId, userId } = this.getContext();

    try {
      await this.getGateways().savedPlaceGw.decrementUsage(savedPlaceId, accountId, userId);
    } catch (error) {
      console.error(`Error decrementing saved place usage ${savedPlaceId}:`, error);
    }
  }

  /**
   * Touch savedPlaceId on record create when resolveSavedPlace was NOT used.
   * Call this after the record's savedPlaceId has been finalized.
   *
   * @param savedPlaceId The saved place ID on the record (may be null/undefined)
   * @param resolvedByFlags Whether resolveSavedPlace already handled this record
   */
  protected async touchSavedPlaceOnCreate(
    savedPlaceId: string | null | undefined,
    resolvedByFlags: boolean,
  ): Promise<void> {
    if (!savedPlaceId || resolvedByFlags) {
      return;
    }

    await this.touchSavedPlace(savedPlaceId);
  }

  /**
   * Sync saved place usage counters on record update.
   * Decrements old place and increments new place as needed.
   *
   * @param oldSavedPlaceId The previous savedPlaceId (before update)
   * @param newSavedPlaceId The new savedPlaceId (after update)
   * @param resolvedByFlags Whether resolveSavedPlace already handled the new place
   */
  protected async syncSavedPlaceUsageOnUpdate(
    oldSavedPlaceId: string | null | undefined,
    newSavedPlaceId: string | null | undefined,
    resolvedByFlags: boolean,
  ): Promise<void> {
    // No change — nothing to do
    if (oldSavedPlaceId === newSavedPlaceId) {
      return;
    }

    // Decrement old place (always, regardless of flags)
    if (oldSavedPlaceId) {
      this.logger.debug(`Decrementing saved place usage for ${oldSavedPlaceId}`);
      await this.decrementSavedPlaceUsage(oldSavedPlaceId);
    }

    // Increment new place (only if flags didn't already handle it)
    if (newSavedPlaceId && !resolvedByFlags) {
      this.logger.debug(`Incrementing saved place usage for ${oldSavedPlaceId}`);
      await this.touchSavedPlace(newSavedPlaceId);
    }
  }

  /**
   * Find the nearest saved place within 150m of the given coordinates.
   * Uses the savedPlaceGw proximity filter (Haversine-based).
   *
   * @param latitude GPS latitude
   * @param longitude GPS longitude
   * @returns The nearest saved place or null if none found
   */
  protected async findSavedPlaceByProximity(latitude: number, longitude: number): Promise<any | null> {
    const { accountId, userId } = this.getContext();

    const items = await this.getGateways().savedPlaceGw.list({
      filter: {
        accountId,
        latitude,
        longitude,
        radiusM: 150,
      },
      params: {
        pagination: {
          pageSize: 5,
        },
      },
    });

    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    // Filter out private places not owned by the current user
    const visibleItems = items.filter((item: any) => {
      if (!item.isPrivate) {
        return true;
      }
      return item.createdBy === userId;
    });

    // Return the first (nearest by gateway's default sorting) visible place
    return visibleItems.length > 0 ? visibleItems[0] : null;
  }

  /**
   * Compare address fields between a record (expense_base) and a saved place.
   * Uses case-insensitive trimmed comparison on key address fields.
   *
   * @param record The expense_base record data
   * @param savedPlace The saved place record
   * @returns true if addresses match
   */
  protected doesAddressMatch(record: any, savedPlace: any): boolean {
    const fieldsToCompare = ['whereDone', 'address1', 'address2', 'city', 'countryId'];

    for (const field of fieldsToCompare) {
      const recordVal = this.normalizeForComparison(record[field]);
      const placeVal = this.normalizeForComparison(savedPlace[field]);

      // Both empty is a match; one empty and one not is a mismatch
      if (recordVal !== placeVal) {
        this.logger.debug(`Address mismatch for ${record[field]} and ${savedPlace[field]}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Normalize a string value for address comparison.
   * Returns lowercase trimmed string, or empty string for null/undefined.
   */
  private normalizeForComparison(value: any): string {
    if (value == null) {
      return '';
    }

    return String(value).trim().toLowerCase();
  }

  /**
   * Create a new saved place from a record's address and location fields.
   *
   * @param recordData The expense_base record data to extract address from
   * @param placeType The type of place (e.g., 'gas_station', 'service', 'other')
   * @returns The created saved place record, or null on failure
   */
  protected async createSavedPlaceFromRecord(recordData: any, placeType: string): Promise<any | null> {
    const { accountId, userId } = this.getContext();

    const name = recordData.whereDone || recordData.location || 'Unnamed Place';

    const newPlace = {
      accountId,
      name,
      normalizedName: name.trim().toLowerCase(),
      whereDone: recordData.whereDone || null,
      //location: recordData.location || null, -- no such field in saved place
      address1: recordData.address1 || null,
      address2: recordData.address2 || null,
      city: recordData.city || null,
      postalCode: recordData.postalCode || null,
      stateProvince: recordData.stateProvince || null,
      country: recordData.country || null,
      countryId: recordData.countryId || null,
      latitude: recordData.latitude,
      longitude: recordData.longitude,
      placeType,
      isPrivate: false,
      radiusM: 150,
      useCount: 1,
      lastUsedAt: this.now(),
      status: STATUS.ACTIVE,
      createdBy: userId,
      createdAt: this.now(),
    };

    try {
      const newPlaces = await this.getGateways().savedPlaceGw.create(newPlace);

      this.logger.debug(`Created saved place ${newPlaces[0].id} from record ${recordData.id}`);

      return newPlaces[0];
    } catch (error) {
      console.error('Error creating saved place from record:', error);
    }

    return null;
  }

  /**
   * Increment useCount and update lastUsedAt on an existing saved place.
   *
   * @param savedPlaceId The ID of the saved place to touch
   */
  protected async touchSavedPlace(savedPlaceId: string): Promise<void> {
    const { accountId, userId } = this.getContext();

    try {
      this.logger.debug(`Touch saved place ${savedPlaceId}`);
      await this.getGateways().savedPlaceGw.touch(savedPlaceId, accountId, userId);
    } catch (error) {
      console.error(`Error touching saved place ${savedPlaceId}:`, error);
    }
  }

  /**
   * Copy address fields from a saved place into a record (expense_base data).
   * Also builds the `location` field from address components and sets savedPlaceId.
   *
   * @param recordData The expense_base record data (mutated in place)
   * @param savedPlace The saved place to copy fields from
   */
  protected applySavedPlaceToRecord(recordData: any, savedPlace: any): void {
    const fieldsToCopy = [
      'whereDone',
      'address1',
      'address2',
      'city',
      'postalCode',
      'stateProvince',
      'country',
      'countryId',
    ];

    for (const field of fieldsToCopy) {
      if (savedPlace[field] != null) {
        recordData[field] = savedPlace[field];
      }
    }

    // Build location string from address components
    const locationParts = [
      savedPlace.address1,
      savedPlace.address2,
      savedPlace.city,
      savedPlace.stateProvince,
      savedPlace.postalCode,
      savedPlace.country,
    ].filter((part) => part != null && String(part).trim() !== '');

    if (locationParts.length > 0) {
      recordData.location = locationParts.join(', ');
    }

    recordData.savedPlaceId = savedPlace.id;
  }

  public getHeaders() {
    const { req } = this.getContext();

    return {
      cookie: req.headers['cookie'],
    };
  }
}

export { AppCore };