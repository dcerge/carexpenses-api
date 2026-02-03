// ./src/utils/unitConversions.ts
import { MILES_TO_KM, US_GALLONS_TO_LITERS, UK_GALLONS_TO_LITERS } from '../boundary';

// =============================================================================
// Unit Type Detection
// =============================================================================

/**
 * Check if unit is for electric vehicles
 */
export function isElectricUnit(unit: string): boolean {
  return unit === 'kwh';
}

/**
 * Check if unit is for hydrogen vehicles
 */
export function isHydrogenUnit(unit: string): boolean {
  return unit === 'kg';
}

/**
 * Check if unit is for liquid fuels
 */
export function isLiquidUnit(unit: string): boolean {
  return ['l', 'gal-us', 'gal-uk'].includes(unit);
}

// =============================================================================
// Distance Conversions
// =============================================================================

/**
 * Convert distance from user's preferred unit to metric (kilometers)
 * @param value Distance in user's preferred unit
 * @param unit User's distance unit: 'km' or 'mi'
 * @returns Distance in kilometers, or null if input is null/undefined
 */
export function toMetricDistance(value: number | null | undefined, unit: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (unit === 'mi') {
    return value * MILES_TO_KM;
  }

  return value; // already in km
}

/**
 * Convert distance from metric (kilometers) to user's preferred unit
 * @param value Distance in kilometers
 * @param unit User's distance unit: 'km' or 'mi'
 * @returns Distance in user's preferred unit, or null if input is null/undefined
 */
export function fromMetricDistance(value: number | null | undefined, unit: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (unit === 'mi') {
    return value / MILES_TO_KM;
  }

  return value; // already in km
}

/**
 * Convert distance from metric (kilometers) to user's preferred unit, rounded to whole number
 * Use this when the original entered value is not available (e.g., user changed preferences)
 * @param value Distance in kilometers
 * @param unit User's distance unit: 'km' or 'mi'
 * @returns Distance in user's preferred unit rounded to whole number, or null if input is null/undefined
 */
export function fromMetricDistanceRounded(value: number | null | undefined, unit: string): number | null {
  const converted = fromMetricDistance(value, unit);

  if (converted === null) {
    return null;
  }

  return Math.round(converted);
}

// =============================================================================
// Volume/Energy/Mass Conversions
// =============================================================================

/**
 * Convert volume/energy/mass from user's entered unit to metric base
 * - Liquid fuels: converts to liters
 * - Electric (kWh): no conversion needed, kWh is the base unit
 * - Hydrogen (kg): no conversion needed, kg is the base unit
 *
 * @param value Volume/energy/mass in user's entered unit
 * @param unit User's volume unit: 'l', 'gal-us', 'gal-uk', 'kwh', or 'kg'
 * @returns Value in metric base unit, or null if input is null/undefined
 */
export function toMetricVolume(value: number | null | undefined, unit: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  let result = value;

  switch (unit) {
    case 'gal-us':
      result = value * US_GALLONS_TO_LITERS;
      break;
    case 'gal-uk':
      result = value * UK_GALLONS_TO_LITERS;
      break;
    case 'kwh':
    case 'kg':
      result = value; // Already in base unit
      break;
    case 'l':
    default:
      result = value; // Already in liters
      break;
  }

  return Number(result.toFixed(3));
}

/**
 * Convert volume/energy/mass from metric base to user's preferred unit
 * - Liquid fuels: converts from liters
 * - Electric (kWh): no conversion needed
 * - Hydrogen (kg): no conversion needed
 *
 * @param value Volume/energy/mass in metric base unit
 * @param unit User's volume unit: 'l', 'gal-us', 'gal-uk', 'kwh', or 'kg'
 * @returns Value in user's preferred unit, or null if input is null/undefined
 */
export function fromMetricVolume(value: number | null | undefined, unit: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  let result = value;

  switch (unit) {
    case 'gal-us':
      result = value / US_GALLONS_TO_LITERS;
      break;
    case 'gal-uk':
      result = value / UK_GALLONS_TO_LITERS;
      break;
    case 'kwh':
    case 'kg':
      result = value; // Already in base unit
      break;
    case 'l':
    default:
      result = value; // Already in liters
      break;
  }

  return Number(result.toFixed(3));
}

// =============================================================================
// Fuel Consumption Calculations
// =============================================================================

/**
 * Map user's liquid fuel consumption preference to equivalent electric unit
 */
function mapToElectricConsumptionUnit(liquidUnit: string): string {
  switch (liquidUnit) {
    case 'l100km':
      return 'kwh100km';
    case 'km-l':
      return 'km-kwh';
    case 'mpg-us':
    case 'mpg-uk':
    case 'mi-l':
      return 'mi-kwh';
    default:
      return 'kwh100km';
  }
}

/**
 * Map user's liquid fuel consumption preference to equivalent hydrogen unit
 */
function mapToHydrogenConsumptionUnit(liquidUnit: string): string {
  switch (liquidUnit) {
    case 'l100km':
      return 'kg100km';
    case 'km-l':
      return 'km-kg';
    case 'mpg-us':
    case 'mpg-uk':
    case 'mi-l':
      return 'mi-kg';
    default:
      return 'kg100km';
  }
}

/**
 * Get the appropriate consumption unit based on user preference and fuel type.
 * Maps liquid fuel preferences to equivalent electric/hydrogen units automatically.
 *
 * @param userConsumptionUnit User's consumption preference (e.g., 'l100km', 'mpg-us')
 * @param volumeUnit The unit the fuel was entered in (e.g., 'l', 'kwh', 'kg')
 * @returns Appropriate consumption unit for the fuel type
 */
export function getConsumptionUnitForFuelType(
  userConsumptionUnit: string,
  volumeUnit: string
): string {
  if (isElectricUnit(volumeUnit)) {
    return mapToElectricConsumptionUnit(userConsumptionUnit);
  }

  if (isHydrogenUnit(volumeUnit)) {
    return mapToHydrogenConsumptionUnit(userConsumptionUnit);
  }

  // Liquid fuels - use user's preference as-is
  return userConsumptionUnit;
}

/**
 * Derive a sensible consumption unit based on distance and volume units.
 * Used when no explicit consumption preference is available (e.g., for car units).
 *
 * @param distanceUnit Distance unit: 'km' or 'mi'
 * @param volumeUnit Volume unit: 'l', 'gal-us', 'gal-uk', 'kwh', or 'kg'
 * @returns Appropriate consumption unit string
 */
export function deriveConsumptionUnit(distanceUnit: string, volumeUnit: string): string {
  // Electric vehicles
  if (isElectricUnit(volumeUnit)) {
    return distanceUnit === 'mi' ? 'mi-kwh' : 'kwh100km';
  }

  // Hydrogen vehicles
  if (isHydrogenUnit(volumeUnit)) {
    return distanceUnit === 'mi' ? 'mi-kg' : 'kg100km';
  }

  // Liquid fuels
  if (distanceUnit === 'mi') {
    switch (volumeUnit) {
      case 'gal-us':
        return 'mpg-us';
      case 'gal-uk':
        return 'mpg-uk';
      case 'l':
      default:
        return 'mi-l';
    }
  }

  // Kilometers-based systems
  switch (volumeUnit) {
    case 'gal-us':
    case 'gal-uk':
      return 'km-l';
    case 'l':
    default:
      return 'l100km';
  }
}

/**
 * Calculate fuel/energy consumption in the specified unit
 *
 * Supports:
 * - Liquid fuels: l/100km, km/l, mpg-us, mpg-uk, mi/l
 * - Electric: kWh/100km, kWh/100mi, Wh/mi, km/kWh, mi/kWh
 * - Hydrogen: kg/100km, kg/100mi, km/kg, mi/kg
 *
 * @param distanceKm Distance in kilometers (metric)
 * @param volumeOrEnergy Volume in liters, energy in kWh, or mass in kg (metric base)
 * @param consumptionUnit Target consumption unit
 * @returns Consumption value, or null if calculation not possible
 */
export function calculateConsumption(
  distanceKm: number | null | undefined,
  volumeOrEnergy: number | null | undefined,
  consumptionUnit: string,
): number | null {
  if (!distanceKm || distanceKm <= 0 || !volumeOrEnergy || volumeOrEnergy <= 0) {
    return null;
  }

  const miles = distanceKm / MILES_TO_KM;

  switch (consumptionUnit) {
    // =========================================================================
    // Liquid fuel units
    // =========================================================================
    case 'l100km': // Liters per 100 km (lower is better)
      return (volumeOrEnergy / distanceKm) * 100;

    case 'km-l': // Kilometers per liter (higher is better)
      return distanceKm / volumeOrEnergy;

    case 'mpg-us': { // Miles per US gallon (higher is better)
      const gallons = volumeOrEnergy / US_GALLONS_TO_LITERS;
      return miles / gallons;
    }

    case 'mpg-uk': { // Miles per UK gallon (higher is better)
      const gallons = volumeOrEnergy / UK_GALLONS_TO_LITERS;
      return miles / gallons;
    }

    case 'mi-l': // Miles per liter (higher is better)
      return miles / volumeOrEnergy;

    // =========================================================================
    // Electric units (volumeOrEnergy is in kWh)
    // =========================================================================
    case 'kwh100km': // kWh per 100 km (lower is better)
      return (volumeOrEnergy / distanceKm) * 100;

    case 'kwh100mi': // kWh per 100 miles (lower is better)
      return (volumeOrEnergy / miles) * 100;

    case 'wh-mi': // Wh per mile (lower is better)
      return (volumeOrEnergy * 1000) / miles;

    case 'km-kwh': // Kilometers per kWh (higher is better)
      return distanceKm / volumeOrEnergy;

    case 'mi-kwh': // Miles per kWh (higher is better)
      return miles / volumeOrEnergy;

    // =========================================================================
    // Hydrogen units (volumeOrEnergy is in kg)
    // =========================================================================
    case 'kg100km': // kg per 100 km (lower is better)
      return (volumeOrEnergy / distanceKm) * 100;

    case 'kg100mi': // kg per 100 miles (lower is better)
      return (volumeOrEnergy / miles) * 100;

    case 'km-kg': // Kilometers per kg (higher is better)
      return distanceKm / volumeOrEnergy;

    case 'mi-kg': // Miles per kg (higher is better)
      return miles / volumeOrEnergy;

    // =========================================================================
    // Default fallback
    // =========================================================================
    default:
      return (volumeOrEnergy / distanceKm) * 100; // Default to X/100km format
  }
}