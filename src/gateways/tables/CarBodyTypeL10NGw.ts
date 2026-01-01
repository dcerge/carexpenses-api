// ./src/gateways/tables/CarBodyTypeL10NGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class CarBodyTypeL10NGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_BODY_TYPE_L10N,
      hasStatus: true,
      hasVersion: false,
      hasLang: true,
      hasUserId: false,
      hasCreatedAt: false,
      hasUpdatedAt: false,
      hasRemovedAt: false,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      activeStatuses: [STATUSES.ACTIVE],
      defaultSorting: [
        {
          name: FIELDS.LANG,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }
}

export { CarBodyTypeL10NGw };
