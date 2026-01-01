// ./src/gateways/tables/SmsHistoryItemGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class SmsHistoryItemGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.SMS_HISTORY_ITEMS,
      hasStatus: false,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: false,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.SMS_HISTORY_ITEMS}.*`],
      idField: `${TABLES.SMS_HISTORY_ITEMS}.${FIELDS.ID}`,
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
    const { sid, direction, fromNumber, toNumber, searchKeyword } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (sid) {
      query.whereIn(FIELDS.SID, castArray(sid));
    }

    if (direction) {
      query.whereIn(FIELDS.DIRECTION, castArray(direction));
    }

    if (fromNumber) {
      query.whereIn(FIELDS.FROM_NUMBER, castArray(fromNumber));
    }

    if (toNumber) {
      query.whereIn(FIELDS.TO_NUMBER, castArray(toNumber));
    }

    if (searchKeyword) {
      query.where(FIELDS.BODY, 'ilike', `%${searchKeyword}%`);
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { sid, direction } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (sid != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.SID, castArray(sid));
    }

    if (direction != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.DIRECTION, castArray(direction));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { sid, direction } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (sid != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.SID, castArray(sid));
    }

    if (direction != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.DIRECTION, castArray(direction));
    }

    return filtersAppliedQty;
  }
}

export { SmsHistoryItemGw };
