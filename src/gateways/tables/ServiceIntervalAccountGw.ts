// ./src/gateways/tables/ServiceIntervalAccountGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class ServiceIntervalAccountGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.SERVICE_INTERVAL_ACCOUNTS,
      hasStatus: true,
      hasVersion: true,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: true,
      hasCreatedBy: true,
      hasUpdatedBy: true,
      hasRemovedBy: true,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.SERVICE_INTERVAL_ACCOUNTS}.*`],
      idField: `${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.KIND_ID,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { carId, kindId, intervalType, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (carId) {
      query.whereIn(`${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (kindId) {
      query.whereIn(FIELDS.KIND_ID, castArray(kindId));
    }

    if (intervalType) {
      query.whereIn(FIELDS.INTERVAL_TYPE, castArray(intervalType));
    }

    // Security filter through cars join
    if (accountId) {
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carId, kindId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (kindId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.KIND_ID, castArray(kindId));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { carId, kindId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (kindId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.KIND_ID, castArray(kindId));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.CAR_ID}`)
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

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.SERVICE_INTERVAL_ACCOUNTS} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { ServiceIntervalAccountGw };
