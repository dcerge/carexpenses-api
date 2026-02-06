// ./src/gateways/VehicleRecallLookupGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class VehicleRecallLookupGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.VEHICLE_RECALL_LOOKUPS,
      hasStatus: false, // if it is true then the BaseGateway will add status filter automaticallyl and we do no need it
      hasVersion: true,
      hasLang: false,
      hasUserId: false,
      hasCreatedAt: true,
      hasUpdatedAt: true,
      hasRemovedAt: true,
      hasCreatedBy: false,
      hasUpdatedBy: false,
      hasRemovedBy: false,
      hasRemovedAtStr: false,
      filterByUserField: undefined,
      selectFields: [`${TABLES.VEHICLE_RECALL_LOOKUPS}.*`],
      idField: `${TABLES.VEHICLE_RECALL_LOOKUPS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.FETCHED_AT,
          order: SORT_ORDER.ASC,
        },
      ],
    });
  }

  async onListFilter(query: any, filterParams: any) {
    const {
      id,
      makeName,
      model,
      modelYear,
      source,
      countryCode,
      nextFetchBefore,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (makeName) {
      query.whereIn(FIELDS.MAKE_NAME, castArray(makeName));
    }

    if (model) {
      query.whereIn(FIELDS.MODEL, castArray(model));
    }

    if (modelYear) {
      query.whereIn(FIELDS.MODEL_YEAR, castArray(modelYear));
    }

    if (source) {
      query.whereIn(FIELDS.SOURCE, castArray(source));
    }

    if (countryCode) {
      query.whereIn(FIELDS.COUNTRY_CODE, castArray(countryCode));
    }

    // Find lookups that are due for re-fetching
    if (nextFetchBefore) {
      query.where(function (qb: any) {
        qb.where(FIELDS.NEXT_FETCH_AFTER, '<=', nextFetchBefore).orWhereNull(FIELDS.NEXT_FETCH_AFTER);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { makeName, model, modelYear, source } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (makeName != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MAKE_NAME, castArray(makeName));
    }

    if (model != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MODEL, castArray(model));
    }

    if (modelYear != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MODEL_YEAR, castArray(modelYear));
    }

    if (source != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.SOURCE, castArray(source));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { makeName, model, modelYear, source } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (makeName != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MAKE_NAME, castArray(makeName));
    }

    if (model != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MODEL, castArray(model));
    }

    if (modelYear != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.MODEL_YEAR, castArray(modelYear));
    }

    if (source != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.SOURCE, castArray(source));
    }

    return filtersAppliedQty;
  }
}

export { VehicleRecallLookupGw };