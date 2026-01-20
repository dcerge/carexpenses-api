// ./src/core/RevenueCategoryCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreActionsInterface, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';

dayjs.extend(utc);

class RevenueCategoryCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'revenueCategoryGw',
      name: 'Revenue Category',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing revenue categories',
        get: 'getting a revenue category',
        getMany: 'getting multiple revenue categories',
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
    const mapIdToRevenueCategory: any = {};

    const ids = items.map((item) => {
      mapIdToRevenueCategory[item.id] = item;
      return item.id;
    });

    const l10ns = await this.getGateways().revenueCategoryL10NGw.list({
      filter: {
        revenueCategoryId: ids,
        lang: 'en',
      },
    });

    const processedItems: any[] = [];
    for (let l10n of l10ns) {
      if (mapIdToRevenueCategory[l10n.revenueCategoryId]) {
        processedItems.push({
          id: l10n.revenueCategoryId,
          code: mapIdToRevenueCategory[l10n.revenueCategoryId].code,
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

export { RevenueCategoryCore };