// ./src/gateways/tables/CarBodyTypeL10NGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class ServiceIntervalDefaultGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.SERVICE_INTERVAL_DEFAULTS,
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
      defaultSorting: [
        {
          name: FIELDS.ID,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }
}

export { ServiceIntervalDefaultGw };
