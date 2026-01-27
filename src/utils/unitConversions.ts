// ./src/utils/unitConversions.ts
import { MILES_TO_KM, US_GALLONS_TO_LITERS, UK_GALLONS_TO_LITERS } from '../boundary';

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
// Volume Conversions
// =============================================================================

/**
 * Convert volume from user's preferred unit to metric (liters)
 * @param value Volume in user's preferred unit
 * @param unit User's volume unit: 'l', 'gal-us', or 'gal-uk'
 * @returns Volume in liters, or null if input is null/undefined
 */
export function toMetricVolume(value: number | null | undefined, unit: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (unit) {
    case 'gal-us':
      return value * US_GALLONS_TO_LITERS;
    case 'gal-uk':
      return value * UK_GALLONS_TO_LITERS;
    case 'l':
    default:
      return value; // already in liters
  }
}

/**
 * Convert volume from metric (liters) to user's preferred unit
 * @param value Volume in liters
 * @param unit User's volume unit: 'l', 'gal-us', or 'gal-uk'
 * @returns Volume in user's preferred unit, or null if input is null/undefined
 */
export function fromMetricVolume(value: number | null | undefined, unit: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (unit) {
    case 'gal-us':
      return value / US_GALLONS_TO_LITERS;
    case 'gal-uk':
      return value / UK_GALLONS_TO_LITERS;
    case 'l':
    default:
      return value; // already in liters
  }
}

// =============================================================================
// Fuel Consumption Calculations
// =============================================================================

/**
 * Derive a sensible consumption unit based on distance and volume units.
 * Used when no explicit consumption preference is available (e.g., for car units).
 *
 * @param distanceUnit Distance unit: 'km' or 'mi'
 * @param volumeUnit Volume unit: 'l', 'gal-us', or 'gal-uk'
 * @returns Appropriate consumption unit string
 */
export function deriveConsumptionUnit(distanceUnit: string, volumeUnit: string): string {
  if (distanceUnit === 'mi') {
    // Miles-based systems
    switch (volumeUnit) {
      case 'gal-us':
        return 'mpg-us'; // US: miles per US gallon
      case 'gal-uk':
        return 'mpg-uk'; // UK: miles per UK gallon
      case 'l':
      default:
        return 'mi-l'; // Hybrid: miles per liter
    }
  }

  // Kilometers-based systems
  switch (volumeUnit) {
    case 'gal-us':
    case 'gal-uk':
      return 'km-l'; // Unusual combo, use km per liter
    case 'l':
    default:
      return 'l100km'; // Standard metric: liters per 100 km
  }
}

/**
 * Calculate fuel consumption in user's preferred unit
 * @param distanceKm Distance in kilometers (metric)
 * @param volumeLiters Volume in liters (metric)
 * @param consumptionUnit User's preferred consumption unit
 * @returns Consumption in user's preferred unit, or null if calculation not possible
 */
export function calculateConsumption(
  distanceKm: number | null | undefined,
  volumeLiters: number | null | undefined,
  consumptionUnit: string,
): number | null {
  if (!distanceKm || distanceKm <= 0 || !volumeLiters || volumeLiters <= 0) {
    return null;
  }

  switch (consumptionUnit) {
    case 'l100km': // Liters per 100 km (lower is better)
      return (volumeLiters / distanceKm) * 100;

    case 'km-l': // Kilometers per liter (higher is better)
      return distanceKm / volumeLiters;

    case 'mpg-us': {
      // Miles per US gallon (higher is better)
      const miles = distanceKm / MILES_TO_KM;
      const gallons = volumeLiters / US_GALLONS_TO_LITERS;
      return miles / gallons;
    }

    case 'mpg-uk': {
      // Miles per UK gallon (higher is better)
      const miles = distanceKm / MILES_TO_KM;
      const gallons = volumeLiters / UK_GALLONS_TO_LITERS;
      return miles / gallons;
    }

    case 'mi-l': {
      // Miles per liter (higher is better)
      const miles = distanceKm / MILES_TO_KM;
      return miles / volumeLiters;
    }

    default:
      return (volumeLiters / distanceKm) * 100; // default l/100km
  }
}