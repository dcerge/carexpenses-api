// ./src/core/ExpenseExpenseTagCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/expenseExpenseTagValidators';

dayjs.extend(utc);

class ExpenseExpenseTagCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseExpenseTagGw',
      name: 'ExpenseExpenseTag',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expense expense tags',
        get: '',
        getMany: '',
        create: 'creating an expense expense tag',
        createMany: '',
        update: 'updating an expense expense tag',
        updateMany: '',
        set: '',
        remove: 'removing an expense expense tag',
        removeMany: 'removing multiple expense expense tags',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  /**
   * Verify expense belongs to current account
   */
  private async verifyExpenseOwnership(expenseId: string): Promise<boolean> {
    const { accountId } = this.getContext();
    const expenseBase = await this.getGateways().expenseBaseGw.get(expenseId);
    return expenseBase && expenseBase.accountId === accountId;
  }

  /**
   * Verify expense tag belongs to current account
   */
  private async verifyExpenseTagOwnership(expenseTagId: string): Promise<boolean> {
    const { accountId } = this.getContext();
    const expenseTag = await this.getGateways().expenseTagGw.get(expenseTagId);
    return expenseTag && expenseTag.accountId === accountId;
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Security is handled via gateway join to expense_bases
    // But we pass accountId for the join filter
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { expenseId, expenseTagId } = params || {};

    // Verify expense ownership
    if (expenseId) {
      const isExpenseOwned = await this.verifyExpenseOwnership(expenseId);
      if (!isExpenseOwned) {
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense not found');
      }
    }

    // Verify expense tag ownership
    if (expenseTagId) {
      const isTagOwned = await this.verifyExpenseTagOwnership(expenseTagId);
      if (!isTagOwned) {
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense tag not found');
      }
    }

    return params;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { expenseId, expenseTagId } = where || {};
    const { accountId } = this.getContext();

    if (!expenseId || !expenseTagId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense ID and Expense Tag ID are required');
    }

    // Verify expense ownership
    const isExpenseOwned = await this.verifyExpenseOwnership(expenseId);
    if (!isExpenseOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense expense tag not found');
    }

    // Verify expense tag ownership
    const isTagOwned = await this.verifyExpenseTagOwnership(expenseTagId);
    if (!isTagOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense expense tag not found');
    }

    // Don't allow changing expenseId or expenseTagId
    const { expenseId: _, expenseTagId: __, ...restParams } = params;

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { expenseId, expenseTagId } = where || {};
    const { accountId } = this.getContext();

    if (!expenseId || !expenseTagId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense ID and Expense Tag ID are required');
    }

    // Verify expense ownership
    const isExpenseOwned = await this.verifyExpenseOwnership(expenseId);
    if (!isExpenseOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense expense tag not found');
    }

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();
    const allowedWhere: any[] = [];

    for (const item of where) {
      const { expenseId, expenseTagId } = item || {};

      if (!expenseId || !expenseTagId) {
        continue;
      }

      // Verify expense ownership
      const isExpenseOwned = await this.verifyExpenseOwnership(expenseId);
      if (isExpenseOwned) {
        // Add accountId to where clause for SQL-level security via gateway join
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }
}

export { ExpenseExpenseTagCore };
