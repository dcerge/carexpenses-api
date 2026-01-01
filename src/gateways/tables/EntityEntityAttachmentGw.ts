// ./src/gateways/tables/EntityEntityAttachmentGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class EntityEntityAttachmentGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.ENTITY_ENTITY_ATTACHMENTS,
      hasStatus: false,
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
      filterByUserField: undefined,
      selectFields: [`${TABLES.ENTITY_ENTITY_ATTACHMENTS}.*`],
      idField: `${TABLES.ENTITY_ENTITY_ATTACHMENTS}.${FIELDS.ID}`,
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
    const { entityTypeId, entityId, entityAttachmentId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (entityTypeId) {
      query.whereIn(FIELDS.ENTITY_TYPE_ID, castArray(entityTypeId));
    }

    if (entityId) {
      query.whereIn(FIELDS.ENTITY_ID, castArray(entityId));
    }

    if (entityAttachmentId) {
      query.whereIn(FIELDS.ENTITY_ATTACHMENT_ID, castArray(entityAttachmentId));
    }

    // Security filter through entity_attachments -> cars join
    if (accountId) {
      query.innerJoin(TABLES.ENTITY_ATTACHMENTS, function (this: any) {
        this.on(
          `${TABLES.ENTITY_ATTACHMENTS}.${FIELDS.ID}`,
          '=',
          `${TABLES.ENTITY_ENTITY_ATTACHMENTS}.${FIELDS.ENTITY_ATTACHMENT_ID}`,
        );
      });
      query.innerJoin(TABLES.CARS, function (this: any) {
        this.on(`${TABLES.CARS}.${FIELDS.ID}`, '=', `${TABLES.ENTITY_ATTACHMENTS}.${FIELDS.CAR_ID}`);
        this.andOn(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, '=', self.getDb().raw('?', accountId));
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { entityTypeId, entityId, entityAttachmentId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (entityTypeId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ENTITY_TYPE_ID, castArray(entityTypeId));
    }

    if (entityId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ENTITY_ID, castArray(entityId));
    }

    if (entityAttachmentId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ENTITY_ATTACHMENT_ID, castArray(entityAttachmentId));
    }

    // Security filter through entity_attachments -> cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.ENTITY_ATTACHMENTS)
          .innerJoin(TABLES.CARS, `${TABLES.CARS}.${FIELDS.ID}`, `${TABLES.ENTITY_ATTACHMENTS}.${FIELDS.CAR_ID}`)
          .whereRaw(
            `${TABLES.ENTITY_ATTACHMENTS}.${FIELDS.ID} = ${TABLES.ENTITY_ENTITY_ATTACHMENTS}.${FIELDS.ENTITY_ATTACHMENT_ID}`,
          )
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { entityTypeId, entityId, entityAttachmentId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (entityTypeId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ENTITY_TYPE_ID, castArray(entityTypeId));
    }

    if (entityId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ENTITY_ID, castArray(entityId));
    }

    if (entityAttachmentId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ENTITY_ATTACHMENT_ID, castArray(entityAttachmentId));
    }

    // Security filter through entity_attachments -> cars
    if (accountId != null) {
      filtersAppliedQty++;
      query.whereExists(function () {
        self
          .getBuilder()
          .select('*')
          .from(TABLES.ENTITY_ATTACHMENTS)
          .innerJoin(TABLES.CARS, `${TABLES.CARS}.${FIELDS.ID}`, `${TABLES.ENTITY_ATTACHMENTS}.${FIELDS.CAR_ID}`)
          .whereRaw(
            `${TABLES.ENTITY_ATTACHMENTS}.${FIELDS.ID} = ${TABLES.ENTITY_ENTITY_ATTACHMENTS}.${FIELDS.ENTITY_ATTACHMENT_ID}`,
          )
          .where(`${TABLES.CARS}.${FIELDS.ACCOUNT_ID}`, accountId);
      });
    }

    return filtersAppliedQty;
  }
}

export { EntityEntityAttachmentGw };
