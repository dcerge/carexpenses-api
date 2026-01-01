// ./src/core/CarTotalSummaryCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carTotalSummaryValidators';

dayjs.extend(utc);

class CarTotalSummaryCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carTotalSummaryGw',
      name: 'CarTotalSummary',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car total summaries',
        get: 'getting a car total summary',
        getMany: 'getting multiple car total summaries',
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

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.firstRecordDttm !== null && item.firstRecordDttm !== undefined) {
      item.firstRecordDttm = dayjs(item.firstRecordDttm).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.lastRecordDttm !== null && item.lastRecordDttm !== undefined) {
      item.lastRecordDttm = dayjs(item.lastRecordDttm).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Security is handled via gateway join to cars
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

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check via car ownership
    const { accountId } = this.getContext();
    const car = await this.getGateways().carGw.get(item.carId);

    if (!car || car.accountId !== accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();

    // Batch fetch cars for all summaries
    const carIds = [...new Set(items.filter((item) => item?.carId).map((item) => item.carId))];

    if (carIds.length === 0) {
      return [];
    }

    const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
    const cars = carsResult.data || [];

    // Create lookup map of valid car IDs (owned by account)
    const validCarIds = new Set<string>();
    for (const car of cars) {
      if (car.accountId === accountId) {
        validCarIds.add(car.id);
      }
    }

    // Filter items to only include those with valid cars
    const filteredItems = items.filter((item) => item && validCarIds.has(item.carId));

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { CarTotalSummaryCore };
