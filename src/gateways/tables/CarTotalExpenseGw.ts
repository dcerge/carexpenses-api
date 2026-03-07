// ./src/gateways/tables/CarTotalExpenseGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class CarTotalExpenseGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_TOTAL_EXPENSES,
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
      selectFields: [`${TABLES.CAR_TOTAL_EXPENSES}.*`],
      idField: `${TABLES.CAR_TOTAL_EXPENSES}.${FIELDS.CAR_ID}`,
      idFieldUpdateRemove: FIELDS.CAR_ID,
      defaultSorting: [
        {
          name: FIELDS.CAR_ID,
          order: SORT_ORDER.ASC,
        },
        {
          name: FIELDS.HOME_CURRENCY,
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
    const { carId, homeCurrency, expenseKindId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (carId) {
      query.whereIn(`${TABLES.CAR_TOTAL_EXPENSES}.${FIELDS.CAR_ID}`, castArray(carId));
    }

    if (homeCurrency) {
      query.whereIn(FIELDS.HOME_CURRENCY, castArray(homeCurrency));
    }

    if (expenseKindId) {
      query.whereIn(FIELDS.EXPENSE_KIND_ID, castArray(expenseKindId));
    }

    // Security filter through cars join
    if (accountId) {
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.CAR_TOTAL_EXPENSES}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId))
        this.onNull(`${TABLES.CARS}.${FIELDS.REMOVED_AT}`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { carId, homeCurrency, expenseKindId, accountId } = whereParams || {};
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

    if (expenseKindId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_KIND_ID, castArray(expenseKindId));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_TOTAL_EXPENSES}.${FIELDS.CAR_ID}`)
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { carId, homeCurrency, expenseKindId, accountId } = whereParams || {};
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

    if (expenseKindId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_KIND_ID, castArray(expenseKindId));
    }

    // Security filter through cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.CARS)
          .whereRaw(`${TABLES.CARS}.${FIELDS.ID} = ${TABLES.CAR_TOTAL_EXPENSES}.${FIELDS.CAR_ID}`)
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
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.CAR_TOTAL_EXPENSES}${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  public clear(carId): void {
    this.loader.clear(carId);
  }

  /**
   * Fetch expense totals for a list of cars, aggregated by expense category.
   * Joins expense_kinds → expense_categories to resolve category codes, and
   * optionally joins expense_category_l_10_n for localized category names.
   *
   * Returns one row per car × home_currency × expense_category, summing
   * amount and records_count across all expense_kinds within that category.
   *
   * @param carIds     Array of car UUIDs
   * @param accountId  Account UUID for security filtering
   * @param lang       ISO 639-1 language code for name localization (default 'en')
   */
  async listByCategoryForCars(
    carIds: string[],
    accountId: string,
    lang: string = 'en',
  ): Promise<Array<{
    carId: string;
    homeCurrency: string;
    categoryId: number;
    categoryCode: string;
    categoryName: string | null;
    totalAmount: number;
    totalRecordsCount: number;
  }>> {
    if (!carIds || carIds.length === 0) {
      return [];
    }

    const schema = config.dbSchema;
    const carPlaceholders = carIds.map(() => '?').join(', ');

    const query = `
      SELECT
        cte.${FIELDS.CAR_ID}                          AS car_id,
        cte.${FIELDS.HOME_CURRENCY}                   AS home_currency,
        ec.${FIELDS.ID}                               AS category_id,
        ec.${FIELDS.CODE}                             AS category_code,
        ecl.${FIELDS.NAME}                            AS category_name,
        COALESCE(SUM(cte.${FIELDS.AMOUNT}), 0)        AS total_amount,
        COALESCE(SUM(cte.${FIELDS.RECORDS_COUNT}), 0) AS total_records_count
      FROM ${schema}.${TABLES.CAR_TOTAL_EXPENSES} cte
      INNER JOIN ${schema}.${TABLES.CARS} c
        ON c.${FIELDS.ID} = cte.${FIELDS.CAR_ID}
        AND c.${FIELDS.ACCOUNT_ID} = ?
        AND c.${FIELDS.REMOVED_AT} IS NULL
      INNER JOIN ${schema}.${TABLES.EXPENSE_KINDS} ek
        ON ek.${FIELDS.ID} = cte.${FIELDS.EXPENSE_KIND_ID}
      INNER JOIN ${schema}.${TABLES.EXPENSE_CATEGORIES} ec
        ON ec.${FIELDS.ID} = ek.${FIELDS.EXPENSE_CATEGORY_ID}
      LEFT JOIN ${schema}.${TABLES.EXPENSE_CATEGORY_L10N} ecl
        ON ecl.${FIELDS.EXPENSE_CATEGORY_ID} = ec.${FIELDS.ID}
        AND ecl.${FIELDS.LANG} = ?
      WHERE cte.${FIELDS.CAR_ID} IN (${carPlaceholders})
      GROUP BY
        cte.${FIELDS.CAR_ID},
        cte.${FIELDS.HOME_CURRENCY},
        ec.${FIELDS.ID},
        ec.${FIELDS.CODE},
        ecl.${FIELDS.NAME}
      ORDER BY
        cte.${FIELDS.CAR_ID},
        cte.${FIELDS.HOME_CURRENCY},
        ec.${FIELDS.ORDER_NO},
        ec.${FIELDS.ID}
    `;

    const bindings = [accountId, lang, ...carIds];

    const result = await this.getDb().runRawQuery(query, bindings);
    const rows = result?.rows || [];

    return rows.map((row: any) => ({
      carId: row.car_id,
      homeCurrency: row.home_currency,
      categoryId: Number(row.category_id),
      categoryCode: row.category_code,
      categoryName: row.category_name ?? null,
      totalAmount: Number(row.total_amount) || 0,
      totalRecordsCount: Number(row.total_records_count) || 0,
    }));
  }
}

export { CarTotalExpenseGw };