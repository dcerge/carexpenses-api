// ./src/gateways/tables/CarMonthlyExpenseGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class CarMonthlyExpenseGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_MONTHLY_EXPENSES,
      hasStatus: false,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: false,
      hasUpdatedAt: false,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.CAR_MONTHLY_EXPENSES}.*`],
      idField: `${TABLES.CAR_MONTHLY_EXPENSES}.${FIELDS.CAR_MONTHLY_SUMMARY_ID}`,
      idFieldUpdateRemove: FIELDS.CAR_MONTHLY_SUMMARY_ID,
      defaultSorting: [
        {
          name: FIELDS.CAR_MONTHLY_SUMMARY_ID,
          order: SORT_ORDER.ASC,
        },
        {
          name: FIELDS.EXPENSE_KIND_ID,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { carMonthlySummaryId, expenseKindId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (carMonthlySummaryId) {
      query.whereIn(FIELDS.CAR_MONTHLY_SUMMARY_ID, castArray(carMonthlySummaryId));
    }

    if (expenseKindId) {
      query.whereIn(FIELDS.EXPENSE_KIND_ID, castArray(expenseKindId));
    }

    // Security filter through car_monthly_summaries -> cars join
    if (accountId) {
      query.innerJoin(TABLES.CAR_MONTHLY_SUMMARIES, function (this: any) {
        this.on(
          `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.ID}`,
          '=',
          `${TABLES.CAR_MONTHLY_EXPENSES}.${FIELDS.CAR_MONTHLY_SUMMARY_ID}`,
        );
      });
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carMonthlySummaryId, expenseKindId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (carMonthlySummaryId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_MONTHLY_SUMMARY_ID, castArray(carMonthlySummaryId));
    }

    if (expenseKindId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_KIND_ID, castArray(expenseKindId));
    }

    // Security filter through car_monthly_summaries -> cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CAR_MONTHLY_SUMMARIES)
          .innerJoin(TABLES.CARS, `${TABLES.CARS}.${FIELDS.ID}`, `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`)
          .whereRaw(
            `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.ID} = ${TABLES.CAR_MONTHLY_EXPENSES}.${FIELDS.CAR_MONTHLY_SUMMARY_ID}`,
          )
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { carMonthlySummaryId, expenseKindId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (carMonthlySummaryId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_MONTHLY_SUMMARY_ID, castArray(carMonthlySummaryId));
    }

    if (expenseKindId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_KIND_ID, castArray(expenseKindId));
    }

    // Security filter through car_monthly_summaries -> cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CAR_MONTHLY_SUMMARIES)
          .innerJoin(TABLES.CARS, `${TABLES.CARS}.${FIELDS.ID}`, `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`)
          .whereRaw(
            `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.ID} = ${TABLES.CAR_MONTHLY_EXPENSES}.${FIELDS.CAR_MONTHLY_SUMMARY_ID}`,
          )
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }
}

export { CarMonthlyExpenseGw };
