// ./src/core/CarMonthlySummaryCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCoreValidatorsInterface, BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/carMonthlySummaryValidators';
import {
  fromMetricDistance,
  fromMetricVolume,
  deriveConsumptionUnit,
  calculateConsumption,
} from '../utils/unitConversions';
import { UserProfile } from '../boundary';

dayjs.extend(utc);

/**
 * Interface for the converted units object
 */
interface MonthlySummaryUnits {
  distanceUnit: string;
  volumeUnit: string;
  consumptionUnit: string;
  startMileage: number | null;
  endMileage: number | null;
  travelsDistance: number | null;
  refuelsVolume: number | null;
  consumptionVolume: number | null;
  consumption: number | null;
}

/**
 * Context for unit conversions stored in opt.validatedItems
 */
interface ConversionContext {
  carsMap?: Map<string, any>;
  userProfile?: UserProfile;
}

class CarMonthlySummaryCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'carMonthlySummaryGw',
      name: 'CarMonthlySummary',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing car monthly summaries',
        get: 'getting a car monthly summary',
        getMany: 'getting multiple car monthly summaries',
        create: '',
        createMany: '',
        update: '',
        updateMany: '',
        set: '',
        remove: '',
        removeMany: '',
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
  // Unit Conversion Helpers
  // ===========================================================================

  /**
   * Create a MonthlySummaryUnits object with converted values
   * @param item The summary item with metric values
   * @param distanceUnit Target distance unit (km, mi)
   * @param volumeUnit Target volume unit (l, gal-us, gal-uk)
   * @param consumptionUnit Target consumption unit (l100km, mpg-us, etc.)
   * @returns MonthlySummaryUnits object with converted values
   */
  private createUnitsObject(
    item: any,
    distanceUnit: string,
    volumeUnit: string,
    consumptionUnit: string,
  ): MonthlySummaryUnits {
    // Calculate distance traveled this month (in metric km)
    const distanceKm =
      item.startMileage != null && item.endMileage != null ? item.endMileage - item.startMileage : null;

    return {
      distanceUnit,
      volumeUnit,
      consumptionUnit,
      startMileage: fromMetricDistance(item.startMileage, distanceUnit),
      endMileage: fromMetricDistance(item.endMileage, distanceUnit),
      travelsDistance: fromMetricDistance(item.travelsDistance, distanceUnit),
      refuelsVolume: fromMetricVolume(item.refuelsVolume, volumeUnit),
      consumptionVolume: fromMetricVolume(item.consumptionVolume, volumeUnit),
      consumption: calculateConsumption(distanceKm, item.consumptionVolume, consumptionUnit),
    };
  }

  /**
   * Add unit conversion objects to a summary item
   * @param item The summary item with metric values
   * @param car The car object (or undefined)
   * @param userProfile The user profile (or undefined)
   * @returns Item with inCarUnits and inUserUnits added
   */
  private addUnitConversions(item: any, car: any, userProfile?: UserProfile): any {
    // Car units: use car's mileageIn and mainTankVolumeEnteredIn
    // Default to metric if car not found
    const carDistanceUnit = car?.mileageIn || 'km';
    const carVolumeUnit = car?.mainTankVolumeEnteredIn || 'l';
    const carConsumptionUnit = deriveConsumptionUnit(carDistanceUnit, carVolumeUnit);

    item.inCarUnits = this.createUnitsObject(item, carDistanceUnit, carVolumeUnit, carConsumptionUnit);

    // User units: use user profile preferences
    // Default to metric if profile not found
    const userDistanceUnit = userProfile?.distanceIn || 'km';
    const userVolumeUnit = userProfile?.volumeIn || 'l';
    const userConsumptionUnit = userProfile?.consumptionIn || 'l100km';

    item.inUserUnits = this.createUnitsObject(item, userDistanceUnit, userVolumeUnit, userConsumptionUnit);

    return item;
  }

  // ===========================================================================
  // Item Processing
  // ===========================================================================

  /**
   * Process item for output: format dates and add unit conversions
   * Conversion context (carsMap, userProfile) is passed via opt.validatedItems
   */
  public processItemOnOut(item: any, opt?: BaseCoreActionsInterface): any {
    if (!item) return item;

    // Format timestamps to UTC ISO format
    if (item.updatedAt !== null && item.updatedAt !== undefined) {
      item.updatedAt = dayjs(item.updatedAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.firstRecordAt !== null && item.firstRecordAt !== undefined) {
      item.firstRecordAt = dayjs(item.firstRecordAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    if (item.lastRecordAt !== null && item.lastRecordAt !== undefined) {
      item.lastRecordAt = dayjs(item.lastRecordAt).utc().format('YYYY-MM-DDTHH:mm:ss.000Z');
    }

    // Get conversion context from opt.validatedItems
    const context = (opt?.validatedItems as ConversionContext) || {};
    const { carsMap, userProfile } = context;

    // Get car from map if available
    const car = item.carId && carsMap ? carsMap.get(item.carId) : undefined;

    // Add unit conversions
    this.addUnitConversions(item, car, userProfile);

    return item;
  }

  // ===========================================================================
  // List Operations
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    // Use AppCore's filterAccessibleCarIds for DRIVER role restriction
    const carIdFilter = await this.filterAccessibleCarIds(filter?.carId);

    return {
      ...args,
      filter: {
        ...filter,
        accountId,
        ...(carIdFilter ? { carId: carIdFilter } : {}),
      },
    };
  }

  public async afterList(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    // Get user profile for conversions
    const userProfile = await this.getCurrentUserProfile();

    // Collect unique car IDs
    const carIds = [...new Set(items.filter((item) => item?.carId).map((item) => item.carId))];

    // Batch fetch all cars
    const carsMap = new Map<string, any>();

    if (carIds.length > 0) {
      const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
      const cars = carsResult.data || carsResult || [];

      for (const car of cars) {
        carsMap.set(car.id, car);
      }
    }

    // Store conversion context in opt.validatedItems for processItemOnOut
    if (opt) {
      opt.validatedItems = { carsMap, userProfile } as ConversionContext;
    }

    // Process each item
    return items.map((item: any) => this.processItemOnOut(item, opt));
  }

  // ===========================================================================
  // Get Single Item
  // ===========================================================================

  public async afterGet(item: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!item) {
      return item;
    }

    // Fetch the car and validate access using AppCore's method
    const car = await this.getGateways().carGw.get(item.carId);
    const hasAccess = await this.validateCarAccess(car);

    if (!hasAccess) {
      return null; // Return null so the core returns NOT_FOUND
    }

    // Get user profile for conversions
    const userProfile = await this.getCurrentUserProfile();

    // Store conversion context in opt.validatedItems for processItemOnOut
    const carsMap = new Map<string, any>();
    carsMap.set(car.id, car);

    if (opt) {
      opt.validatedItems = { carsMap, userProfile } as ConversionContext;
    }

    return this.processItemOnOut(item, opt);
  }

  // ===========================================================================
  // Get Multiple Items
  // ===========================================================================

  public async afterGetMany(items: any, opt?: BaseCoreActionsInterface): Promise<any> {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    // Get user profile for conversions
    const userProfile = await this.getCurrentUserProfile();

    // Batch fetch cars for all summaries
    const carIds = [...new Set(items.filter((item) => item?.carId).map((item) => item.carId))];

    if (carIds.length === 0) {
      return [];
    }

    const carsResult = await this.getGateways().carGw.list({ filter: { id: carIds } });
    const cars = carsResult.data || carsResult || [];

    // Use AppCore's getAccessibleCarIdsFromCars for batch validation
    const accessibleCarIds = await this.getAccessibleCarIdsFromCars(cars);

    // Create lookup map of accessible cars only
    const carsMap = new Map<string, any>();

    for (const car of cars) {
      if (accessibleCarIds.has(car.id)) {
        carsMap.set(car.id, car);
      }
    }

    // Store conversion context in opt.validatedItems for processItemOnOut
    if (opt) {
      opt.validatedItems = { carsMap, userProfile } as ConversionContext;
    }

    // Filter items to only include those with accessible cars and process
    return items
      .filter((item) => item && carsMap.has(item.carId))
      .map((item: any) => this.processItemOnOut(item, opt));
  }
}

export { CarMonthlySummaryCore };