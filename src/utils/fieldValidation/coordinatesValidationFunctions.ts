// ./src/utils/fieldValidation/coordinatesValidationFunctions.ts

import { FieldValidator, CoordinatesFieldOptions } from './interfaces';
import { errorResult, successResult } from './helpers';
import { parseOptions } from '../parserHelpers';

/**
 * Predefined continental bounding boxes (approximate)
 * Using generous boundaries to include island territories
 */
const REGION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  north_america: { north: 83, south: 5, east: -52, west: -180 },
  south_america: { north: 13, south: -56, east: -34, west: -82 },
  europe: { north: 71, south: 34, east: 60, west: -25 },
  africa: { north: 37, south: -35, east: 52, west: -18 },
  asia: { north: 82, south: -11, east: 180, west: 25 },
  oceania: { north: 0, south: -50, east: 180, west: 110 },
  antarctica: { north: -60, south: -90, east: 180, west: -180 },
};

/**
 * Parses a decimal coordinate string to a number.
 * Accepts formats like: "45.4215", "-75.6972", "45.4215°"
 */
const parseDecimalCoordinate = (value: string): number | null => {
  const cleaned = value.replace(/[°]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/**
 * Parses a DMS (degrees-minutes-seconds) coordinate string to decimal degrees.
 * Accepts formats like:
 * - "45°25'17.4"N" or "45°25'17.4\"N"
 * - "75°41'49.9"W" or "75°41'49.9\"W"
 * - "45 25 17.4 N"
 */
const parseDmsCoordinate = (value: string): number | null => {
  // Normalize quotes and symbols
  const normalized = value.replace(/[″"]/g, '"').replace(/[′']/g, "'").trim();

  // Match DMS pattern: degrees, minutes, seconds, direction
  const dmsRegex = /^(-?)(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEW])?$/i;
  let match = normalized.match(dmsRegex);

  if (!match) {
    // Try simpler format without symbols: "45 25 17.4 N"
    const simpleRegex = /^(-?)(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*([NSEW])?$/i;
    match = normalized.match(simpleRegex);
    if (!match) return null;
  }

  const negative = match[1] === '-';
  const degrees = parseFloat(match[2]);
  const minutes = parseFloat(match[3]);
  const seconds = parseFloat(match[4]);
  const direction = match[5]?.toUpperCase();

  if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) return null;
  if (minutes >= 60 || seconds >= 60) return null;

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Apply direction
  if (direction === 'S' || direction === 'W' || negative) {
    decimal = -Math.abs(decimal);
  }

  return decimal;
};

/**
 * Parses coordinate input based on the specified format.
 * Returns { lat, lng } or null if parsing fails.
 */
const parseCoordinates = (value: string, format: 'decimal' | 'dms'): { lat: number; lng: number } | null => {
  const trimmed = value.trim();

  // Try to split by common separators
  let parts: string[];

  // Check for comma separation
  if (trimmed.includes(',')) {
    parts = trimmed.split(',').map((p) => p.trim());
  }
  // Check for semicolon separation
  else if (trimmed.includes(';')) {
    parts = trimmed.split(';').map((p) => p.trim());
  }
  // For DMS, try to split by direction letters
  else if (format === 'dms') {
    const dmsMatch = trimmed.match(/(.+[NS])\s*(.+[EW])/i);
    if (dmsMatch) {
      parts = [dmsMatch[1].trim(), dmsMatch[2].trim()];
    } else {
      return null;
    }
  }
  // For decimal, try space separation
  else {
    parts = trimmed.split(/\s+/);
  }

  if (parts.length !== 2) return null;

  let lat: number | null;
  let lng: number | null;

  if (format === 'dms') {
    lat = parseDmsCoordinate(parts[0]);
    lng = parseDmsCoordinate(parts[1]);
  } else {
    lat = parseDecimalCoordinate(parts[0]);
    lng = parseDecimalCoordinate(parts[1]);
  }

  if (lat === null || lng === null) return null;

  return { lat, lng };
};

/**
 * Validates that latitude is within valid range (-90 to 90).
 */
const isValidLatitude = (lat: number): boolean => {
  return lat >= -90 && lat <= 90;
};

/**
 * Validates that longitude is within valid range (-180 to 180).
 */
const isValidLongitude = (lng: number): boolean => {
  return lng >= -180 && lng <= 180;
};

/**
 * Checks if a point is within a bounding box.
 * Handles longitude wrapping for boxes that cross the antimeridian.
 */
const isPointInBoundingBox = (
  lat: number,
  lng: number,
  box: { north: number; south: number; east: number; west: number },
): boolean => {
  // Latitude check
  if (lat < box.south || lat > box.north) return false;

  // Longitude check - handle antimeridian crossing
  if (box.west <= box.east) {
    // Normal case: box doesn't cross antimeridian
    return lng >= box.west && lng <= box.east;
  } else {
    // Box crosses antimeridian (e.g., west: 170, east: -170)
    return lng >= box.west || lng <= box.east;
  }
};

/**
 * Checks if a point is within a polygon using ray casting algorithm.
 * The polygon is automatically closed.
 */
const isPointInPolygon = (lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>): boolean => {
  if (polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
};

/**
 * Calculates the distance between two points using the Haversine formula.
 * Returns distance in kilometers.
 */
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Rounds a number to specified decimal places.
 */
const roundToDecimalPlaces = (value: number, places: number): number => {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
};

/**
 * Formats coordinates for output.
 */
const formatCoordinates = (lat: number, lng: number, precision: number): string => {
  const roundedLat = roundToDecimalPlaces(lat, precision);
  const roundedLng = roundToDecimalPlaces(lng, precision);
  return `${roundedLat}, ${roundedLng}`;
};

/**
 * Validates geographic coordinates with optional geographic restrictions.
 */
export const validateCoordinates: FieldValidator = async (ctx) => {
  const { fieldName, fieldLabel, value } = ctx;

  const config = parseOptions<CoordinatesFieldOptions>(ctx.options, {
    format: 'decimal',
    decimalPrecision: 6,
  });

  const strValue = String(value).trim();

  if (!strValue) {
    return errorResult(fieldName, `${fieldLabel} is required`);
  }

  // Parse coordinates
  const coords = parseCoordinates(strValue, config.format || 'decimal');

  if (!coords) {
    const formatExample = config.format === 'dms' ? '45°25\'17.4"N, 75°41\'49.9"W' : '45.4215, -75.6972';
    return errorResult(
      fieldName,
      `${fieldLabel} must be valid coordinates in ${config.format || 'decimal'} format (e.g., ${formatExample})`,
    );
  }

  const { lat, lng } = coords;

  // Validate coordinate ranges
  if (!isValidLatitude(lat)) {
    return errorResult(fieldName, `${fieldLabel} latitude must be between -90 and 90 degrees`);
  }

  if (!isValidLongitude(lng)) {
    return errorResult(fieldName, `${fieldLabel} longitude must be between -180 and 180 degrees`);
  }

  // Check region restrictions
  if (config.allowedRegions && config.allowedRegions.length > 0) {
    let inAllowedRegion = false;

    for (const regionName of config.allowedRegions) {
      const regionBounds = REGION_BOUNDS[regionName.toLowerCase()];
      if (regionBounds && isPointInBoundingBox(lat, lng, regionBounds)) {
        inAllowedRegion = true;
        break;
      }
    }

    if (!inAllowedRegion) {
      const regionList = config.allowedRegions.join(', ');
      return errorResult(fieldName, `${fieldLabel} must be within the allowed regions: ${regionList}`);
    }
  }

  // Check bounding box restriction
  if (config.boundingBox) {
    const box = config.boundingBox;

    // Validate bounding box configuration
    if (box.north < box.south) {
      return errorResult(fieldName, `${fieldLabel} configuration error: bounding box north must be greater than south`);
    }

    if (!isPointInBoundingBox(lat, lng, box)) {
      return errorResult(fieldName, `${fieldLabel} must be within the specified geographic area`);
    }
  }

  // Check polygons restriction (multiple polygons supported)
  if (config.polygons && config.polygons.length > 0) {
    let inAnyPolygon = false;

    for (let pIndex = 0; pIndex < config.polygons.length; pIndex++) {
      const polygon = config.polygons[pIndex];

      if (!Array.isArray(polygon.points)) {
        return errorResult(fieldName, `${fieldLabel} configuration error: polygon has no points`);
      }

      if (polygon.points?.length < 3) {
        return errorResult(
          fieldName,
          `${fieldLabel} configuration error: polygon at index ${pIndex} must have at least 3 points`,
        );
      }

      // Validate polygon points
      for (let i = 0; i < polygon.points.length; i++) {
        const point = polygon.points[i];
        if (!isValidLatitude(point.lat) || !isValidLongitude(point.lng)) {
          return errorResult(
            fieldName,
            `${fieldLabel} configuration error: invalid point at polygon ${pIndex}, index ${i}`,
          );
        }
      }

      if (isPointInPolygon(lat, lng, polygon.points)) {
        inAnyPolygon = true;
        break;
      }
    }

    if (!inAnyPolygon) {
      return errorResult(fieldName, `${fieldLabel} must be within one of the specified geographic areas`);
    }
  }

  // Check radius restriction
  if (config.radiusCenter && config.radiusKm != null) {
    // Validate radius center
    if (!isValidLatitude(config.radiusCenter.lat) || !isValidLongitude(config.radiusCenter.lng)) {
      return errorResult(fieldName, `${fieldLabel} configuration error: invalid radius center coordinates`);
    }

    if (config.radiusKm <= 0) {
      return errorResult(fieldName, `${fieldLabel} configuration error: radius must be greater than 0`);
    }

    const distance = haversineDistance(lat, lng, config.radiusCenter.lat, config.radiusCenter.lng);

    if (distance > config.radiusKm) {
      return errorResult(fieldName, `${fieldLabel} must be within ${config.radiusKm} km of the specified location`);
    }
  } else if (config.radiusCenter && config.radiusKm == null) {
    return errorResult(
      fieldName,
      `${fieldLabel} configuration error: radiusKm is required when radiusCenter is specified`,
    );
  } else if (!config.radiusCenter && config.radiusKm != null) {
    return errorResult(
      fieldName,
      `${fieldLabel} configuration error: radiusCenter is required when radiusKm is specified`,
    );
  }

  // Format output
  const precision = config.decimalPrecision ?? 6;
  const formattedValue = formatCoordinates(lat, lng, precision);

  return successResult(formattedValue);
};
