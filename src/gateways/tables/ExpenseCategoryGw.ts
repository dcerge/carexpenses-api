// ./src/gateways/tables/CarBodyTypeGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class ExpenseCategoryGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.EXPENSE_CATEGORIES,
      hasStatus: true,
      hasVersion: false,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: true,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      activeStatuses: [STATUSES.ACTIVE],
      defaultSorting: [
        {
          name: FIELDS.ORDER_NO,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }
}

export { ExpenseCategoryGw };
