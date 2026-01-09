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
      hardRemove: true,
      // Configure upsert conflict resolution on carId + kindId
      setFields: [FIELDS.CAR_ID, FIELDS.KIND_ID],
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
    const table = TABLES.SERVICE_INTERVAL_ACCOUNTS;

    // Call parent but skip its id filter - we'll handle it ourselves with table prefix
    const { hasStatus, hasRemovedAt, activeStatuses } = this.getConfig();

    if (hasStatus) {
      query.whereIn(
        `${table}.${FIELDS.STATUS}`,
        filterParams?.[FIELDS.STATUS] != null ? castArray(filterParams?.[FIELDS.STATUS]) : castArray(activeStatuses),
      );
    }

    if (hasRemovedAt) {
      query.whereNull(`${table}.${FIELDS.REMOVED_AT}`);
    }

    // Filter by ID with table prefix (for JOINs)
    if (filterParams?.[FIELDS.ID]) {
      query.whereIn(`${table}.${FIELDS.ID}`, castArray(filterParams[FIELDS.ID]));
    }

    if (carId) {
      query.whereIn(`${table}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (kindId) {
      query.whereIn(`${table}.${FIELDS.KIND_ID}`, castArray(kindId));
    }

    if (intervalType) {
      query.whereIn(`${table}.${FIELDS.INTERVAL_TYPE}`, castArray(intervalType));
    }

    // Security filter through cars join
    if (accountId) {
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${table}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carId, kindId, accountId } = whereParams || {};

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
      query.whereExists(function (this: any) {
        this.select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const arr: any = whereParams ? castArray(whereParams) : [];

    let filtersAppliedQty = 0;

    // Collect carId + kindId pairs for removal
    const carKindPairs: Array<{ carId: string; kindId: number }> = [];
    const accountIds: Set<string> = new Set();

    for (const filter of arr) {
      if (filter.carId && filter.kindId != null) {
        carKindPairs.push({ carId: filter.carId, kindId: filter.kindId });
      }
      if (filter.accountId) {
        accountIds.add(filter.accountId);
      }
    }

    if (carKindPairs.length > 0) {
      filtersAppliedQty++;
      query.where(function (this: any) {
        for (const pair of carKindPairs) {
          this.orWhere(function (this: any) {
            this.where(FIELDS.CAR_ID, pair.carId).where(FIELDS.KIND_ID, pair.kindId);
          });
        }
      });
    }

    // Security filter through cars
    if (accountIds.size > 0) {
      filtersAppliedQty++;
      const accountId = [...accountIds][0]; // All should be same account
      query.whereExists(function (this: any) {
        this.select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.SERVICE_INTERVAL_ACCOUNTS}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    // Apply status filter from parent
    const { hasStatus } = this.getConfig();
    if (hasStatus === true) {
      filtersAppliedQty++;
      query.where(FIELDS.STATUS, '!=', 300); // STATUSES.REMOVED
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
