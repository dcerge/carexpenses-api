import { BaseCorePropsInterface } from '@sdflc/backend-helpers';
import { AppCore } from './AppCore';
import config from '../config';

/**
 * Base Core File for the project to be able to add commong methods if needed
 */
class AppSignalRCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super(props);
  }

  /**
   * Send update notification to specific display
   */
  public async notifyDisplay(displayId: string, message: any = {}) {
    try {
      await this.getGateways().signalRGw.sendToGroup({
        groupName: `display-${displayId}`,
        message: {
          type: 'dataUpdated',
          timestamp: new Date().toISOString(),
          ...message,
        },
      });
      console.log(`Notification sent to display: ${displayId}`);
    } catch (error: any) {
      console.error(`Failed to notify display ${displayId}:`, error);
      throw error;
    }
  }

  /**
   * Send update notification to all displays in an account
   */
  public async notifyAccount(accountId: string, message: any = {}) {
    try {
      await this.getGateways().signalRGw.sendToGroup({
        groupName: `account-${accountId}`,
        message: {
          type: 'dataUpdated',
          timestamp: new Date().toISOString(),
          ...message,
        },
      });
      console.log(`Notification sent to account: ${accountId}`);
    } catch (error: any) {
      console.error(`Failed to notify account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Send update notification to multiple displays
   */
  public async notifyDisplays(displayIds: string[], message: any = {}) {
    try {
      if (!Array.isArray(displayIds) || displayIds.length == 0) {
        return;
      }

      this.getGateways().signalRGw.setConnectionString(config.signalrConnectionString);

      const uniqueDisplaysIds = Array.from(new Set(displayIds));

      const groupNames = uniqueDisplaysIds.map((displayId) => `display-${displayId}`);

      await this.getGateways().signalRGw.sendToGroups({
        groupNames,
        message: {
          type: 'dataUpdated',
          timestamp: new Date().toISOString(),
          ...message,
        },
      });

      console.log(`Notification sent to ${uniqueDisplaysIds.length} displays`, {
        groupNames,
        message: {
          type: 'dataUpdated',
          timestamp: new Date().toISOString(),
          ...message,
        },
      });
    } catch (error: any) {
      console.error('Failed to notify multiple displays:', error);
      throw error;
    }
  }

  public async notifyScreens(activationIds: string[], message: any = {}) {
    try {
      if (!Array.isArray(activationIds) || activationIds.length == 0) {
        return;
      }

      this.getGateways().signalRGw.setConnectionString(config.signalrConnectionString);

      const uniqueIds = Array.from(new Set(activationIds));

      const groupNames = uniqueIds.map((id) => `screen-${id}`);

      await this.getGateways().signalRGw.sendToGroups({
        groupNames,
        message: {
          type: 'dataUpdated',
          timestamp: new Date().toISOString(),
          ...message,
        },
      });

      console.log(`Notification sent to ${uniqueIds.length} screens`, {
        groupNames,
        message: {
          type: 'dataUpdated',
          timestamp: new Date().toISOString(),
          ...message,
        },
      });
    } catch (error: any) {
      console.error('Failed to notify multiple displays:', error);
      throw error;
    }
  }

  /**
   * Check if a specific user/TV is connected
   */
  public async isDisplayConnected(activationId: string): Promise<boolean> {
    try {
      return await this.getGateways().signalRGw.isUserConnected({
        userId: activationId,
      });
    } catch (error: any) {
      console.error(`Failed to check connection for ${activationId}:`, error);
      return false;
    }
  }

  /**
   * Force disconnect a specific display
   */
  public async disconnectDisplay(activationId: string, reason?: string) {
    try {
      await this.getGateways().signalRGw.closeUserConnection({
        userId: activationId,
        reason: reason || 'Disconnected by administrator',
      });
      console.log(`Display ${activationId} disconnected`);
    } catch (error: any) {
      console.error(`Failed to disconnect display ${activationId}:`, error);
      throw error;
    }
  }
}

export { AppSignalRCore };
