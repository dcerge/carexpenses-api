// ./src/gateways/tables/ExpenseExpenseTagGw.ts
import { castArray, omit } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class ExpenseExpenseTagGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_EXPENSE_TAGS,
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
      hardRemove: true,
      filterByUserField: undefined,
      selectFields: [`${TABLES.EXPENSE_EXPENSE_TAGS}.*`],
      // idField: [
      //   `${TABLES.EXPENSE_EXPENSE_TAGS}.${FIELDS.EXPENSE_ID}`,
      //   `${TABLES.EXPENSE_EXPENSE_TAGS}.${FIELDS.EXPENSE_TAG_ID}`
      // ],
      //idFieldUpdateRemove: FIELDS.EXPENSE_ID,
      noCache: true,
      defaultSorting: [
        {
          name: FIELDS.ORDER_NO,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async transformOnCreate(params: any) {
    return omit(params, 'id');
  }

  async onListFilter(query: any, filterParams: any) {
    const { expenseId, expenseTagId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (expenseId) {
      query.whereIn(FIELDS.EXPENSE_ID, castArray(expenseId));
    }

    if (expenseTagId) {
      query.whereIn(FIELDS.EXPENSE_TAG_ID, castArray(expenseTagId));
    }

    // Security filter through expense_bases join
    if (accountId) {
      query.innerJoin(TABLES.EXPENSE_BASES, function (this: any) {
        this.on(`${TABLES.EXPENSE_BASES}.${FIELDS.ID}`, '=', `${TABLES.EXPENSE_EXPENSE_TAGS}.${FIELDS.EXPENSE_ID}`);
        this.andOn(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { expenseId, expenseTagId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (expenseId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_ID, castArray(expenseId));
    }

    if (expenseTagId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_TAG_ID, castArray(expenseTagId));
    }

    // Security filter through expense_bases
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.EXPENSE_BASES)
          .whereRaw(`${TABLES.EXPENSE_BASES}.${FIELDS.ID} = ${TABLES.EXPENSE_EXPENSE_TAGS}.${FIELDS.EXPENSE_ID}`)
          .where(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { expenseId, expenseTagId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (expenseId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_ID, castArray(expenseId));
    }

    if (expenseTagId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_TAG_ID, castArray(expenseTagId));
    }

    // Security filter through expense_bases
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.EXPENSE_BASES)
          .whereRaw(`${TABLES.EXPENSE_BASES}.${FIELDS.ID} = ${TABLES.EXPENSE_EXPENSE_TAGS}.${FIELDS.EXPENSE_ID}`)
          .where(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }
}

export { ExpenseExpenseTagGw };
