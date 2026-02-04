// ./src/gateways/tables/GloveboxDocumentGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER, STATUSES } from '@sdflc/utils';

import config from '../../config';
import { FIELDS, TABLES } from '../../database';

class GloveboxDocumentGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.GLOVEBOX_DOCUMENTS,
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
      selectFields: [`${TABLES.GLOVEBOX_DOCUMENTS}.*`],
      idField: `${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ID}`,
      idFieldUpdateRemove: FIELDS.ID,
      activeStatuses: [STATUSES.ACTIVE],
      defaultSorting: [
        {
          name: FIELDS.EXPIRES_AT,
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
      accountId,
      userId,
      carId,
      docTypeId,
      category,
      expiresAtFrom,
      expiresAtTo,
      isExpired,
      expiresWithinDays,
      expiredOrExpiring,
      notifyInDays,
      searchKeyword,
    } = filterParams || {};

    await super.onListFilter(query, filterParams);

    if (accountId) {
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId) {
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId) {
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    if (docTypeId) {
      query.whereIn(FIELDS.DOC_TYPE_ID, castArray(docTypeId));
    }

    // Filter by category through join with doc types
    if (category) {
      query.innerJoin(TABLES.GLOVEBOX_DOC_TYPES, function (this: any) {
        this.on(
          `${TABLES.GLOVEBOX_DOC_TYPES}.${FIELDS.ID}`,
          '=',
          `${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.DOC_TYPE_ID}`,
        );
      });
      query.whereIn(`${TABLES.GLOVEBOX_DOC_TYPES}.${FIELDS.CATEGORY}`, castArray(category));
    }

    if (expiresAtFrom) {
      query.where(FIELDS.EXPIRES_AT, '>=', expiresAtFrom);
    }

    if (expiresAtTo) {
      query.where(FIELDS.EXPIRES_AT, '<=', expiresAtTo);
    }

    // Handle expiredOrExpiring filter - takes precedence over isExpired and expiresWithinDays
    if (expiredOrExpiring === true) {
      // Get documents that are expired OR expiring within notifyInDays
      // notifyInDays is passed from Core after fetching user profile
      const days = notifyInDays ?? 14; // Default fallback

      query.whereNotNull(FIELDS.EXPIRES_AT);
      query.where(FIELDS.EXPIRES_AT, '<=', this.getDb().raw(`CURRENT_DATE + ?::integer`, [days]));
    } else if (expiresWithinDays != null) {
      // Filter for documents expiring within N days (not yet expired)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + expiresWithinDays);
      query.whereNotNull(FIELDS.EXPIRES_AT);
      query.where(FIELDS.EXPIRES_AT, '<=', futureDate.toISOString().split('T')[0]);
      query.where(FIELDS.EXPIRES_AT, '>=', new Date().toISOString().split('T')[0]);
    } else if (isExpired != null) {
      // Filter for expired documents
      if (isExpired) {
        query.whereNotNull(FIELDS.EXPIRES_AT);
        query.where(FIELDS.EXPIRES_AT, '<', this.getDb().raw(`timezone('UTC', NOW())`));
      } else {
        const self = this;
        query.where(function (qb: any) {
          qb.whereNull(FIELDS.EXPIRES_AT).orWhere(FIELDS.EXPIRES_AT, '>=', self.getDb().raw(`timezone('UTC', NOW())`));
        });
      }
    }

    if (searchKeyword) {
      query.where(function (qb: any) {
        qb.where(FIELDS.CUSTOM_TYPE_NAME, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.DOCUMENT_NUMBER, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.ISSUING_AUTHORITY, 'ilike', `%${searchKeyword}%`)
          .orWhere(FIELDS.NOTES, 'ilike', `%${searchKeyword}%`);
      });
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId } = whereParams || {};

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { accountId, userId, carId } = whereParams || {};

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (accountId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.ACCOUNT_ID, castArray(accountId));
    }

    if (userId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.USER_ID, castArray(userId));
    }

    if (carId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.CAR_ID, castArray(carId));
    }

    return filtersAppliedQty;
  }

  async count(filterParams: any): Promise<number> {
    const { accountId, userId, carId, docTypeId } = filterParams ?? {};

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

    if (carId) {
      sqlFilter.push(`${FIELDS.CAR_ID} = ?`);
      bindings.push(carId);
    }

    if (docTypeId) {
      sqlFilter.push(`${FIELDS.DOC_TYPE_ID} = ?`);
      bindings.push(docTypeId);
    }

    const filterStr = sqlFilter.length > 0 ? ' AND ' + sqlFilter.join(' AND ') : '';

    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.GLOVEBOX_DOCUMENTS} 
        WHERE ${FIELDS.REMOVED_AT} IS NULL${filterStr}`,
      bindings,
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Get documents that need reminder notifications
   * Returns documents where:
   * - expires_at is not null
   * - remind_before_days is set
   * - current date + remind_before_days >= expires_at
   * - document is not expired yet
   */
  async getDocumentsNeedingReminder(accountId?: string): Promise<any[]> {
    const query = this.getBuilder()
      .select(`${TABLES.GLOVEBOX_DOCUMENTS}.*`)
      .from(`${config.dbSchema}.${TABLES.GLOVEBOX_DOCUMENTS}`)
      .whereNotNull(FIELDS.EXPIRES_AT)
      .whereNotNull(FIELDS.REMIND_BEFORE_DAYS)
      .whereRaw(`${FIELDS.EXPIRES_AT} >= CURRENT_DATE`)
      .whereRaw(`CURRENT_DATE + ${FIELDS.REMIND_BEFORE_DAYS} >= ${FIELDS.EXPIRES_AT}`)
      .whereNull(FIELDS.REMOVED_AT);

    if (accountId) {
      query.where(FIELDS.ACCOUNT_ID, accountId);
    }

    return query;
  }

  /**
   * Get count of expired documents by account
   */
  async countExpired(accountId: string): Promise<number> {
    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.GLOVEBOX_DOCUMENTS} 
        WHERE ${FIELDS.ACCOUNT_ID} = ?
        AND ${FIELDS.REMOVED_AT} IS NULL
        AND ${FIELDS.EXPIRES_AT} IS NOT NULL
        AND ${FIELDS.EXPIRES_AT} < CURRENT_DATE`,
      [accountId],
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }

  /**
   * Get count of documents expiring soon (within specified days)
   */
  async countExpiringSoon(accountId: string, withinDays: number = 30): Promise<number> {
    const result = await this.getDb().runRawQuery(
      `SELECT COUNT(1) AS qty FROM ${config.dbSchema}.${TABLES.GLOVEBOX_DOCUMENTS} 
        WHERE ${FIELDS.ACCOUNT_ID} = ?
        AND ${FIELDS.REMOVED_AT} IS NULL
        AND ${FIELDS.EXPIRES_AT} IS NOT NULL
        AND ${FIELDS.EXPIRES_AT} >= CURRENT_DATE
        AND ${FIELDS.EXPIRES_AT} <= CURRENT_DATE + ?`,
      [accountId, withinDays],
    );

    return result?.rows?.[0]?.qty ? Number(result.rows[0].qty) : 0;
  }
}

export { GloveboxDocumentGw };