// ./src/gateways/tables/GloveboxDocumentFileGw.ts
import { castArray } from 'lodash';

import { BaseGateway, BaseGatewayPropsInterface } from '@sdflc/backend-helpers';
import { SORT_ORDER } from '@sdflc/utils';

import { FIELDS, TABLES } from '../../database';

class GloveboxDocumentFileGw extends BaseGateway {
  constructor(props: BaseGatewayPropsInterface) {
    super({
      ...props,
      table: TABLES.GLOVEBOX_DOCUMENT_FILES,
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
      selectFields: [`${TABLES.GLOVEBOX_DOCUMENT_FILES}.*`],
      idField: `${TABLES.GLOVEBOX_DOCUMENT_FILES}.${FIELDS.ID}`,
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
    const { gloveboxDocumentId, uploadedFileId, accountId } = filterParams || {};
    const self = this;

    await super.onListFilter(query, filterParams);

    if (gloveboxDocumentId) {
      query.whereIn(FIELDS.GLOVEBOX_DOCUMENT_ID, castArray(gloveboxDocumentId));
    }

    if (uploadedFileId) {
      query.whereIn(FIELDS.UPLOADED_FILE_ID, castArray(uploadedFileId));
    }

    // Security filter through glovebox_documents join
    if (accountId) {
      query.innerJoin(TABLES.GLOVEBOX_DOCUMENTS, function (this: any) {
        this.on(
          `${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ID}`,
          '=',
          `${TABLES.GLOVEBOX_DOCUMENT_FILES}.${FIELDS.GLOVEBOX_DOCUMENT_ID}`,
        );
      });
      query.where(`${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ACCOUNT_ID}`, accountId);
      query.whereNull(`${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.REMOVED_AT}`);
    }
  }

  async onUpdateFilter(query: any, whereParams: any): Promise<number> {
    const { gloveboxDocumentId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onUpdateFilter(query, whereParams);

    if (gloveboxDocumentId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.GLOVEBOX_DOCUMENT_ID, castArray(gloveboxDocumentId));
    }

    // Security filter through glovebox_documents
    // if (accountId != null) {
    //   filtersAppliedQty++;
    //   query.whereExists(function () {
    //     this.select('*')
    //       .from(TABLES.GLOVEBOX_DOCUMENTS)
    //       .whereRaw(
    //         `${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ID} = ${TABLES.GLOVEBOX_DOCUMENT_FILES}.${FIELDS.GLOVEBOX_DOCUMENT_ID}`,
    //       )
    //       .where(`${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ACCOUNT_ID}`, accountId)
    //       .whereNull(`${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.REMOVED_AT}`);
    //   });
    // }

    return filtersAppliedQty;
  }

  async onRemoveFilter(query: any, whereParams: any): Promise<number> {
    const { gloveboxDocumentId, accountId } = whereParams || {};
    const self = this;

    let filtersAppliedQty = await super.onRemoveFilter(query, whereParams);

    if (gloveboxDocumentId != null) {
      filtersAppliedQty++;
      query.whereIn(FIELDS.GLOVEBOX_DOCUMENT_ID, castArray(gloveboxDocumentId));
    }

    // Security filter through glovebox_documents
    // if (accountId != null) {
    //   filtersAppliedQty++;
    //   query.whereExists(function () {
    //     this.select('*')
    //       .from(TABLES.GLOVEBOX_DOCUMENTS)
    //       .whereRaw(
    //         `${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ID} = ${TABLES.GLOVEBOX_DOCUMENT_FILES}.${FIELDS.GLOVEBOX_DOCUMENT_ID}`,
    //       )
    //       .where(`${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.ACCOUNT_ID}`, accountId)
    //       .whereNull(`${TABLES.GLOVEBOX_DOCUMENTS}.${FIELDS.REMOVED_AT}`);
    //   });
    // }

    return filtersAppliedQty;
  }

  /**
   * Get all files for multiple documents in a single query (batch fetch)
   * Returns a map of documentId -> files[]
   */
  async getFilesForDocuments(documentIds: string[], accountId: string): Promise<Map<string, any[]>> {
    const files = await this.list({
      filter: {
        gloveboxDocumentId: documentIds,
        accountId,
      }
    });

    const filesByDocument = new Map<string, any[]>();

    for (const file of files.data || []) {
      const docId = file[FIELDS.GLOVEBOX_DOCUMENT_ID];
      if (!filesByDocument.has(docId)) {
        filesByDocument.set(docId, []);
      }
      filesByDocument.get(docId)!.push(file);
    }

    return filesByDocument;
  }
}

export { GloveboxDocumentFileGw };