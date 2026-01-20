// ./src/gateways/tables/GloveboxDocTypeGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class GloveboxDocTypeGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.GLOVEBOX_DOC_TYPES,
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
          name: FIELDS.ORDER_NO,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const { category, code, hasExpiration } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (category) {
      query.whereIn(FIELDS.CATEGORY, castArray(category));
    }

    if (code) {
      query.whereIn(FIELDS.CODE, castArray(code));
    }

    if (hasExpiration != null) {
      query.where(FIELDS.HAS_EXPIRATION, hasExpiration);
    }
  }
}

export { GloveboxDocTypeGw };