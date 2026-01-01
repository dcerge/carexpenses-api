// ./src/gateways/tables/CarBodyTypeGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class CarEngineTypeGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_ENGINE_TYPES,
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
          name: FIELDS.ID,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }
}

export { CarEngineTypeGw };
