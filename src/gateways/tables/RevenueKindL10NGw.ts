// ./src/gateways/tables/RevenueKindL10NGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';
import { castArray } from 'lodash';

class RevenueKindL10NGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.REVENUE_KIND_L10N,
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
    const { revenueKindId, lang } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (revenueKindId) {
      query.whereIn(FIELDS.REVENUE_KIND_ID, castArray(revenueKindId));
    }

    if (lang) {
      query.whereIn(FIELDS.LANG, castArray(lang));
    }
  }
}

export { RevenueKindL10NGw };