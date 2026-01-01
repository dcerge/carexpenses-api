// ./src/core/TravelExpenseTagCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/travelExpenseTagValidators';

dayjs.extend(utc);

class TravelExpenseTagCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'travelExpenseTagGw',
      name: 'TravelExpenseTag',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing travel expense tags',
        get: '',
        getMany: '',
        create: 'creating a travel expense tag',
        createMany: '',
        update: 'updating a travel expense tag',
        updateMany: '',
        set: '',
        remove: 'removing a travel expense tag',
        removeMany: 'removing multiple travel expense tags',
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
   * Verify travel belongs to current account
   */
  private async verifyTravelOwnership(travelId: string): Promise<boolean> {
    const { accountId } = this.getContext();
    const travel = await this.getGateways().travelGw.get(travelId);
    return travel && travel.accountId === accountId;
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

    // Security is handled via gateway join to travels
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
    const { travelId, expenseTagId } = params || {};

    // Verify travel ownership
    if (travelId) {
      const isTravelOwned = await this.verifyTravelOwnership(travelId);
      if (!isTravelOwned) {
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel not found');
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
    const { travelId, expenseTagId } = where || {};
    const { accountId } = this.getContext();

    if (!travelId || !expenseTagId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID and Expense Tag ID are required');
    }

    // Verify travel ownership
    const isTravelOwned = await this.verifyTravelOwnership(travelId);
    if (!isTravelOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel expense tag not found');
    }

    // Verify expense tag ownership
    const isTagOwned = await this.verifyExpenseTagOwnership(expenseTagId);
    if (!isTagOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel expense tag not found');
    }

    // Don't allow changing travelId or expenseTagId
    const { travelId: _, expenseTagId: __, ...restParams } = params;

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { travelId, expenseTagId } = where || {};
    const { accountId } = this.getContext();

    if (!travelId || !expenseTagId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel ID and Expense Tag ID are required');
    }

    // Verify travel ownership
    const isTravelOwned = await this.verifyTravelOwnership(travelId);
    if (!isTravelOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Travel expense tag not found');
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
      const { travelId, expenseTagId } = item || {};

      if (!travelId || !expenseTagId) {
        continue;
      }

      // Verify travel ownership
      const isTravelOwned = await this.verifyTravelOwnership(travelId);
      if (isTravelOwned) {
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

export { TravelExpenseTagCore };
