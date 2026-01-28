// ./src/gateways/tables/CarTotalSummaryGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class CarTotalSummaryGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_TOTAL_SUMMARIES,
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
      selectFields: [`${TABLES.CAR_TOTAL_SUMMARIES}.*`],
      idField: `${TABLES.CAR_TOTAL_SUMMARIES}.${FIELDS.CAR_ID}`,
      idFieldUpdateRemove: FIELDS.CAR_ID,
      returnFields: [`${TABLES.CAR_TOTAL_SUMMARIES}.*`],
      noCache: true,
      defaultSorting: [
        {
          name: FIELDS.CAR_ID,
          order: SORT_ORDER.ASC,
        },
        {
          name: FIELDS.HOME_CURRENCY,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { carId, homeCurrency, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (carId) {
      query.whereIn(`${TABLES.CAR_TOTAL_SUMMARIES}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (homeCurrency) {
      query.whereIn(FIELDS.HOME_CURRENCY, castArray(homeCurrency));
    }

    // Security filter through cars join
    if (accountId) {
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.CAR_TOTAL_SUMMARIES}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId))
        this.onNull(`${TABLES.CARS}.${FIELDS.REMOVED_AT}`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carId, homeCurrency, accountId } = whereParams || {};
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

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_TOTAL_SUMMARIES}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { carId, homeCurrency, accountId } = whereParams || {};
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

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_TOTAL_SUMMARIES}.${FIELDS.CAR_ID}`)
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
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.CAR_TOTAL_SUMMARIES}${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Get the maximum known mileage for each car across all currency rows.
   * Since car_total_summaries can have multiple rows per car (one per currency),
   * this returns the highest latest_known_mileage for each car.
   *
   * @param carIds Array of car IDs to fetch mileage for
   * @param accountId Account ID for security filtering
   * @returns Map of carId -> maxMileage (in kilometers)
   */
  async getMaxMileageByCarIds(carIds: string[], accountId: string): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (!carIds || carIds.length === 0) {
      return result;
    }

    // Create placeholders for the IN clause
    const placeholders = carIds.map(() => '?').join(', ');

    const query = `
      SELECT 
        cts.${FIELDS.CAR_ID} as car_id,
        MAX(cts.${FIELDS.LATEST_KNOWN_MILEAGE}) as max_mileage
      FROM ${config.dbSchema}.${TABLES.CAR_TOTAL_SUMMARIES} cts
      INNER JOIN ${config.dbSchema}.${TABLES.CARS} c 
        ON c.${FIELDS.ID} = cts.${FIELDS.CAR_ID}
        AND c.${FIELDS.ACCOUNT_ID} = ?
      WHERE cts.${FIELDS.CAR_ID} IN (${placeholders})
      GROUP BY cts.${FIELDS.CAR_ID}
    `;

    const bindings = [accountId, ...carIds];

    const queryResult = await this.getDb().runRawQuery(query, bindings);

    if (queryResult?.rows) {
      for (const row of queryResult.rows) {
        result.set(row.car_id, Number(row.max_mileage) || 0);
      }
    }

    return result;
  }
}

export { CarTotalSummaryGw };
