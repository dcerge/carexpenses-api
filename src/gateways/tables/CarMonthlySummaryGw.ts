// ./src/gateways/tables/CarMonthlySummaryGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { camelKeys, SORT_ORDER } from '@sdflc/utils';

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

  /**
   * Fetch monthly summaries for specific year-month pairs.
   * Unlike list() which filters year and month independently with whereIn,
   * this method correctly handles pairs that span year boundaries.
   *
   * Example: [{year: 2025, month: 11}, {year: 2025, month: 12}, {year: 2026, month: 1}]
   *
   * @param carIds Array of car IDs to fetch
   * @param accountId Account ID for security filtering
   * @param yearMonthPairs Array of {year, month} objects
   * @returns Array of monthly summary rows (camelCase keys)
   */
  async listByYearMonthPairs(
    carIds: string[],
    accountId: string,
    yearMonthPairs: Array<{ year: number; month: number }>,
  ): Promise<any[]> {
    if (!carIds || carIds.length === 0 || !yearMonthPairs || yearMonthPairs.length === 0) {
      return [];
    }

    const carPlaceholders = carIds.map(() => '?').join(', ');

    // PostgreSQL row-value IN syntax: (year, month) IN ((?, ?), (?, ?), ...)
    const pairPlaceholders = yearMonthPairs.map(() => '(?, ?)').join(', ');
    const pairBindings = yearMonthPairs.flatMap((p) => [p.year, p.month]);

    const query = `
      SELECT cms.*
      FROM ${config.dbSchema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
      INNER JOIN ${config.dbSchema}.${TABLES.CARS} c
        ON c.${FIELDS.ID} = cms.${FIELDS.CAR_ID}
        AND c.${FIELDS.ACCOUNT_ID} = ?
        AND c.${FIELDS.REMOVED_AT} IS NULL
      WHERE cms.${FIELDS.CAR_ID} IN (${carPlaceholders})
        AND (cms.${FIELDS.YEAR}, cms.${FIELDS.MONTH}) IN (${pairPlaceholders})
      ORDER BY cms.${FIELDS.CAR_ID}, cms.${FIELDS.YEAR} DESC, cms.${FIELDS.MONTH} DESC
    `;

    const bindings = [accountId, ...carIds, ...pairBindings];

    const result = await this.getDb().runRawQuery(query, bindings);

    return camelKeys(result?.rows || []) as any[];
  }

  /**
   * Get the earliest year/month pair that has data for any of the given cars.
   * Used to determine the back-navigation bound for the fleet summary bar.
   *
   * @param carIds Array of car IDs to check
   * @param accountId Account ID for security filtering
   * @returns { minYear, minMonth } or null if no data exists
   */
  async getMinYearMonth(
    carIds: string[],
    accountId: string,
  ): Promise<{ minYear: number; minMonth: number } | null> {
    if (!carIds || carIds.length === 0) {
      return null;
    }

    const carPlaceholders = carIds.map(() => '?').join(', ');

    const query = `
      SELECT cms.${FIELDS.YEAR} AS min_year, cms.${FIELDS.MONTH} AS min_month
      FROM ${config.dbSchema}.${TABLES.CAR_MONTHLY_SUMMARIES} cms
      INNER JOIN ${config.dbSchema}.${TABLES.CARS} c
        ON c.${FIELDS.ID} = cms.${FIELDS.CAR_ID}
        AND c.${FIELDS.ACCOUNT_ID} = ?
        AND c.${FIELDS.REMOVED_AT} IS NULL
      WHERE cms.${FIELDS.CAR_ID} IN (${carPlaceholders})
      ORDER BY cms.${FIELDS.YEAR} ASC, cms.${FIELDS.MONTH} ASC
      LIMIT 1
    `;

    const bindings = [accountId, ...carIds];

    const result = await this.getDb().runRawQuery(query, bindings);
    const row = result?.rows?.[0];

    if (!row) {
      return null;
    }

    return {
      minYear: Number(row.min_year),
      minMonth: Number(row.min_month),
    };
  }
}

export { CarMonthlySummaryGw };
