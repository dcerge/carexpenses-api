// ./src/gateways/tables/RevenueGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class RevenueGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.REVENUES,
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
      selectFields: [`${TABLES.REVENUES}.*`],
      idField: `${TABLES.REVENUES}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.ID,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { id, kindId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(`${TABLES.REVENUES}.${FIELDS.ID}`, castArray(id));
    }

    if (kindId) {
      query.whereIn(FIELDS.KIND_ID, castArray(kindId));
    }

    // Security filter through expense_bases join
    if (accountId) {
      query.innerJoin(TABLES.EXPENSE_BASES, function (this: any) {
        this.on(`${TABLES.EXPENSE_BASES}.${FIELDS.ID}`, '=', `${TABLES.REVENUES}.${FIELDS.ID}`);
        this.andOn(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    // Security filter through expense_bases
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.EXPENSE_BASES)
          .whereRaw(`${TABLES.EXPENSE_BASES}.${FIELDS.ID} = ${TABLES.REVENUES}.${FIELDS.ID}`)
          .where(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    // Security filter through expense_bases
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.EXPENSE_BASES)
          .whereRaw(`${TABLES.EXPENSE_BASES}.${FIELDS.ID} = ${TABLES.REVENUES}.${FIELDS.ID}`)
          .where(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }
}

export { RevenueGw };