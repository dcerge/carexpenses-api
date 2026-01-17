import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/serviceIntervalAccountValidators';
import { INTERVAL_TYPES } from '../database';
import { toMetricDistance, fromMetricDistanceRounded } from '../utils';

dayjs.extend(utc);

interface ExpenseKind {
  id: number;
  code: string;
  canSchedule: boolean;
  isItMaintenance: boolean;
}

interface ServiceIntervalDefault {
  id: number;
  kindId: number;
  intervalType: number;
  mileageInterval: number; // Always in km
  daysInterval: number;
  status: number;
}

interface ServiceIntervalAccount {
  id: string;
  carId: string;
  kindId: number;
  intervalType: number;
  mileageInterval: number; // Original user-entered value
  mileageIntervalKm: number; // Metric equivalent for calculations
  distanceEnteredIn: string; // Unit used at entry time
  daysInterval: number;
  status: number;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceIntervalMerged {
  carId: string;
  kindId: number;
  intervalType: number;
  mileageInterval: number; // In user's preferred unit
  daysInterval: number;
  isCustomized: boolean;
  hasDefault: boolean;
  distanceUnit: string; // Indicates what unit mileageInterval is in
}

class ServiceIntervalAccountCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'serviceIntervalAccountGw',
      name: 'ServiceIntervalAccount',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing service interval accounts',
        get: 'getting a service interval account',
        getMany: 'getting multiple service interval accounts',
        create: 'creating a service interval account',
        createMany: '',
        update: 'updating a service interval account',
        updateMany: '',
        set: 'setting a service interval account',
        remove: 'removing a service interval account',
        removeMany: 'removing multiple service interval accounts',
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
   * Convert mileage interval to user's preferred unit
   * For customizations: use original value if units match, otherwise convert from km
   * For defaults: always convert from km (defaults are always in km)
   */
  private convertMileageIntervalForDisplay(
    customization: ServiceIntervalAccount | null,
    defaultInterval: ServiceIntervalDefault | null,
    userDistanceUnit: string,
  ): { mileageInterval: number; distanceUnit: string } {
    if (customization) {
      // Customization exists - check if we can use the original value
      if (customization.distanceEnteredIn === userDistanceUnit) {
        // User's preference matches the entry unit - return exact original value
        return {
          mileageInterval: customization.mileageInterval,
          distanceUnit: userDistanceUnit,
        };
      } else {
        // User's preference differs - convert from metric with rounding
        const converted = fromMetricDistanceRounded(customization.mileageIntervalKm, userDistanceUnit);
        return {
          mileageInterval: converted ?? 0,
          distanceUnit: userDistanceUnit,
        };
      }
    } else if (defaultInterval) {
      // No customization, use default (always in km)
      if (userDistanceUnit === 'km') {
        // User prefers km - return as-is
        return {
          mileageInterval: defaultInterval.mileageInterval,
          distanceUnit: 'km',
        };
      } else {
        // User prefers different unit - convert from km with rounding
        const converted = fromMetricDistanceRounded(defaultInterval.mileageInterval, userDistanceUnit);
        return {
          mileageInterval: converted ?? 0,
          distanceUnit: userDistanceUnit,
        };
      }
    }

    // No customization and no default
    return {
      mileageInterval: 0,
      distanceUnit: userDistanceUnit,
    };
  }

  /**
   * Merge scheduleable kinds with defaults and car-specific customizations
   */
  private mergeScheduleableKindsWithDefaultsAndCustomizations(
    scheduleableKinds: ExpenseKind[],
    defaults: ServiceIntervalDefault[],
    customizations: ServiceIntervalAccount[],
    carId: string,
    userDistanceUnit: string,
  ): ServiceIntervalMerged[] {
    // Create lookup map for defaults by kindId
    const defaultMap = new Map<number, ServiceIntervalDefault>();
    for (const def of defaults) {
      defaultMap.set(def.kindId, def);
    }

    // Create lookup map for customizations by kindId
    const customizationMap = new Map<number, ServiceIntervalAccount>();
    for (const custom of customizations) {
      customizationMap.set(custom.kindId, custom);
    }

    const merged: ServiceIntervalMerged[] = [];

    for (const kind of scheduleableKinds) {
      const customization = customizationMap.get(kind.id) ?? null;
      const defaultInterval = defaultMap.get(kind.id) ?? null;

      // Convert mileage interval to user's preferred unit
      const { mileageInterval, distanceUnit } = this.convertMileageIntervalForDisplay(
        customization,
        defaultInterval,
        userDistanceUnit,
      );

      if (customization) {
        // Use customization values (highest priority)
        merged.push({
          carId,
          kindId: customization.kindId,
          intervalType: customization.intervalType,
          mileageInterval,
          daysInterval: customization.daysInterval,
          isCustomized: true,
          hasDefault: defaultInterval != null,
          distanceUnit,
        });
      } else if (defaultInterval) {
        // Use default values (no customization)
        merged.push({
          carId,
          kindId: defaultInterval.kindId,
          intervalType: defaultInterval.intervalType,
          mileageInterval,
          daysInterval: defaultInterval.daysInterval,
          isCustomized: false,
          hasDefault: true,
          distanceUnit,
        });
      } else {
        // Scheduleable kind with no default and no customization
        merged.push({
          carId,
          kindId: kind.id,
          intervalType: 0,
          mileageInterval: 0,
          daysInterval: 0,
          isCustomized: false,
          hasDefault: false,
          distanceUnit: userDistanceUnit,
        });
      }
    }

    return merged;
  }

  public async list(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().list,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { filter } = args || {};
        const { carId, kindId, intervalType } = filter || {};
        const { accountId } = this.getContext();

        // Get user's distance preference
        const userProfile = await this.getCurrentUserProfile();
        const userDistanceUnit = userProfile.distanceIn;

        // Step 1: Fetch all scheduleable expense kinds
        const scheduleableKinds: ExpenseKind[] = await this.getGateways().expenseKindGw.list({
          filter: { canSchedule: true },
        });

        if (!scheduleableKinds || scheduleableKinds.length === 0) {
          return this.success([]);
        }

        // Step 2: Fetch all defaults
        const defaults: ServiceIntervalDefault[] = await this.getGateways().serviceIntervalDefaultGw.list({
          filter: {},
        });

        // Step 3: Fetch car-specific customizations
        const customizations: ServiceIntervalAccount[] = await this.getGateways().serviceIntervalAccountGw.list({
          filter: {
            carId,
            accountId,
          },
        });

        // Step 4: Merge all three sources with unit conversion
        let merged = this.mergeScheduleableKindsWithDefaultsAndCustomizations(
          scheduleableKinds,
          defaults || [],
          customizations || [],
          carId,
          userDistanceUnit,
        );

        // Apply additional filters if provided
        if (kindId) {
          const kindIds = Array.isArray(kindId) ? kindId : [kindId];
          merged = merged.filter((item) => kindIds.includes(item.kindId));
        }

        if (intervalType) {
          const intervalTypes = Array.isArray(intervalType) ? intervalType : [intervalType];
          merged = merged.filter((item) => intervalTypes.includes(item.intervalType));
        }

        return this.success(merged);
      },
      hasTransaction: false,
      doingWhat: this.config.doingWhat?.list ?? 'listing service interval accounts',
    });
  }

  public async set(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().set,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { params } = args || {};
        const { carId, kindId, intervalType, mileageInterval, daysInterval } = params || {};
        const { userId } = this.getContext();

        // Get user's distance preference
        const userProfile = await this.getCurrentUserProfile();
        const userDistanceUnit = userProfile.distanceIn;

        // Convert mileage interval to metric for storage
        const mileageIntervalKm = toMetricDistance(mileageInterval ?? 0, userDistanceUnit) ?? 0;

        const now = this.now();

        const record = {
          carId,
          kindId,
          intervalType,
          mileageInterval: mileageInterval ?? 0, // Store original user-entered value
          mileageIntervalKm, // Store metric equivalent
          distanceEnteredIn: userDistanceUnit, // Store unit used at entry time
          daysInterval: daysInterval ?? 0,
          createdBy: userId,
          createdAt: now,
          updatedBy: userId,
          updatedAt: now,
        };

        const items = await this.getGateways().serviceIntervalAccountGw.set(record);

        if (!items || items.length === 0) {
          return this.failure(OP_RESULT_CODES.EXCEPTION, 'Failed to save service interval');
        }

        // Check if there's a default for this kind
        const defaults: ServiceIntervalDefault[] = await this.getGateways().serviceIntervalDefaultGw.list({
          filter: { kindId },
        });

        // Return merged format with isCustomized flag
        // Since we just saved with the user's current unit, return the original value
        const result: ServiceIntervalMerged = {
          carId: items[0].carId,
          kindId: items[0].kindId,
          intervalType: items[0].intervalType,
          mileageInterval: items[0].mileageInterval, // Original value in user's unit
          daysInterval: items[0].daysInterval,
          isCustomized: true,
          hasDefault: defaults != null && defaults.length > 0,
          distanceUnit: userDistanceUnit,
        };

        return this.success(result);
      },
      hasTransaction: true,
      doingWhat: this.config.doingWhat?.set ?? 'setting a service interval account',
    });
  }

  public async remove(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().remove,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { where } = args || {};
        const { carId, kindId } = where || {};
        const { accountId } = this.getContext();

        // Get user's distance preference
        const userProfile = await this.getCurrentUserProfile();
        const userDistanceUnit = userProfile.distanceIn;

        const removeWhere = {
          carId,
          kindId,
          accountId,
        };

        const items = await this.getGateways().serviceIntervalAccountGw.remove(removeWhere);

        if (!items || items.length === 0) {
          return this.failure(OP_RESULT_CODES.NOT_FOUND, 'Service interval customization not found');
        }

        // Return the default interval after removal (or zeros if no default)
        const defaults: ServiceIntervalDefault[] = await this.getGateways().serviceIntervalDefaultGw.list({
          filter: { kindId },
        });

        if (defaults && defaults.length > 0) {
          // Convert default mileage from km to user's preferred unit
          const { mileageInterval, distanceUnit } = this.convertMileageIntervalForDisplay(
            null,
            defaults[0],
            userDistanceUnit,
          );

          const result: ServiceIntervalMerged = {
            carId,
            kindId: kindId,
            intervalType: defaults[0].intervalType,
            mileageInterval,
            daysInterval: defaults[0].daysInterval,
            isCustomized: false,
            hasDefault: true,
            distanceUnit,
          };

          return this.success(result);
        }

        // No default found - return zeros
        const result: ServiceIntervalMerged = {
          carId,
          kindId,
          intervalType: INTERVAL_TYPES.NONE,
          mileageInterval: 0,
          daysInterval: 0,
          isCustomized: false,
          hasDefault: false,
          distanceUnit: userDistanceUnit,
        };
        return this.success(result);
      },
      hasTransaction: true,
      doingWhat: this.config.doingWhat?.remove ?? 'removing a service interval account',
    });
  }

  public async removeMany(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: this.getValidators().removeMany,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { where } = args || {};
        const { accountId } = this.getContext();

        // Get user's distance preference
        const userProfile = await this.getCurrentUserProfile();
        const userDistanceUnit = userProfile.distanceIn;

        // Add accountId to each where item for security
        const whereWithAccount = where.map((item: any) => ({
          ...item,
          accountId,
        }));

        const items = await this.getGateways().serviceIntervalAccountGw.remove(whereWithAccount);

        if (!items || items.length === 0) {
          return this.failure(OP_RESULT_CODES.NOT_FOUND, 'No service interval customizations found');
        }

        // Fetch defaults for removed items
        const kindIds = items.map((item: any) => item.kindId);
        const defaults: ServiceIntervalDefault[] = await this.getGateways().serviceIntervalDefaultGw.list({
          filter: { kindId: kindIds },
        });

        // Create lookup map for defaults
        const defaultMap = new Map<number, ServiceIntervalDefault>();
        for (const def of defaults) {
          defaultMap.set(def.kindId, def);
        }

        // Return values for each removed item (default if exists, zeros otherwise)
        const results: ServiceIntervalMerged[] = [];
        for (const item of items) {
          const defaultInterval = defaultMap.get(item.kindId) ?? null;

          // Convert mileage to user's preferred unit
          const { mileageInterval, distanceUnit } = this.convertMileageIntervalForDisplay(
            null,
            defaultInterval,
            userDistanceUnit,
          );

          if (defaultInterval) {
            results.push({
              carId: item.carId,
              kindId: defaultInterval.kindId,
              intervalType: defaultInterval.intervalType,
              mileageInterval,
              daysInterval: defaultInterval.daysInterval,
              isCustomized: false,
              hasDefault: true,
              distanceUnit,
            });
          } else {
            results.push({
              carId: item.carId,
              kindId: item.kindId,
              intervalType: 0,
              mileageInterval: 0,
              daysInterval: 0,
              isCustomized: false,
              hasDefault: false,
              distanceUnit: userDistanceUnit,
            });
          }
        }

        return this.success(results);
      },
      hasTransaction: true,
      doingWhat: this.config.doingWhat?.removeMany ?? 'removing multiple service interval accounts',
    });
  }
}

export { ServiceIntervalAccountCore };
