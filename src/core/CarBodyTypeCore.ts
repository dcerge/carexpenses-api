// ./src/core/CarBodyTypeCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carMonthlySummaryValidators';

dayjs.extend(utc);

class CarBodyTypeCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carBodyTypeGw',
      name: 'Car Body Type',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car body types',
        get: 'getting a car body type',
        getMany: 'getting multiple car bpdy types',
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

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  public async localizeItems(items: any): Promise<any[]> {
    const mapIdToCarBodyType: any = {};

    const ids = items.map((item) => {
      mapIdToCarBodyType[item.id] = item;
      return item.id;
    });

    const l10ns = await this.getGateways().carBodyTypeL10NGw.list({
      filter: {
        carBodyTypeId: ids,
        lang: 'en',
      },
    });

    const processedItems: any[] = [];
    for (let l10n of l10ns) {
      if (mapIdToCarBodyType[l10n.carBodyTypeId]) {
        processedItems.push({
          id: l10n.carBodyTypeId,
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

export { CarBodyTypeCore };
