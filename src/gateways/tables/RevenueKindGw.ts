// ./src/gateways/tables/RevenueKindGw.ts
import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';
import { castArray } from 'lodash';

class RevenueKindGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.REVENUE_KINDS,
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
      selectFields: [`${TABLES.REVENUE_KINDS}.*`],
      idField: `${TABLES.REVENUE_KINDS}.${FIELDS.ID}`,
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
    const { revenueCategoryId, lang } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (revenueCategoryId) {
      query.whereIn(FIELDS.REVENUE_CATEGORY_ID, castArray(revenueCategoryId));
    }

    if (lang) {
      const self = this;

      query.innerJoin(TABLES.REVENUE_KIND_L10N, function (this: any) {
        this.on(`${TABLES.REVENUE_KIND_L10N}.${FIELDS.REVENUE_KIND_ID}`, '=', `${TABLES.REVENUE_KINDS}.${FIELDS.ID}`);
        this.andOn(`${TABLES.REVENUE_KIND_L10N}.${FIELDS.LANG}`, '=', self.getDb().raw('?', lang));
      });
    }
  }
}

export { RevenueKindGw };