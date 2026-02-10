// ./src/core/RevenueKindCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreActionsInterface, BaseCorePropsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';

dayjs.extend(utc);

class TireBrandCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'tireBrandGw',
      name: 'Tire Brands',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing tire brands',
        get: 'getting a tire brand',
        getMany: 'getting multiple tire brands',
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

  // public async localizeItems(items: any): Promise<any[]> {
  //   const mapIdToRevenueKind: any = {};

  //   const ids = items.map((item) => {
  //     mapIdToRevenueKind[item.id] = item;
  //     return item.id;
  //   });

  //   const l10ns = await this.getGateways().revenueKindL10NGw.list({
  //     filter: {
  //       revenueKindId: ids,
  //       lang: 'en',
  //     },
  //   });

  //   const processedItems: any[] = [];
  //   for (let l10n of l10ns) {
  //     if (mapIdToRevenueKind[l10n.revenueKindId]) {
  //       processedItems.push({
  //         id: l10n.revenueKindId,
  //         code: mapIdToRevenueKind[l10n.revenueKindId].code,
  //         name: l10n.name,
  //       });
  //     }
  //   }

  //   return processedItems;
  // }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};

    return args;
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    return items; // this.localizeItems(items);
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    return item; // this.localizeItems([item]);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    return items; // this.localizeItems(items);
  }
}

export { TireBrandCore };