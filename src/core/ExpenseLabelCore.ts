// ./src/core/ExpenseLabelCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import {
  BaseCoreValidatorsInterface,
  BaseCorePropsInterface,
  BaseCoreActionsInterface,
  BaseCore,
} from '@sdflc/backend-helpers';

import { validators } from './validators/expenseLabelValidators';
import { AppCore } from './AppCore';

dayjs.extend(utc);

class ExpenseLabelCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseLabelGw',
      name: 'ExpenseLabel',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expense labels',
        get: 'getting an expense label',
        getMany: 'getting multiple expense labels',
        create: 'creating an expense label',
        createMany: '',
        update: 'updating an expense label',
        updateMany: '',
        set: '',
        remove: 'removing an expense label',
        removeMany: 'removing multiple expense labels',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  private normalizeName(name: string): string {
    return name ? name.toLowerCase().trim() : '';
  }

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.lastTimeUsed !== null && item.lastTimeUsed !== undefined) {
      item.lastTimeUsed = dayjs(item.lastTimeUsed).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
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

    // Security check: verify the label belongs to the current account
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

    const newLabel = {
      ...params,
      accountId,
      normalizedName: this.normalizeName(params.labelName),
      createdBy: userId,
      createdAt: this.now(),
    };

    return newLabel;
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
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense label ID is required');
    }

    // Check if user owns the label
    const label = await this.getGateways().expenseLabelGw.get(id);

    if (!label || label.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense label not found');
    }

    // Don't allow changing accountId
    const { accountId: _, ...restParams } = params;

    // Update normalizedName if labelName is being updated
    if (restParams.labelName) {
      restParams.normalizedName = this.normalizeName(restParams.labelName);
    }

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
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense label ID is required');
    }

    // Check if user owns the label
    const label = await this.getGateways().expenseLabelGw.get(id);

    if (!label || label.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense label not found');
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

    // Check ownership for each label
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const label = await this.getGateways().expenseLabelGw.get(id);

      if (label && label.accountId === accountId) {
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

export { ExpenseLabelCore };
