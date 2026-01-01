// ./src/core/TravelCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/travelValidators';

dayjs.extend(utc);

class TravelCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'travelGw',
      name: 'Travel',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing travels',
        get: 'getting a travel',
        getMany: 'getting multiple travels',
        create: 'creating a travel',
        createMany: '',
        update: 'updating a travel',
        updateMany: '',
        set: '',
        remove: 'removing a travel',
        removeMany: 'removing multiple travels',
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

    if (item.firstDttm !== null && item.firstDttm !== undefined) {
      item.firstDttm = dayjs(item.firstDttm).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.lastDttm !== null && item.lastDttm !== undefined) {
      item.lastDttm = dayjs(item.lastDttm).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
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

    // Security check: verify the travel belongs to the current account
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

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const newTravel = {
      ...params,
      accountId,
      userId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newTravel;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID is required');
    }

    // Check if user owns the travel
    const travel = await this.getGateways().travelGw.get(id);

    if (!travel || travel.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
    }

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, ...restParams } = params;

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID is required');
    }

    // Check if user owns the travel
    const travel = await this.getGateways().travelGw.get(id);

    if (!travel || travel.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();
    const allowedWhere: any[] = [];

    // Check ownership for each travel
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const travel = await this.getGateways().travelGw.get(id);

      if (travel && travel.accountId === accountId) {
        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { TravelCore };
