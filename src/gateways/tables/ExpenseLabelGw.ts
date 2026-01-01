// ./src/gateways/tables/ExpenseLabelGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class ExpenseLabelGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_LABELS,
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
      selectFields: [`${TABLES.EXPENSE_LABELS}.*`],
      idField: `${TABLES.EXPENSE_LABELS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.LAST_TIME_USED,
          order: SORT_ORDER.DESC,
        },
        {
          name: FIELDS.LABEL_NAME,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { accountId, labelName, normalizedName, searchKeyword } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (labelName) {
      query.whereIn(FIELDS.LABEL_NAME, castArray(labelName));
    }

    if (normalizedName) {
      query.whereIn(FIELDS.NORMALIZED_NAME, castArray(normalizedName));
    }

    if (searchKeyword) {
      query.where(FIELDS.LABEL_NAME, 'ilike', `%${searchKeyword}%`);
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

export { ExpenseLabelGw };
