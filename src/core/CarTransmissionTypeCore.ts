// ./src/core/CarBodyTypeCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carMonthlySummaryValidators';

dayjs.extend(utc);

class CarTransmissionTypeCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carTransmissionTypeGw',
      name: 'Car Transmission Type',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car transmission types',
        get: 'getting a car transmission type',
        getMany: 'getting multiple car transmission types',
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
    const mapIdToCarTransmissionType: any = {};

    const ids = items.map((item) => {
      mapIdToCarTransmissionType[item.id] = item;
      return item.id;
    });

    const l10ns = await this.getGateways().carTransmissionTypeL10NGw.list({
      filter: {
        carTransmissionTypeId: ids,
        lang: 'en',
      },
    });

    const processedItems: any[] = [];
    for (let l10n of l10ns) {
      if (mapIdToCarTransmissionType[l10n.carTransmissionTypeId]) {
        processedItems.push({
          id: l10n.carTransmissionTypeId,
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

export { CarTransmissionTypeCore };
