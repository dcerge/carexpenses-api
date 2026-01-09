// ./src/gateways/tables/CarBodyTypeL10NGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';
import { castArray } from 'lodash';

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

  async onListFilter(query: any, filterParams: any) {
    const { kindId } = filterParams || {};

    if (filterParams?.[FIELDS.ID]) {
      query.whereIn(`${TABLES.SERVICE_INTERVAL_DEFAULTS}.${FIELDS.ID}`, castArray(filterParams[FIELDS.ID]));
    }

    if (kindId) {
      query.whereIn(`${TABLES.SERVICE_INTERVAL_DEFAULTS}.${FIELDS.KIND_ID}`, castArray(kindId));
    }
  }
}

export { ServiceIntervalDefaultGw };
