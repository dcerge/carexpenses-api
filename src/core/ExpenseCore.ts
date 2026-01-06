// ./src/core/ExpenseCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/expenseValidators';

dayjs.extend(utc);

// Expense types
const EXPENSE_TYPE = {
  REFUEL: 1,
  EXPENSE: 2,
  CHECKOINT: 3,
  TRAVEL: 4,
};

interface ExpenseUpdateData {
  expenseType: number;
  expenseId: string;
  extensionParams: any;
}

class ExpenseCore extends AppCore {
  private updateData: Map<string, ExpenseUpdateData> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseBaseGw',
      name: 'Expense',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expenses',
        get: 'getting an expense',
        getMany: 'getting multiple expenses',
        create: 'creating an expense',
        createMany: '',
        update: 'updating an expense',
        updateMany: '',
        set: '',
        remove: 'removing an expense',
        removeMany: 'removing multiple expenses',
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

    if (item.whenDone !== null && item.whenDone !== undefined) {
      item.whenDone = dayjs(item.whenDone).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  /**
   * Batch fetch and merge extension data for multiple expense bases
   */
  private async batchMergeExpenseData(expenseBases: any[]): Promise<any[]> {
    if (!expenseBases || expenseBases.length === 0) {
      return [];
    }

    // Separate IDs by expense type
    const refuelIds: string[] = [];
    const expenseIds: string[] = [];

    for (const base of expenseBases) {
      if (base.expenseType === EXPENSE_TYPE.REFUEL) {
        refuelIds.push(base.id);
      } else if (base.expenseType === EXPENSE_TYPE.EXPENSE) {
        expenseIds.push(base.id);
      }
    }

    // Batch fetch extension data (2 queries max)
    const [refuels, expenses] = await Promise.all([
      refuelIds.length > 0 ? this.getGateways().refuelGw.list({ filter: { id: refuelIds } }) : Promise.resolve([]),
      expenseIds.length > 0 ? this.getGateways().expenseGw.list({ filter: { id: expenseIds } }) : Promise.resolve([]),
    ]);

    // Create lookup maps by ID
    const refuelMap = new Map<string, any>();
    for (const refuel of refuels) {
      refuelMap.set(refuel.id, refuel);
    }

    const expenseMap = new Map<string, any>();
    for (const expense of expenses) {
      expenseMap.set(expense.id, expense);
    }

    // Merge data
    const mergedItems: any[] = [];

    for (const base of expenseBases) {
      const merged = { ...base };

      if (base.expenseType === EXPENSE_TYPE.REFUEL) {
        const refuel = refuelMap.get(base.id);
        if (refuel) {
          merged.refuelVolume = refuel.refuelVolume;
          merged.volumeEnteredIn = refuel.volumeEnteredIn;
          merged.pricePerVolume = refuel.pricePerVolume;
          merged.isFullTank = refuel.isFullTank;
          merged.remainingInTankBefore = refuel.remainingInTankBefore;
          merged.fuelGrade = refuel.fuelGrade;
        }
      } else if (base.expenseType === EXPENSE_TYPE.EXPENSE) {
        const expense = expenseMap.get(base.id);

        if (expense) {
          merged.kindId = expense.kindId;
          merged.costWork = expense.costWork;
          merged.costParts = expense.costParts;
          merged.costWorkHc = expense.costWorkHc;
          merged.costPartsHc = expense.costPartsHc;
          merged.shortNote = expense.shortNote;
        }
      }

      mergedItems.push(merged);
    }

    return mergedItems;
  }

  /**
   * Extract base fields from params
   */
  private extractBaseFields(params: any): any {
    const {
      // Exclude extension table fields
      kindId,
      costWork,
      costParts,
      costWorkHc,
      costPartsHc,
      shortNote,
      refuelVolume,
      volumeEnteredIn,
      pricePerVolume,
      isFullTank,
      remainingInTankBefore,
      fuelGrade,
      ...baseFields
    } = params;

    return baseFields;
  }

  /**
   * Extract expense-specific fields from params
   */
  private extractExpenseFields(params: any): any {
    return {
      kindId: params.kindId,
      costWork: params.costWork,
      costParts: params.costParts,
      costWorkHc: params.costWorkHc,
      costPartsHc: params.costPartsHc,
      shortNote: params.shortNote,
    };
  }

  /**
   * Extract refuel-specific fields from params
   */
  private extractRefuelFields(params: any): any {
    return {
      refuelVolume: params.refuelVolume,
      volumeEnteredIn: params.volumeEnteredIn,
      pricePerVolume: params.pricePerVolume,
      isFullTank: params.isFullTank,
      remainingInTankBefore: params.remainingInTankBefore,
      fuelGrade: params.fuelGrade,
    };
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

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const mergedItems = await this.batchMergeExpenseData(items);

    return mergedItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the expense belongs to the current account
    if (item.accountId !== this.getContext().accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    const [merged] = await this.batchMergeExpenseData([item]);
    return this.processItemOnOut(merged, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const accountId = this.getContext().accountId;

    // Filter items to only include those belonging to the current account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    if (filteredItems.length === 0) {
      return [];
    }

    const mergedItems = await this.batchMergeExpenseData(filteredItems);

    return mergedItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const baseFields = this.extractBaseFields(params);

    const newExpenseBase = {
      ...baseFields,
      accountId,
      userId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newExpenseBase;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { params } = args || {};

    // Create extension table record based on expenseType
    for (const expenseBase of items) {
      if (expenseBase.expenseType === EXPENSE_TYPE.REFUEL) {
        const refuelFields = this.extractRefuelFields(params);
        await this.getGateways().refuelGw.create({
          id: expenseBase.id,
          ...refuelFields,
        });
      } else if (expenseBase.expenseType === EXPENSE_TYPE.EXPENSE) {
        const expenseFields = this.extractExpenseFields(params);
        await this.getGateways().expenseGw.create({
          id: expenseBase.id,
          ...expenseFields,
        });
      }
    }

    // Merge and return
    const mergedItems = await this.batchMergeExpenseData(items);

    return mergedItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense ID is required');
    }

    // Check if user owns the expense
    const expenseBase = await this.getGateways().expenseBaseGw.get(id);

    if (!expenseBase || expenseBase.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense not found');
    }

    // Don't allow changing accountId, userId, or expenseType
    const { accountId: _, userId: __, expenseType: ___, ...restParams } = params;

    const baseFields = this.extractBaseFields(restParams);

    baseFields.updatedBy = userId;
    baseFields.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    // Store data for afterUpdate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`update-${requestId}-${id}`, {
      expenseType: expenseBase.expenseType,
      expenseId: id,
      extensionParams: restParams,
    });

    return baseFields;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const requestId = this.getRequestId();

    // Update extension table records
    for (const item of items) {
      if (!item.id) continue;

      const updateInfo = this.updateData.get(`update-${requestId}-${item.id}`);

      if (!updateInfo) continue;

      const { expenseType, expenseId, extensionParams } = updateInfo;

      if (expenseType === EXPENSE_TYPE.REFUEL) {
        const refuelFields = this.extractRefuelFields(extensionParams);
        const hasRefuelFields = Object.values(refuelFields).some((v) => v !== undefined);
        if (hasRefuelFields) {
          await this.getGateways().refuelGw.update({ id: expenseId }, refuelFields);
        }
      } else if (expenseType === EXPENSE_TYPE.EXPENSE) {
        const expenseFields = this.extractExpenseFields(extensionParams);
        const hasExpenseFields = Object.values(expenseFields).some((v) => v !== undefined);
        if (hasExpenseFields) {
          await this.getGateways().expenseGw.update({ id: expenseId }, expenseFields);
        }
      }

      // Clean up stored data
      this.updateData.delete(`update-${requestId}-${item.id}`);
    }

    // Merge and return
    const mergedItems = await this.batchMergeExpenseData(items);

    return mergedItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense ID is required');
    }

    // Check if user owns the expense
    const expenseBase = await this.getGateways().expenseBaseGw.get(id);

    if (!expenseBase || expenseBase.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Expense not found');
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

    // Check ownership for each expense
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const expenseBase = await this.getGateways().expenseBaseGw.get(id);

      if (expenseBase && expenseBase.accountId === accountId) {
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

export { ExpenseCore };
