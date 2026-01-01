// ./src/core/EntityAttachmentCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/entityAttachmentValidators';

dayjs.extend(utc);

class EntityAttachmentCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'entityAttachmentGw',
      name: 'EntityAttachment',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing entity attachments',
        get: 'getting an entity attachment',
        getMany: 'getting multiple entity attachments',
        create: 'creating an entity attachment',
        createMany: '',
        update: 'updating an entity attachment',
        updateMany: '',
        set: '',
        remove: 'removing an entity attachment',
        removeMany: 'removing multiple entity attachments',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  /**
   * Verify car belongs to current account
   */
  private async verifyCarOwnership(carId: string): Promise<boolean> {
    const { accountId } = this.getContext();
    const car = await this.getGateways().carGw.get(carId);
    return car && car.accountId === accountId;
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

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Security is handled via gateway join to cars
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

    // Security check: verify the attachment belongs to the current account via car
    const isOwned = await this.verifyAttachmentOwnership(item.id);
    if (!isOwned) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const { accountId } = this.getContext();

    // Batch fetch cars for all attachments
    const carIds = [...new Set(items.filter((item) => item?.carId).map((item) => item.carId))];

    if (carIds.length === 0) {
      return [];
    }

    const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
    const cars = carsResult.data || [];

    // Create lookup map of valid car IDs (owned by account)
    const validCarIds = new Set<string>();
    for (const car of cars) {
      if (car.accountId === accountId) {
        validCarIds.add(car.id);
      }
    }

    // Filter items to only include those with valid cars
    const filteredItems = items.filter((item) => item && validCarIds.has(item.carId));

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { userId } = this.getContext();
    const { carId } = params || {};

    // Verify car ownership
    if (carId) {
      const isCarOwned = await this.verifyCarOwnership(carId);
      if (!isCarOwned) {
        return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car not found');
      }
    }

    const newAttachment = {
      ...params,
      userId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newAttachment;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity attachment ID is required');
    }

    // Verify attachment ownership via car
    const isOwned = await this.verifyAttachmentOwnership(id);
    if (!isOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity attachment not found');
    }

    // Don't allow changing carId or userId
    const { carId: _, userId: __, ...restParams } = params;

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity attachment ID is required');
    }

    // Verify attachment ownership via car
    const isOwned = await this.verifyAttachmentOwnership(id);
    if (!isOwned) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Entity attachment not found');
    }

    // Add accountId to where clause for SQL-level security via gateway join
    where.accountId = accountId;

    return where;
  }

  public async afterRemove(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
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

      // Verify attachment ownership via car
      const isOwned = await this.verifyAttachmentOwnership(id);
      if (isOwned) {
        // Add accountId to where clause for SQL-level security via gateway join
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { EntityAttachmentCore };
