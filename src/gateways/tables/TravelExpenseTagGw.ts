// ./src/gateways/tables/TravelExpenseTagGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class TravelExpenseTagGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.TRAVEL_EXPENSE_TAGS,
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
      selectFields: [`${TABLES.TRAVEL_EXPENSE_TAGS}.*`],
      idField: `${TABLES.TRAVEL_EXPENSE_TAGS}.${FIELDS.TRAVEL_ID}`,
      idFieldUpdateRemove: FIELDS.TRAVEL_ID,
      defaultSorting: [
        {
          name: FIELDS.ORDER_NO,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { travelId, expenseTagId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (travelId) {
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (expenseTagId) {
      query.whereIn(FIELDS.EXPENSE_TAG_ID, castArray(expenseTagId));
    }

    // Security filter through travels join
    if (accountId) {
      query.innerJoin(TABLES.TRAVELS, function (this: any) {
        this.on(`${TABLES.TRAVELS}.${FIELDS.ID}`, '=', `${TABLES.TRAVEL_EXPENSE_TAGS}.${FIELDS.TRAVEL_ID}`);
        this.andOn(`${TABLES.TRAVELS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { travelId, expenseTagId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (travelId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (expenseTagId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_TAG_ID, castArray(expenseTagId));
    }

    // Security filter through travels
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.TRAVELS)
          .whereRaw(`${TABLES.TRAVELS}.${FIELDS.ID} = ${TABLES.TRAVEL_EXPENSE_TAGS}.${FIELDS.TRAVEL_ID}`)
          .where(`${TABLES.TRAVELS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { travelId, expenseTagId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (travelId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.TRAVEL_ID, castArray(travelId));
    }

    if (expenseTagId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.EXPENSE_TAG_ID, castArray(expenseTagId));
    }

    // Security filter through travels
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.TRAVELS)
          .whereRaw(`${TABLES.TRAVELS}.${FIELDS.ID} = ${TABLES.TRAVEL_EXPENSE_TAGS}.${FIELDS.TRAVEL_ID}`)
          .where(`${TABLES.TRAVELS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }
}

export { TravelExpenseTagGw };
