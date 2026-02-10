import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class TireSetItemGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.TIRE_SET_ITEMS,
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
      selectFields: [`${TABLES.TIRE_SET_ITEMS}.*`],
      idField: `${TABLES.TIRE_SET_ITEMS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.CREATED_AT,
          order: SORT_ORDER.DESC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const {
      id,
      accountId,
      tireSetId,
      expenseId,
      brand,
      position,
      tireCondition,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(`${TABLES.TIRE_SET_ITEMS}.${FIELDS.ID}`, castArray(id));
    }

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (tireSetId) {
      query.whereIn(FIELDS.TIRE_SET_ID, castArray(tireSetId));
    }

    if (expenseId) {
      query.whereIn(FIELDS.EXPENSE_ID, castArray(expenseId));
    }

    if (brand) {
      query.whereIn(FIELDS.BRAND, castArray(brand));
    }

    if (position) {
      query.whereIn(FIELDS.POSITION, castArray(position));
    }

    if (tireCondition) {
      query.whereIn(FIELDS.TIRE_CONDITION, castArray(tireCondition));
    }

    if (searchKeyword) {
      query.where(function (builder) {
        builder.where(FIELDS.BRAND, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.MODEL, 'ilike', `%${searchKeyword}%`);
      });
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

export { TireSetItemGw };