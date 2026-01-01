// ./src/gateways/tables/ExpenseTagGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class ExpenseTagGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_TAGS,
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
      hasRemovedAtStr: true,
      filterByUserField: undefined,
      selectFields: [`${TABLES.EXPENSE_TAGS}.*`],
      idField: `${TABLES.EXPENSE_TAGS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.TAG_NAME,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { accountId, tagName, normalizedName, searchKeyword } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (tagName) {
      query.whereIn(FIELDS.TAG_NAME, castArray(tagName));
    }

    if (normalizedName) {
      query.whereIn(FIELDS.NORMALIZED_NAME, castArray(normalizedName));
    }

    if (searchKeyword) {
      query.where(FIELDS.TAG_NAME, 'ilike', `%${searchKeyword}%`);
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    return filtersAppliedQty;
  }
}

export { ExpenseTagGw };
