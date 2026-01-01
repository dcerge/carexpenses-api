import { WebPubSubServiceClient } from '@azure/web-pubsub';
import config from '../../config';

const HUB_NAME = 'displayHub';

class SignalRGw {
  private serviceClient: WebPubSubServiceClient | null = null;
  private connectionString: string;

  constructor() {
    // Initialize with connection string from config
    this.connectionString = config.azureSignalrConnectionString;
    this.initializeClient();
  }

  /**
   * Initialize or reinitialize the service client
   */
  private initializeClient() {
    if (!this.connectionString) {
      //console.warn('SignalR connection string is not set');
      return;
    }

    this.serviceClient = new WebPubSubServiceClient(this.connectionString, HUB_NAME);
  }

  /**
   * Set or update the connection string
   * @param connectionString Azure SignalR connection string
   */
  public setConnectionString(connectionString: string) {
    if (!connectionString) {
      throw new Error('Connection string cannot be empty');
    }

    this.connectionString = connectionString;
    this.initializeClient();
    console.log('SignalR connection string updated');
  }

  /**
   * Get current connection string (useful for debugging)
   */
  public getConnectionString(): string {
    return this.connectionString;
  }

  /**
   * Check if client is properly initialized
   */
  private ensureClientInitialized() {
    if (!this.serviceClient) {
      throw new Error('SignalR client is not initialized. Please set connection string first.');
    }
  }

  /**
   * Generate client access token for connection negotiation
   * @param args Object containing userId and groups
   * @returns Token URL and access token
   */
  public async generateToken(args: any) {
    this.ensureClientInitialized();

    const { userId, groups, expirationTimeInMinutes = 60 * 24 } = args || {};

    if (!userId) {
      throw new Error('userId is required for token generation');
    }

    const token = await this.serviceClient!.getClientAccessToken({
      userId,
      roles: ['webpubsub.sendToGroup', 'webpubsub.joinLeaveGroup'],
      groups, // Initial groups to join on connection
      expirationTimeInMinutes,
    });

    return {
      url: token.url,
      accessToken: token.token,
    };
  }

  /**
   * Add a user/connection to a group
   * @param args Object containing userId and groupName
   */
  public async addUserToGroup(args: any) {
    this.ensureClientInitialized();

    const { userId, groupName } = args || {};

    if (!userId) {
      throw new Error('userId is required');
    }

    if (!groupName) {
      throw new Error('groupName is required');
    }

    await this.serviceClient!.group(groupName).addUser(userId);
  }

  /**
   * Add a user to multiple groups
   * @param args Object containing userId and groupNames array
   */
  public async addUserToGroups(args: any) {
    this.ensureClientInitialized();

    const { userId, groupNames } = args || {};

    if (!userId) {
      throw new Error('userId is required');
    }

    if (!groupNames || !Array.isArray(groupNames)) {
      throw new Error('groupNames array is required');
    }

    await Promise.all(groupNames.map((groupName) => this.serviceClient!.group(groupName).addUser(userId)));
  }

  /**
   * Send message to a specific group
   * @param args Object containing groupName and message
   */
  public async sendToGroup(args: any) {
    this.ensureClientInitialized();

    const { groupName, message } = args || {};

    if (!groupName) {
      throw new Error('groupName is required');
    }

    //await this.serviceClient!.group(groupName).sendToAll(message);

    await this.serviceClient!.group(groupName).sendToAll({
      dataType: 'json',
      data: message,
    });
  }

  /**
   * Send message to multiple groups
   * @param args Object containing groupNames array and message
   */
  public async sendToGroups(args: any) {
    this.ensureClientInitialized();

    const { groupNames, message } = args || {};

    if (!groupNames || !Array.isArray(groupNames)) {
      throw new Error('groupNames array is required');
    }

    await Promise.all(
      groupNames.map((groupName) =>
        this.serviceClient!.group(groupName).sendToAll({
          dataType: 'json',
          data: message,
        }),
      ),
    );

    //await Promise.all(groupNames.map((groupName) => this.serviceClient!.group(groupName).sendToAll(message)));
  }

  /**
   * Check if a user is connected
   * @param args Object containing userId
   * @returns Boolean indicating if user is connected
   */
  public async isUserConnected(args: any): Promise<boolean> {
    this.ensureClientInitialized();

    const { userId } = args || {};

    if (!userId) {
      throw new Error('userId is required');
    }

    return await this.serviceClient!.userExists(userId);
  }

  /**
   * Close connection for a specific user
   * @param args Object containing userId and optional reason
   */
  public async closeUserConnection(args: any) {
    this.ensureClientInitialized();

    const { userId, reason } = args || {};

    if (!userId) {
      throw new Error('userId is required');
    }

    await this.serviceClient!.closeUserConnections(userId, {
      reason: reason || 'Connection closed by server',
    });
  }
}

export { SignalRGw };
