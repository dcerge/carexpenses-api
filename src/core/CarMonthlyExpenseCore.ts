// ./src/core/CarMonthlyExpenseCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carMonthlyExpenseValidators';

dayjs.extend(utc);

class CarMonthlyExpenseCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carMonthlyExpenseGw',
      name: 'CarMonthlyExpense',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car monthly expenses',
        get: 'getting a car monthly expense',
        getMany: 'getting multiple car monthly expenses',
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

    // Security is handled via gateway join to car_monthly_summaries -> cars
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

    // Security check via car_monthly_summary -> car ownership
    const { accountId } = this.getContext();
    const summary = await this.getGateways().carMonthlySummaryGw.get(item.carMonthlySummaryId);

    if (!summary) {
      return null;
    }

    const car = await this.getGateways().carGw.get(summary.carId);

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

    // Batch fetch summaries for all expenses
    const summaryIds = [
      ...new Set(items.filter((item) => item?.carMonthlySummaryId).map((item) => item.carMonthlySummaryId)),
    ];

    if (summaryIds.length === 0) {
      return [];
    }

    const summariesResult = await this.getGateways().carMonthlySummaryGw.list({ filter: { id: summaryIds } });
    const summaries = summariesResult.data || [];

    // Get unique car IDs from summaries
    const carIds = [...new Set(summaries.filter((s) => s?.carId).map((s) => s.carId))];

    if (carIds.length === 0) {
      return [];
    }

    // Batch fetch cars
    const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
    const cars = carsResult.data || [];

    // Create lookup map of valid car IDs (owned by account)
    const validCarIds = new Set<string>();
    for (const car of cars) {
      if (car.accountId === accountId) {
        validCarIds.add(car.id);
      }
    }

    // Create lookup map of valid summary IDs
    const validSummaryIds = new Set<string>();
    for (const summary of summaries) {
      if (validCarIds.has(summary.carId)) {
        validSummaryIds.add(summary.id);
      }
    }

    // Filter items to only include those with valid summaries
    return items.filter((item) => item && validSummaryIds.has(item.carMonthlySummaryId));
  }
}

export { CarMonthlyExpenseCore };
