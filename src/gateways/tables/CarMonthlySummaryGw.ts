// ./src/gateways/tables/CarMonthlySummaryGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class CarMonthlySummaryGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_MONTHLY_SUMMARIES,
      hasStatus: false,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: false,
      hasUpdatedAt: true,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.CAR_MONTHLY_SUMMARIES}.*`],
      idField: `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.YEAR,
          order: SORT_ORDER.DESC,
        },
        {
          name: FIELDS.MONTH,
          order: SORT_ORDER.DESC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { carId, homeCurrency, year, month, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (carId) {
      query.whereIn(`${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (homeCurrency) {
      query.whereIn(FIELDS.HOME_CURRENCY, castArray(homeCurrency));
    }

    if (year) {
      query.whereIn(FIELDS.YEAR, castArray(year));
    }

    if (month) {
      query.whereIn(FIELDS.MONTH, castArray(month));
    }

    // Security filter through cars join
    if (accountId) {
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId))
        this.onNull(`${TABLES.CARS}.${FIELDS.REMOVED_AT}`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carId, homeCurrency, year, month, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (homeCurrency != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.HOME_CURRENCY, castArray(homeCurrency));
    }

    if (year != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.YEAR, castArray(year));
    }

    if (month != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MONTH, castArray(month));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { carId, homeCurrency, year, month, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (homeCurrency != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.HOME_CURRENCY, castArray(homeCurrency));
    }

    if (year != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.YEAR, castArray(year));
    }

    if (month != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MONTH, castArray(month));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_MONTHLY_SUMMARIES}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { carId } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (carId) {
      sqlFilter.push(`${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    const filterStr = sqlFilter.length > 0 ? ' WHERE ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.CAR_MONTHLY_SUMMARIES}${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { CarMonthlySummaryGw };
