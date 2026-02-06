// ./src/core/GloveboxDocumentCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/gloveboxDocumentValidators';

dayjs.extend(utc);

interface GloveboxDocumentUpdateData {
  uploadedFilesIds: string[];
}

class GloveboxDocumentCore extends AppCore {
  private updateData: Map<string, GloveboxDocumentUpdateData> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'gloveboxDocumentGw',
      name: 'GloveboxDocument',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing glovebox documents',
        get: 'getting a glovebox document',
        getMany: 'getting multiple glovebox documents',
        create: 'creating a glovebox document',
        createMany: '',
        update: 'updating a glovebox document',
        updateMany: '',
        set: '',
        remove: 'removing a glovebox document',
        removeMany: 'removing multiple glovebox documents',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  // ===========================================================================
  // Process Item Methods
  // ===========================================================================

  /**
   * Process item on output - format dates
   */
  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    // Format timestamps
    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    // Format date fields (not timestamps, just dates)
    if (item.issuedAt !== null && item.issuedAt !== undefined) {
      item.issuedAt = dayjs(item.issuedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.effectiveAt !== null && item.effectiveAt !== undefined) {
      item.effectiveAt = dayjs(item.effectiveAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.expiresAt !== null && item.expiresAt !== undefined) {
      item.expiresAt = dayjs(item.expiresAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.inspectedAt !== null && item.inspectedAt !== undefined) {
      item.inspectedAt = dayjs(item.inspectedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  // ===========================================================================
  // Core CRUD Hooks
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    if (!accountId) {
      return {
        ...args,
        filter: {
          ...filter,
          accountId: '00000000-0000-0000-0000-000000000000', // Return empty results for undefined account
        },
      };
    }

    // Handle expiredOrExpiring filter - fetch notifyInDays from user profile
    let updatedFilter = { ...filter, accountId };

    if (filter?.expiredOrExpiring === true) {
      const userProfile = await this.getCurrentUserProfile();
      const notifyInDays = userProfile.notifyInDays ?? 14; // Default to 14 days if not set

      updatedFilter = {
        ...updatedFilter,
        notifyInDays,
      };
    }

    return {
      ...args,
      filter: updatedFilter,
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    return items.map((item: any) => this.processItemOnOut(item));
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check: verify the document belongs to the current account
    const { accountId } = this.getContext();
    if (!accountId || item.accountId !== accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();

    if (!accountId) {
      return [];
    }

    // Filter items to only include those belonging to the current account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    return filteredItems.map((item: any) => this.processItemOnOut(item));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const { uploadedFilesIds, ...restParams } = params;

    // Store data for afterCreate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`create-${requestId}`, {
      uploadedFilesIds: uploadedFilesIds || [],
    });

    const newDocument = {
      ...restParams,
      accountId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newDocument;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const requestId = this.getRequestId();
    const createInfo = this.updateData.get(`create-${requestId}`);

    if (createInfo && Array.isArray(createInfo.uploadedFilesIds) && createInfo.uploadedFilesIds.length > 0) {
      // Create additional file attachments
      const fileAttachments = createInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
        return {
          gloveboxDocumentId: items[0].id,
          uploadedFileId,
          orderNo: 1000000 + (idx + 1) * 1000,
        };
      });

      await this.getGateways().gloveboxDocumentFileGw.create(fileAttachments);
    }

    // Clean up stored data
    if (createInfo) {
      this.updateData.delete(`create-${requestId}`);
    }

    return items.map((item: any) => this.processItemOnOut(item));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Document ID is required');
    }

    if (!accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Account ID is required');
    }

    // Check if user owns the document
    const document = await this.getGateways().gloveboxDocumentGw.get(id);

    if (!document || document.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Document not found');
    }

    // Don't allow changing accountId
    const { accountId: _, uploadedFilesIds, ...restParams } = params;

    // Store data for afterUpdate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`update-${requestId}-${id}`, {
      uploadedFilesIds: uploadedFilesIds || [],
    });

    const updateFields = {
      ...restParams,
      updatedBy: userId,
      updatedAt: this.now(),
    };

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return updateFields;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) continue;

      const updateInfo = this.updateData.get(`update-${requestId}-${item.id}`);

      if (updateInfo && Array.isArray(updateInfo.uploadedFilesIds)) {
        // Remove existing additional file attachments
        await this.getGateways().gloveboxDocumentFileGw.remove({
          gloveboxDocumentId: item.id,
        });

        // Create new additional file attachments
        if (updateInfo.uploadedFilesIds.length > 0) {
          const fileAttachments = updateInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
            return {
              gloveboxDocumentId: item.id,
              uploadedFileId,
              orderNo: 1000000 + (idx + 1) * 1000,
            };
          });

          await this.getGateways().gloveboxDocumentFileGw.create(fileAttachments);
        }
      }

      // Clean up stored data
      this.updateData.delete(`update-${requestId}-${item.id}`);
    }

    return items.map((item: any) => this.processItemOnOut(item));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Document ID is required');
    }

    if (!accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Account ID is required');
    }

    // Check if user owns the document
    const document = await this.getGateways().gloveboxDocumentGw.get(id);

    if (!document || document.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Document not found');
    }

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // File attachments are automatically removed via CASCADE
    return items.map((item: any) => this.processItemOnOut(item));
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();

    if (!accountId) {
      return [];
    }

    const allowedWhere: any[] = [];

    // Check ownership for each document
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const document = await this.getGateways().gloveboxDocumentGw.get(id);

      if (document && document.accountId === accountId) {
        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    // File attachments are automatically removed via CASCADE
    return items.map((item: any) => this.processItemOnOut(item));
  }

  // ===========================================================================
  // Custom Methods
  // ===========================================================================

  /**
   * Count documents with filters
   */
  public async count(filterParams: any): Promise<number> {
    const { accountId } = this.getContext();

    return this.getGateways().gloveboxDocumentGw.count({
      ...filterParams,
      accountId,
    });
  }

  /**
   * Get dashboard stats for glovebox documents
   */
  public async getStats(withinDays: number = 30): Promise<{
    totalDocuments: number;
    expiredDocuments: number;
    expiringSoonDocuments: number;
  }> {
    const { accountId } = this.getContext();

    if (!accountId) {
      return {
        totalDocuments: 0,
        expiredDocuments: 0,
        expiringSoonDocuments: 0,
      };
    }

    const [totalDocuments, expiredDocuments, expiringSoonDocuments] = await Promise.all([
      this.getGateways().gloveboxDocumentGw.count({ accountId }),
      this.getGateways().gloveboxDocumentGw.countExpired(accountId),
      this.getGateways().gloveboxDocumentGw.countExpiringSoon(accountId, withinDays),
    ]);

    return {
      totalDocuments,
      expiredDocuments,
      expiringSoonDocuments,
    };
  }

  /**
   * Get documents needing reminder notifications
   */
  public async getDocumentsNeedingReminder(): Promise<any[]> {
    const { accountId } = this.getContext();

    const documents = await this.getGateways().gloveboxDocumentGw.getDocumentsNeedingReminder(accountId);

    return documents.map((item: any) => this.processItemOnOut(item));
  }
}

export { GloveboxDocumentCore };