// ./src/core/VehicleMakeCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreActionsInterface, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';

dayjs.extend(utc);

class ExpenseKindCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'expenseKindGw',
      name: 'Expense Kind',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing expense kinds',
        get: 'getting an expense kind',
        getMany: 'getting multiple expense kinds',
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
    const mapIdToExpenseKind: any = {};

    const ids = items.map((item) => {
      mapIdToExpenseKind[item.id] = item;
      return item.id;
    });

    const l10ns = await this.getGateways().expenseKindL10NGw.list({
      filter: {
        expenseKindId: ids,
        lang: 'en',
      },
    });

    const processedItems: any[] = [];
    for (let l10n of l10ns) {
      if (mapIdToExpenseKind[l10n.expenseKindId]) {
        processedItems.push({
          id: l10n.expenseKindId,
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

export { ExpenseKindCore };
