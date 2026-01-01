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

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the profile belongs to the current account
    if (item.accountId !== this.getContext().accountId) {
      return null; // Return null so the core returns NOT_FOUND
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

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'User profile ID is required');
    }

    // Check if user owns the profile
    const profile = await this.getGateways().userProfileGw.get(id);

    if (!profile || profile.accountId !== this.getContext().accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'User profile not found');
    }

    // Don't allow changing accountId
    const { accountId, ...restParams } = params;

    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { UserProfileCore };
