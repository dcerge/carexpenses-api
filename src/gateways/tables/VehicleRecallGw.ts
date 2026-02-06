// ./src/gateways/VehicleRecallGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class VehicleRecallGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.VEHICLE_RECALLS,
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
      selectFields: [`${TABLES.VEHICLE_RECALLS}.*`],
      idField: `${TABLES.VEHICLE_RECALLS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      defaultSorting: [
        {
          name: FIELDS.REPORT_RECEIVED_DATE,
          order: SORT_ORDER.DESC,
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
      lookupId,
      source,
      campaignNumber,
      manufacturer,
      parkIt,
      parkOutside,
      otaUpdate,
      reportReceivedDateFrom,
      reportReceivedDateTo,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (id) {
      query.whereIn(FIELDS.ID, castArray(id));
    }

    if (lookupId) {
      query.whereIn(FIELDS.LOOKUP_ID, castArray(lookupId));
    }

    if (source) {
      query.whereIn(FIELDS.SOURCE, castArray(source));
    }

    if (campaignNumber) {
      query.whereIn(FIELDS.CAMPAIGN_NUMBER, castArray(campaignNumber));
    }

    if (manufacturer) {
      query.whereIn(FIELDS.MANUFACTURER, castArray(manufacturer));
    }

    if (parkIt != null) {
      query.where(FIELDS.PARK_IT, parkIt);
    }

    if (parkOutside != null) {
      query.where(FIELDS.PARK_OUTSIDE, parkOutside);
    }

    if (otaUpdate != null) {
      query.where(FIELDS.OTA_UPDATE, otaUpdate);
    }

    if (reportReceivedDateFrom) {
      query.where(FIELDS.REPORT_RECEIVED_DATE, '>=', reportReceivedDateFrom);
    }

    if (reportReceivedDateTo) {
      query.where(FIELDS.REPORT_RECEIVED_DATE, '<=', reportReceivedDateTo);
    }

    if (searchKeyword) {
      query.where(function (qb: any) {
        qb.where(FIELDS.SUMMARY, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.COMPONENT, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.CONSEQUENCE, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.REMEDY, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.CAMPAIGN_NUMBER, 'ilike', `%${searchKeyword}%`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { lookupId, source, campaignNumber } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (lookupId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.LOOKUP_ID, castArray(lookupId));
    }

    if (source != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.SOURCE, castArray(source));
    }

    if (campaignNumber != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAMPAIGN_NUMBER, castArray(campaignNumber));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { lookupId, source, campaignNumber } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (lookupId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.LOOKUP_ID, castArray(lookupId));
    }

    if (source != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.SOURCE, castArray(source));
    }

    if (campaignNumber != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAMPAIGN_NUMBER, castArray(campaignNumber));
    }

    return filtersAppliedQty;
  }
}

export { VehicleRecallGw };