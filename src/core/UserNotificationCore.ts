// ./src/core/UserNotificationCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/userNotificationValidators';

dayjs.extend(utc);

class UserNotificationCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'userNotificationGw',
      name: 'UserNotification',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing user notifications',
        get: 'getting a user notification',
        getMany: 'getting multiple user notifications',
        create: '',
        createMany: '',
        update: '',
        updateMany: '',
        set: '',
        remove: '',
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

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.readAt !== null && item.readAt !== undefined) {
      item.readAt = dayjs(item.readAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId, userId } = this.getContext();

    // Filter by accountId and userId for security
    // User can only see their own notifications
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
        userId,
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    const { accountId, userId } = this.getContext();

    // Security check: verify the notification belongs to the current user
    if (item.accountId !== accountId || item.userId !== userId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId, userId } = this.getContext();

    // Filter items to only include those belonging to the current user
    const filteredItems = items.filter((item) => item && item.accountId === accountId && item.userId === userId);

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args, opt) => {
        const { id } = args || {};
        const { accountId, userId } = this.getContext();

        if (!id) {
          return this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'Notification ID is required');
        }

        // Get the notification
        const notification = await this.getGateways().userNotificationGw.get(id);

        if (!notification) {
          return this.failure(OP_RESULT_CODES.NOT_FOUND, 'Notification not found');
        }

        // Security check: verify the notification belongs to the current user
        if (notification.accountId !== accountId || notification.userId !== userId) {
          return this.failure(OP_RESULT_CODES.NOT_FOUND, 'Notification not found');
        }

        // Already read
        if (notification.readAt) {
          return this.success([this.processItemOnOut(notification, opt)]);
        }

        // Mark as read
        const updatedNotifications = await this.getGateways().userNotificationGw.update(
          { id, accountId, userId },
          { readAt: this.now() },
        );

        return this.success(updatedNotifications.map((item: any) => this.processItemOnOut(item, opt)));
      },
      hasTransaction: false,
      doingWhat: 'marking notification as read',
    });
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args, opt) => {
        const { accountId, userId } = this.getContext();

        // Get all unread notifications for the user
        const unreadResult = await this.getGateways().userNotificationGw.list({
          filter: {
            accountId,
            userId,
            isRead: false,
          },
        });

        const unreadNotifications = unreadResult.data || [];

        if (unreadNotifications.length === 0) {
          return this.success([]);
        }

        // Mark all as read
        const readAt = this.now();
        const updatedNotifications: any[] = [];

        for (const notification of unreadNotifications) {
          const updated = await this.getGateways().userNotificationGw.update(
            { id: notification.id, accountId, userId },
            { readAt },
          );
          updatedNotifications.push(...updated);
        }

        return this.success(updatedNotifications.map((item: any) => this.processItemOnOut(item, opt)));
      },
      hasTransaction: false,
      doingWhat: 'marking all notifications as read',
    });
  }
}

// Need to import OP_RESULT_CODES for custom actions
import { OP_RESULT_CODES } from '@sdflc/api-helpers';

export { UserNotificationCore };
