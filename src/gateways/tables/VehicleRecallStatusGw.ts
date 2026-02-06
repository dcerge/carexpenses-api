// ./src/gateways/VehicleRecallStatusGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES, VEHICLE_RECALL_STATUSES_STATUSES } from '../../database';

class VehicleRecallStatusGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.VEHICLE_RECALL_STATUSES,
      hasStatus: false, // if it is true then the BaseGateway will add status filter automaticallyl and we do no need it
      hasVersion: true,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: true,
      hasCreatedBy: true,
      hasUpdatedBy: true,
      hasRemovedBy: true,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.VEHICLE_RECALL_STATUSES}.*`],
      idField: `${TABLES.VEHICLE_RECALL_STATUSES}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
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
      carId,
      vehicleRecallId,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (carId) {
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (vehicleRecallId) {
      query.whereIn(FIELDS.VEHICLE_RECALL_ID, castArray(vehicleRecallId));
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, carId, vehicleRecallId } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (vehicleRecallId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.VEHICLE_RECALL_ID, castArray(vehicleRecallId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, carId, vehicleRecallId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (vehicleRecallId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.VEHICLE_RECALL_ID, castArray(vehicleRecallId));
    }

    return filtersAppliedQty;
  }

  async countByStatus(filterParams: any): Promise<{ status: number; count: number }[]> {
    const { accountId, carId } = filterParams ?? {};

    const sqlFilter: string[] = [`${FIELDS.REMOVED_AT} IS NULL`];
    const bindings: any[] = [];

    if (accountId) {
      sqlFilter.push(`${FIELDS.ACCOUNT_ID} = ?`);
      bindings.push(accountId);
    }

    if (carId) {
      sqlFilter.push(`${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    const filterStr = sqlFilter.join(' AND ');

    const result = await this.getDb().runRawQuery(
      `SELECT ${FIELDS.STATUS} AS status, COUNT(1) AS count
       FROM ${config.dbSchema}.${TABLES.VEHICLE_RECALL_STATUSES}
       WHERE ${filterStr}
       GROUP BY ${FIELDS.STATUS}`,
      bindings,
    );

    return (result?.rows || []).map((row: any) => ({
      status: Number(row.status),
      count: Number(row.count),
    }));
  }

  async findExistingLinks(
    vehicleRecallIds: string[],
  ): Promise<{ accountId: string; carId: string; vehicleRecallId: string }[]> {
    if (vehicleRecallIds.length === 0) {
      return [];
    }

    const placeholders = vehicleRecallIds.map(() => '?').join(', ');

    const result = await this.getDb().runRawQuery(
      `SELECT ${FIELDS.ACCOUNT_ID}, ${FIELDS.CAR_ID}, ${FIELDS.VEHICLE_RECALL_ID}
     FROM ${config.dbSchema}.${TABLES.VEHICLE_RECALL_STATUSES}
     WHERE ${FIELDS.VEHICLE_RECALL_ID} IN (${placeholders})
       AND ${FIELDS.REMOVED_AT} IS NULL`,
      vehicleRecallIds,
    );

    return (result?.rows || []).map((row: any) => ({
      accountId: row.account_id,
      carId: row.car_id,
      vehicleRecallId: row.vehicle_recall_id,
    }));
  }
}

export { VehicleRecallStatusGw };