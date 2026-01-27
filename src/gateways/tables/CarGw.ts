// ./src/gateways/tables/CarGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class CarGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.CARS,
      hasStatus: true,
      hasVersion: true,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: true,
      hasCreatedBy: true,
      hasUpdatedBy: true,
      hasRemovedBy: true,
      hasRemovedAtStr: true,
      filterByUserField: undefined,
      selectFields: [`${TABLES.CARS}.*`],
      idField: `${TABLES.CARS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.LABEL,
          order: SORT_ORDER.ASC,
        },
        {
          name: FIELDS.CREATED_AT,
          order: SORT_ORDER.DESC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const {
      id,
      accountId,
      userId,
      label,
      make,
      model,
      bodyTypeId,
      transmissionTypeId,
      engineTypeId,
      makeId,
      searchKeyword,
      hasNoUploadedFileId,
      hasEntityAttachmentId,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (hasNoUploadedFileId) {
      query.whereNull(FIELDS.UPLOADED_FILE_ID);
    }

    if (hasEntityAttachmentId) {
      query.whereNotNull(FIELDS.ENTITY_ATTACHMENT_ID);
    }

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId) {
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (label) {
      query.whereIn(FIELDS.LABEL, castArray(label));
    }

    if (make) {
      query.whereIn(FIELDS.MAKE, castArray(make));
    }

    if (model) {
      query.whereIn(FIELDS.MODEL, castArray(model));
    }

    if (bodyTypeId) {
      query.whereIn(FIELDS.BODY_TYPE_ID, castArray(bodyTypeId));
    }

    if (transmissionTypeId) {
      query.whereIn(FIELDS.TRANSMISSION_TYPE_ID, castArray(transmissionTypeId));
    }

    if (engineTypeId) {
      query.whereIn(FIELDS.ENGINE_TYPE_ID, castArray(engineTypeId));
    }

    if (makeId) {
      query.whereIn(FIELDS.MAKE_ID, castArray(makeId));
    }

    if (searchKeyword) {
      query.where(FIELDS.LABEL, 'ilike', `%${searchKeyword}%`);
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, userId } = filterParams ?? {};

    const sqlFilter: string[] = [];
    const bindings: any[] = [];

    if (accountId) {
      sqlFilter.push(`${FIELDS.ACCOUNT_ID} = ?`);
      bindings.push(accountId);
    }

    if (userId) {
      sqlFilter.push(`${FIELDS.USER_ID} = ?`);
      bindings.push(userId);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.CARS} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { CarGw };
