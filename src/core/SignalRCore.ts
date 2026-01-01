import { OP_RESULT_CODES } from '@sdflc/api-helpers';
import { AppSignalRCore } from './AppSignalRCore';
import config from '../config';

/**
 * Core file for Azure SignalR management
 */
class SignalRCore extends AppSignalRCore {
  /**
   * Set or update SignalR connection string
   * Useful when loading connection string from database
   */
  public async setConnectionString(args: any) {
    return this.runAction({
      args: args,
      doAuth: false,
      action: async (args, opt) => {
        const { connectionString } = args || {};

        if (!connectionString) {
          return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'Connection string is required');
        }

        try {
          this.getGateways().signalrGw.setConnectionString(connectionString);
          return this.success({ updated: true });
        } catch (error: any) {
          console.error('Failed to set SignalR connection string:', error);
          return this.failure(OP_RESULT_CODES.EXCEPTION, `Failed to set connection string: ${error.message}`);
        }
      },
      hasTransaction: false,
      doingWhat: 'setting SignalR connection string',
    });
  }

  public async negotiate(args: any) {
    return this.runAction({
      args: args,
      doAuth: false,
      action: async (args, opt) => {
        const { cookies } = this.getContext();
        const activationId = cookies?.activationId;

        if (!activationId) {
          return this.failure(OP_RESULT_CODES.UNAUTHORIZED, 'Missing activationId cookie');
        }

        // Get activation record to validate and get displayId and accountId
        const activationRecord = await this.getGateways().displayActivationGw.get(activationId);

        if (!activationRecord) {
          return this.failure(OP_RESULT_CODES.UNAUTHORIZED, 'Invalid activation');
        }

        const { displayId } = activationRecord;

        if (!displayId) {
          return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'Activation record missing displayId');
        }

        const displayRecord = await this.getGateways().displayGw.get(displayId);

        if (!displayRecord) {
          return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'Display was not found');
        }

        const venueRecord = await this.getGateways().venueGw.get(displayRecord.venueId);

        if (!venueRecord) {
          return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'Venue was not found');
        }

        const { accountId } = venueRecord;

        try {
          // Generate client access token with user identity and groups
          this.getGateways().signalRGw.setConnectionString(config.signalrConnectionString);
          const tokenData = await this.getGateways().signalRGw.generateToken({
            userId: activationId,
            groups: [`display-${displayId}`, `account-${accountId}`, `screen-${activationRecord.id}`],
            expirationTimeInMinutes: 60 * 24, // 24 hours
          });

          return this.success({
            url: tokenData.url,
            accessToken: tokenData.accessToken,
            activationId: activationRecord.id,
            displayId,
            accountId,
          });
        } catch (error: any) {
          console.error('Failed to generate SignalR token:', error);
          return this.failure(OP_RESULT_CODES.EXCEPTION, `Failed to generate connection token: ${error.message}`);
        }
      },
      hasTransaction: false,
      doingWhat: 'negotiating SignalR connection',
    });
  }

  public async sendCommand(args: any) {
    return this.runAction({
      args: args,
      doAuth: false,
      action: async (args, opt) => {
        const { params } = args || {};
        const { command, payload, displayId, activationId } = params || {};
        const { accountId } = this.getContext();

        if (!displayId && !activationId) {
          return this.failure(
            OP_RESULT_CODES.VALIDATION_FAILED,
            'Command destination is missing. Either display or display activation should be provided',
          );
        }

        if (displayId) {
          let displaysIds: string[] = [];

          const displays: any[] = await this.getGateways().displayGw.list({ filter: { id: displaysIds, accountId } });

          if (displays.length) {
            displaysIds.push(...displays.map((display) => display.id));
          }

          if (displaysIds.length == 0) {
            return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'No command recipients found');
          }

          displaysIds = Array.from(new Set(displaysIds));

          // TODO: Make sure the TVs belong to the user

          this.notifyDisplays(displaysIds, { type: command, payload });
        } else if (activationId) {
          console.log('=== search activation', activationId);
          const activations = await this.getGateways().displayActivationGw.list({ filter: { id: activationId } });

          console.log('=== activations', activations);

          this.notifyScreens(
            activations.map((activation) => activation.id),
            { type: command, payload },
          );
        }

        // if (displayActivationId) {
        //   const activations: any[] = await this.getGateways().displayActivationGw.list({
        //     filter: { id: displayActivationId },
        //   });

        //   if (activations.length) {
        //     displaysIds.push(...activations.map((activationActivation) => activationActivation.displayId));
        //   }
        // }

        return this.success(params);

        try {
          // Generate client access token with user identity and groups
        } catch (error: any) {
          console.error('Failed to send command:', error);
          return this.failure(OP_RESULT_CODES.EXCEPTION, `Failed to send command: ${error.message}`);
        }
      },
      hasTransaction: false,
      doingWhat: 'sending command',
    });
  }
}

export { SignalRCore };
