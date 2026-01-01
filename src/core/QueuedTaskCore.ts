// ./src/core/QueuedTaskCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/queuedTaskValidators';

dayjs.extend(utc);

class QueuedTaskCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'queuedTaskGw',
      name: 'QueuedTask',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing queued tasks',
        get: 'getting a queued task',
        getMany: 'getting multiple queued tasks',
        create: 'creating a queued task',
        createMany: '',
        update: 'updating a queued task',
        updateMany: '',
        set: '',
        remove: 'removing a queued task',
        removeMany: 'removing multiple queued tasks',
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
    const { accountId, userId } = this.getContext();

    // Filter by accountId and userId for security
    // User can only see their own tasks
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

    // Security check: verify the task belongs to the current user
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

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const newTask = {
      ...params,
      accountId,
      userId,
      createdAt: this.now(),
    };

    return newTask;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // TODO: Trigger task processing queue

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Queued task ID is required');
    }

    // Check if user owns the task
    const task = await this.getGateways().queuedTaskGw.get(id);

    if (!task || task.accountId !== accountId || task.userId !== userId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Queued task not found');
    }

    // Don't allow changing accountId, userId, or taskType
    const { accountId: _, userId: __, taskType: ___, ...restParams } = params;

    restParams.updatedAt = this.now();

    // Add accountId and userId to where clause for SQL-level security
    where.accountId = accountId;
    where.userId = userId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Queued task ID is required');
    }

    // Check if user owns the task
    const task = await this.getGateways().queuedTaskGw.get(id);

    if (!task || task.accountId !== accountId || task.userId !== userId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Queued task not found');
    }

    // Add accountId and userId to where clause for SQL-level security
    where.accountId = accountId;
    where.userId = userId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId, userId } = this.getContext();
    const allowedWhere: any[] = [];

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      // Check if user owns the task
      const task = await this.getGateways().queuedTaskGw.get(id);

      if (task && task.accountId === accountId && task.userId === userId) {
        // Add accountId and userId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId, userId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { QueuedTaskCore };
