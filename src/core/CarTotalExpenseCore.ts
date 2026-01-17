// ./src/core/CarTotalExpenseCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carTotalExpenseValidators';
import { OP_RESULT_CODES, OpResult } from '@sdflc/api-helpers';

dayjs.extend(utc);

class CarTotalExpenseCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carTotalExpenseGw',
      name: 'CarTotalExpense',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car total expenses',
        get: 'getting a car total expense',
        getMany: 'getting multiple car total expenses',
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

    return item;
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();

    // Batch fetch cars for all expenses
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
    return items.filter((item) => item && validCarIds.has(item.carId));
  }
}

export { CarTotalExpenseCore };
