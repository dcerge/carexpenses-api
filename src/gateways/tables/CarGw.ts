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

  async getActiveCarsIds(filterParams: any): Promise<any> {
    const { accountId, id } = filterParams ?? {};

    const query = this.getBuilder().select(FIELDS.ID);

    query.whereNull(FIELDS.REMOVED_AT);

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (id) {
      query.whereIn(FIELDS.ID, castArray(id));
    }

    const records = await query;

    return records.map(record => record.id);
  }

  async getDistinctMakeModelYear(): Promise<{ makeName: string; model: string; modelYear: number }[]> {
    const result = await this.getDb().runRawQuery(
      `SELECT DISTINCT
       UPPER(TRIM(vm.make_name)) AS make_name,
       UPPER(TRIM(c.model))     AS model,
       c.manufactured_in        AS model_year
     FROM ${config.dbSchema}.${TABLES.CARS} c
     INNER JOIN ${config.dbSchema}.${TABLES.VEHICLE_MAKES} vm ON vm.id = c.make_id
     WHERE c.${FIELDS.REMOVED_AT} IS NULL
       AND c.${FIELDS.MAKE_ID} IS NOT NULL
       AND c.${FIELDS.MODEL} IS NOT NULL AND TRIM(c.${FIELDS.MODEL}) != ''
       AND c.manufactured_in IS NOT NULL
     ORDER BY make_name, model, model_year`,
      [],
    );

    return (result?.rows || []).map((row: any) => ({
      makeName: row.make_name,
      model: row.model,
      modelYear: row.model_year,
    }));
  }

  async findCarsByMakeModelYear(
    makeName: string,
    model: string,
    modelYear: number
  ): Promise<{ id: string; accountId: string }[]> {
    const result = await this.getDb().runRawQuery(
      `SELECT c.${FIELDS.ID}, c.${FIELDS.ACCOUNT_ID}
     FROM ${config.dbSchema}.${TABLES.CARS} c
     JOIN ${config.dbSchema}.${TABLES.VEHICLE_MAKES} vm
       ON vm.${FIELDS.ID} = c.${FIELDS.MAKE_ID}
     WHERE UPPER(TRIM(vm.${FIELDS.MAKE_NAME})) = ?
       AND UPPER(TRIM(c.${FIELDS.MODEL})) = ?
       AND c.${FIELDS.MANUFACTURED_IN} = ?
       AND c.${FIELDS.REMOVED_AT} IS NULL`,
      [makeName.toUpperCase().trim(), model.toUpperCase().trim(), modelYear]
    );

    return (result?.rows || []).map((row: any) => ({
      id: row.id,
      accountId: row.account_id,
    }));
  }
}

export { CarGw };
