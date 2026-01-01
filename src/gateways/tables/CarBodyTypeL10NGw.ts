// ./src/gateways/tables/CarBodyTypeL10NGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';
import { castArray } from 'lodash';

class CarBodyTypeL10NGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CAR_BODY_TYPE_L10N,
      hasStatus: false,
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

  async onListFilter(query: any, filterParams: any) {
    const { carBodyTypeId, lang } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (carBodyTypeId) {
      query.whereIn(FIELDS.CAR_BODY_TYPE_ID, castArray(carBodyTypeId));
    }

    if (lang) {
      query.whereIn(FIELDS.LANG, castArray(lang));
    }
  }
}

export { CarBodyTypeL10NGw };
