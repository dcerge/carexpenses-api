// ./src/gateways/tables/RefuelGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class RefuelGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.REFUELS,
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
      selectFields: [`${TABLES.REFUELS}.*`],
      idField: `${TABLES.REFUELS}.${FIELDS.ID}`,
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
    const { id, accountId, isFullTank, fuelGrade } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(`${TABLES.REFUELS}.${FIELDS.ID}`, castArray(id));
    }

    if (isFullTank != null) {
      query.where(FIELDS.IS_FULL_TANK, isFullTank);
    }

    if (fuelGrade) {
      query.whereIn(FIELDS.FUEL_GRADE, castArray(fuelGrade));
    }

    // Security filter through expense_bases join
    if (accountId) {
      query.innerJoin(TABLES.EXPENSE_BASES, function (this: any) {
        this.on(`${TABLES.EXPENSE_BASES}.${FIELDS.ID}`, '=', `${TABLES.REFUELS}.${FIELDS.ID}`);
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
          .whereRaw(`${TABLES.EXPENSE_BASES}.${FIELDS.ID} = ${TABLES.REFUELS}.${FIELDS.ID}`)
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
          .whereRaw(`${TABLES.EXPENSE_BASES}.${FIELDS.ID} = ${TABLES.REFUELS}.${FIELDS.ID}`)
          .where(`${TABLES.EXPENSE_BASES}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }
}

export { RefuelGw };
