import { BaseCore, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { UserProfile } from '../boundary';

/**
 * Base Core File for the project to be able to add common methods if needed
 */
class AppCore extends BaseCore {
  constructor(props: BaseCorePropsInterface) {
    super(props);
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
}

export { AppCore };
