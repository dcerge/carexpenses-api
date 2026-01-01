// ./src/core/CarBodyTypeCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carMonthlySummaryValidators';

dayjs.extend(utc);

class CarEngineTypeCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carEngineTypeGw',
      name: 'Car Engine Type',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car engine types',
        get: 'getting a car engine type',
        getMany: 'getting multiple car engine types',
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
    const mapIdToCarEngineType: any = {};

    const ids = items.map((item) => {
      mapIdToCarEngineType[item.id] = item;
      return item.id;
    });

    const l10ns = await this.getGateways().carEngineTypeL10NGw.list({
      filter: {
        carEngineTypeId: ids,
        lang: 'en',
      },
    });

    const processedItems: any[] = [];
    for (let l10n of l10ns) {
      if (mapIdToCarEngineType[l10n.carEngineTypeId]) {
        processedItems.push({
          id: l10n.carEngineTypeId,
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

export { CarEngineTypeCore };
