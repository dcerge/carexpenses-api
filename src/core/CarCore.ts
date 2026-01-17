// ./src/core/CarCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carValidators';
import { ENTITY_TYPE_IDS } from '../boundary';
import { trialCheckMiddleware } from '../middleware';
import { FEATURE_CODES } from '../utils';

dayjs.extend(utc);

interface CarUpdateData {
  uploadedFilesIds: string[];
}

class CarCore extends AppCore {
  private updateData: Map<string, CarUpdateData> = new Map();

  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carGw',
      name: 'Car',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing cars',
        get: 'getting a car',
        getMany: 'getting multiple cars',
        create: 'creating a car',
        createMany: '',
        update: 'updating a car',
        updateMany: '',
        set: '',
        remove: 'removing a car',
        removeMany: 'removing multiple cars',
      },
    });
  }

  public getValidators(): BaseCoreValidatorsInterface {
    return {
      ...super.getValidators(),
      ...validators,
    };
  }

  public async carsQty(): Promise<number> {
    return this.getGateways().carGw.count({ accountId: this.getContext().accountId });
  }

  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    if (item.createdAt !== null && item.createdAt !== undefined) {
      item.createdAt = dayjs(item.createdAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.whenBought !== null && item.whenBought !== undefined) {
      item.whenBought = dayjs(item.whenBought).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.whenSold !== null && item.whenSold !== undefined) {
      item.whenSold = dayjs(item.whenSold).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    return item;
  }

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Filter by accountId for security
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

    // Security check: verify the car belongs to the current account
    if (item.accountId !== this.getContext().accountId) {
      return null; // Return null so the core returns NOT_FOUND
    }

    return this.processItemOnOut(item, opt);
  }

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items)) {
      return items;
    }

    const accountId = this.getContext().accountId;

    // Filter items to only include those belonging to the current account
    const filteredItems = items.filter((item) => item && item.accountId === accountId);

    return filteredItems.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeCreate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { accountId, userId } = this.getContext();

    const trialCheck = await trialCheckMiddleware({
      core: this,
      operation: 'create',
      featureCode: FEATURE_CODES.MAX_VEHICLES,
      featureValue: await this.carsQty(),
    });

    if (trialCheck.code !== OP_RESULT_CODES.OK) {
      return trialCheck;
    }

    const { uploadedFilesIds, ...restParams } = params;

    // Store data for afterCreate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`create-${requestId}`, {
      uploadedFilesIds,
    });

    const newCar = {
      ...restParams,
      accountId,
      userId,
      createdBy: userId,
      createdAt: this.now(),
    };

    return newCar;
  }

  public async afterCreate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { userId } = this.getContext();

    // Create user_cars junction record for the owner
    for (const car of items) {
      await this.getGateways().userCarGw.create({
        accountId: car.accountId,
        userId,
        carId: car.id,
        roleId: 1, // Owner
        createdBy: userId,
        createdAt: this.now(),
      });
    }

    const requestId = this.getRequestId();
    const createInfo = this.updateData.get(`create-${requestId}`);

    if (createInfo) {
      if (Array.isArray(createInfo.uploadedFilesIds)) {
        const attachments = createInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
          return {
            entityTypeId: ENTITY_TYPE_IDS.CAR,
            entityId: items[0].id,
            uploadedFileId,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().entityEntityAttachmentGw.create(attachments);
      }

      // Clean up stored data
      this.updateData.delete(`create-${requestId}`);
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeUpdate(params: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { args } = opt || {};
    const { where } = args || {};
    const { id } = where || {};
    const { accountId, userId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car ID is required');
    }

    // Check if user owns the car
    const car = await this.getGateways().carGw.get(id);

    if (!car || car.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car not found');
    }

    // Don't allow changing accountId or userId
    const { accountId: _, userId: __, uploadedFilesIds, ...restParams } = params;

    // Store data for afterUpdate using requestId
    const requestId = this.getRequestId();
    this.updateData.set(`update-${requestId}-${id}`, {
      uploadedFilesIds,
    });

    restParams.updatedBy = userId;
    restParams.updatedAt = this.now();

    // Add accountId to where clause for SQL-level security
    where.accountId = accountId;

    return restParams;
  }

  public async afterUpdate(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const requestId = this.getRequestId();

    for (const item of items) {
      if (!item.id) {
        continue;
      }

      const updateInfo = this.updateData.get(`update-${requestId}-${item.id}`);

      if (!updateInfo) {
        continue;
      }

      if (Array.isArray(updateInfo.uploadedFilesIds)) {
        await this.getGateways().entityEntityAttachmentGw.remove({
          entityTypeId: ENTITY_TYPE_IDS.CAR,
          entityId: item.id,
        });

        const attachments = updateInfo.uploadedFilesIds.map((uploadedFileId, idx) => {
          return {
            entityTypeId: ENTITY_TYPE_IDS.CAR,
            entityId: item.id,
            uploadedFileId,
            orderNo: 1000000 + (idx + 1) * 1000,
          };
        });

        await this.getGateways().entityEntityAttachmentGw.create(attachments);
      }
    }

    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  public async beforeRemove(where: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { id } = where || {};
    const { accountId } = this.getContext();

    if (!id) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car ID is required');
    }

    // Check if user owns the car
    const car = await this.getGateways().carGw.get(id);

    if (!car || car.accountId !== accountId) {
      return OpResult.fail(OP_RESULT_CODES.NOT_FOUND, {}, 'Car not found');
    }

    // Add accountId to where clause for SQL-level security
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

    // Check ownership for each car
    for (const item of where) {
      const { id } = item || {};

      if (!id) {
        continue;
      }

      const car = await this.getGateways().carGw.get(id);

      if (car && car.accountId === accountId) {
        // Add accountId to where clause for SQL-level security
        allowedWhere.push({ ...item, accountId });
      }
    }

    return allowedWhere;
  }

  public async afterRemoveMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { CarCore };
