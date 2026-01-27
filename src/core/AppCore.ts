// ./src/core/AppCore.ts
import { BaseCore, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { UserProfile, USER_ROLES, CAR_STATUSES } from '../boundary';
import { logger } from '../logger';

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
  protected isDriverRole(): boolean {
    const { roleId } = this.getContext();
    return roleId === USER_ROLES.DRIVER;
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
    if (!this.isDriverRole()) {
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

    // Second check: for DRIVER role, must be assigned to the car
    if (this.isDriverRole()) {
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

    if (!this.isDriverRole()) {
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
}

export { AppCore };