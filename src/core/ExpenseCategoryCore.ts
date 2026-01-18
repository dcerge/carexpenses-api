// ./src/core/VehicleMakeCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreActionsInterface, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';

dayjs.extend(utc);

class ExpenseCategoryCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseCategoryGw',
      name: 'Expense Category',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expense categories',
        get: 'getting an expense category',
        getMany: 'getting multiple expense categories',
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

  public async localizeItems(items: any): Promise<any[]> {
    const mapIdToExpenseCategory: any = {};

    const ids = items.map((item) => {
      mapIdToExpenseCategory[item.id] = item;
      return item.id;
    });

    const l10ns = await this.getGateways().expenseCategoryL10NGw.list({
      filter: {
        expenseCategoryId: ids,
        lang: 'en',
      },
    });

    const processedItems: any[] = [];
    for (let l10n of l10ns) {
      if (mapIdToExpenseCategory[l10n.expenseCategoryId]) {
        processedItems.push({
          id: l10n.expenseCategoryId,
          code: mapIdToExpenseCategory[l10n.expenseCategoryId].code,
          name: l10n.name,
        });
      }
    }

    return processedItems;
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};

    return args;
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    return this.localizeItems(items);
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    return this.localizeItems([item]);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    return this.localizeItems(items);
  }
}

export { ExpenseCategoryCore };
