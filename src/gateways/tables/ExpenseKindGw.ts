// ./src/gateways/tables/ExpenseKindGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';
import { castArray } from 'lodash';

class ExpenseKindGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_KINDS,
      hasStatus: true,
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
      activeStatuses: [STATUSES.ACTIVE],
      selectFields: [`${TABLES.EXPENSE_KINDS}.*`],
      idField: `${TABLES.EXPENSE_KINDS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.ORDER_NO,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { expenseCategoryId, lang, canSchedule, isItMaintenance } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (expenseCategoryId) {
      query.whereIn(FIELDS.EXPENSE_CATEGORY_ID, castArray(expenseCategoryId));
    }

    if (canSchedule != null) {
      query.where(FIELDS.CAN_SCHEDULE, canSchedule);
    }

    if (isItMaintenance != null) {
      query.where(FIELDS.IS_IT_MAINTENANCE, isItMaintenance);
    }

    if (lang) {
      const self = this;

      query.innerJoin(TABLES.EXPENSE_KIND_L10N, function (this: any) {
        this.on(`${TABLES.EXPENSE_KIND_L10N}.${FIELDS.EXPENSE_KIND_ID}`, '=', `${TABLES.EXPENSE_KINDS}.${FIELDS.ID}`);
        this.andOn(`${TABLES.EXPENSE_KIND_L10N}.${FIELDS.LANG}`, '=', self.getDb().raw('?', lang));
      });
    }
  }
}

export { ExpenseKindGw };
