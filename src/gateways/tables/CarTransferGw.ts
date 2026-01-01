// ./src/gateways/tables/CarTransferGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class CarTransferGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_TRANSFERS,
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
      selectFields: [`${TABLES.CAR_TRANSFERS}.*`],
      idField: `${TABLES.CAR_TRANSFERS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.WHEN_SENT,
          order: SORT_ORDER.DESC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { carId, fromUserId, toUserId, transferStatus, newCarId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (carId) {
      query.whereIn(`${TABLES.CAR_TRANSFERS}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (fromUserId) {
      query.whereIn(FIELDS.FROM_USER_ID, castArray(fromUserId));
    }

    if (toUserId) {
      query.whereIn(FIELDS.TO_USER_ID, castArray(toUserId));
    }

    if (transferStatus) {
      query.whereIn(FIELDS.TRANSFER_STATUS, castArray(transferStatus));
    }

    if (newCarId) {
      query.whereIn(FIELDS.NEW_CAR_ID, castArray(newCarId));
    }

    // Security filter through cars join
    if (accountId) {
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.CAR_TRANSFERS}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carId, fromUserId, toUserId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (fromUserId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.FROM_USER_ID, castArray(fromUserId));
    }

    if (toUserId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TO_USER_ID, castArray(toUserId));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_TRANSFERS}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { carId, fromUserId, toUserId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (fromUserId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.FROM_USER_ID, castArray(fromUserId));
    }

    if (toUserId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TO_USER_ID, castArray(toUserId));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_TRANSFERS}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { carId, fromUserId, toUserId } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (carId) {
      sqlFilter.push(`${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (fromUserId) {
      sqlFilter.push(`${FIELDS.FROM_USER_ID} = ?`);
      bindings.push(fromUserId);
    }

    if (toUserId) {
      sqlFilter.push(`${FIELDS.TO_USER_ID} = ?`);
      bindings.push(toUserId);
    }

    const filterStr = sqlFilter.length > 0 ? ' WHERE ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.CAR_TRANSFERS}${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { CarTransferGw };
