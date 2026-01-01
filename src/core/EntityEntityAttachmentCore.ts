// ./src/core/EntityEntityAttachmentCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/entityEntityAttachmentValidators';

dayjs.extend(utc);

// Entity types
const ENTITY_TYPE = {
  CAR: 1,
  EXPENSE: 2,
  REFUEL: 3,
  TRAVEL: 4,
};

class EntityEntityAttachmentCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'entityEntityAttachmentGw',
      name: 'EntityEntityAttachment',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing entity entity attachments',
        get: 'getting an entity entity attachment',
        getMany: 'getting multiple entity entity attachments',
        create: 'creating an entity entity attachment',
        createMany: '',
        update: 'updating an entity entity attachment',
        updateMany: '',
        set: '',
        remove: 'removing an entity entity attachment',
        removeMany: 'removing multiple entity entity attachments',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  /**
   * Verify entity belongs to current account based on entity type
   */
  private async verifyEntityOwnership(entityTypeId: number, entityId: string): Promise<boolean> {
    const { accountId } = this.getContext();

    switch (entityTypeId) {
      case ENTITY_TYPE.CAR: {
        const car = await this.getGateways().carGw.get(entityId);
        return car && car.accountId === accountId;
      }
      case ENTITY_TYPE.EXPENSE:
      case ENTITY_TYPE.REFUEL: {
        const expenseBase = await this.getGateways().expenseBaseGw.get(entityId);
        return expenseBase && expenseBase.accountId === accountId;
      }
      case ENTITY_TYPE.TRAVEL: {
        const travel = await this.getGateways().travelGw.get(entityId);
        return travel && travel.accountId === accountId;
      }
      default:
        return false;
    }
  }

  /**
   * Verify attachment belongs to current account via car
   */
  private async verifyAttachmentOwnership(attachmentId: string): Promise<boolean> {
    const { accountId } = this.getContext();
    const attachment = await this.getGateways().entityAttachmentGw.get(attachmentId);

    if (!attachment || !attachment.carId) {
      return false;
    }

    const car = await this.getGateways().carGw.get(attachment.carId);
    return car && car.accountId === accountId;
  }

  /**
   * Verify entity entity attachment belongs to current account
   */
  private async verifyRecordOwnership(recordId: string): Promise<boolean> {
    const record = await this.getGateways().entityEntityAttachmentGw.get(recordId);

    if (!record) {
      return false;
    }

    return this.verifyAttachmentOwnership(record.entityAttachmentId);
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Security is handled via gateway join to entity_attachments -> cars
    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Security check via attachment ownership
    const isOwned = await this.verifyAttachmentOwnership(item.entityAttachmentId);
    if (!isOwned) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return item;
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();

    // Batch fetch attachments
    const attachmentIds = [
      ...new Set(items.filter((item) => item?.entityAttachmentId).map((item) => item.entityAttachmentId)),
    ];

    if (attachmentIds.length === 0) {
      return [];
    }

    const attachmentsResult = await this.getGateways().entityAttachmentGw.list({ filter: { id: attachmentIds } });
    const attachments = attachmentsResult.data || [];

    // Get unique car IDs from attachments
    const carIds = [...new Set(attachments.filter((a) => a?.carId).map((a) => a.carId))];

    if (carIds.length === 0) {
      return [];
    }

    // Batch fetch cars
    const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
    const cars = carsResult.data || [];

    // Create lookup map of valid car IDs (owned by account)
    const validCarIds = new Set<string>();
    for (const car of cars) {
      if (car.accountId === accountId) {
        validCarIds.add(car.id);
      }
    }

    // Create lookup map of valid attachment IDs
    const validAttachmentIds = new Set<string>();
    for (const attachment of attachments) {
      if (validCarIds.has(attachment.carId)) {
        validAttachmentIds.add(attachment.id);
      }
    }

    // Filter items to only include those with valid attachments
    return items.filter((item) => item && validAttachmentIds.has(item.entityAttachmentId));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { entityTypeId, entityId, entityAttachmentId } = params || {};

    // Verify entity ownership
    if (entityTypeId && entityId) {
      const isEntityOwned = await this.verifyEntityOwnership(entityTypeId, entityId);
      if (!isEntityOwned) {
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity not found');
      }
    }

    // Verify attachment ownership
    if (entityAttachmentId) {
      const isAttachmentOwned = await this.verifyAttachmentOwnership(entityAttachmentId);
      if (!isAttachmentOwned) {
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity attachment not found');
      }
    }

    return params;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity entity attachment ID is required');
    }

    // Verify record ownership
    const isOwned = await this.verifyRecordOwnership(id);
    if (!isOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity entity attachment not found');
    }

    // Don't allow changing entityTypeId, entityId, or entityAttachmentId
    const { entityTypeId: _, entityId: __, entityAttachmentId: ___, ...restParams } = params;

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity entity attachment ID is required');
    }

    // Verify record ownership
    const isOwned = await this.verifyRecordOwnership(id);
    if (!isOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity entity attachment not found');
    }

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }

  public async beforeRemoveMany(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(where)) {
      return where;
    }

    const { accountId } = this.getContext();
    const allowedWhere: any[] = [];

    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      // Verify record ownership
      const isOwned = await this.verifyRecordOwnership(id);
      if (isOwned) {
        // Add accountId to where clause for SQL-level security via gateway join
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items;
  }
}

export { EntityEntityAttachmentCore };
