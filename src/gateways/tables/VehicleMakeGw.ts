// ./src/gateways/tables/VehicleMakeGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class VehicleMakeGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.VEHICLE_MAKES,
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
          name: FIELDS.MAKE_NAME,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }
}

export { VehicleMakeGw };
