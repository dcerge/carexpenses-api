// ./src/core/UserProfileCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import {
  BaseCoreValidatorsInterface,
  BaseCorePropsInterface,
  BaseCoreActionsInterface,
  BaseCore,
} from '@sdflc/backend-helpers';

import { validators } from './validators/userProfileValidators';

dayjs.extend(utc);

class UserProfileCore extends BaseCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'userProfileGw',
      name: 'UserProfile',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing user profiles',
        get: 'getting a user profile',
        getMany: 'getting multiple user profiles',
        create: '',
        createMany: '',
        update: 'updating a user profile',
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

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Filter by accountId for security
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  public async beforeGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return this.defaultAfterAndBefore(item, opt);
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const accountId = this.getContext().accountId;

    // Filter items to only include those belonging to the current account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { id: _, ...restParams } = params;
    const { userId } = this.getContext();

    if (!id) {
      this.logger.log(`Cannot update user profile as the 'id' field was not provided`);
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'User profile ID is required');
    }

    // Check if user owns the profile
    const profile = await this.getGateways().userProfileGw.get(id);

    if (!profile) {
      this.logger.log(`Creating preferences for a new user: `, {
        id: userId,
        ...restParams,
      });

      const newProfile = await this.getGateways().userProfileGw.create({
        id: userId,
        ...restParams,
      });

      this.logger.log(`created preferences: `, newProfile);

      this.getGateways().userProfileGw.clear(userId);

      return OpResult.ok(newProfile);
    }

    this.logger.log(`Updating preferencces for existing user ${userId}: `, profile);

    if (profile.id !== userId) {
      this.logger.log(
        `Cannot update user profile as its reference to the user ID ('${profile.id}') does not match current user's ID (${this.getContext().userId})`,
      );
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'User profile not found');
    }

    where.id = userId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { UserProfileCore };
