// ./src/utils/trackingGeoUtils.ts

/**
 * Geospatial utility functions for live travel tracking.
 * Pure functions — no gateway or service dependencies.
 */

const EARTH_RADIUS_M = 6_371_000; // Earth's mean radius in meters

interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Converts degrees to radians.
 */
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Converts radians to degrees.
 */
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 * @returns Distance in meters.
 */
export const haversineDistance = (p1: LatLng, p2: LatLng): number => {
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Calculates the initial bearing (forward azimuth) from p1 to p2.
 * @returns Bearing in degrees (0–360), where 0 = North, 90 = East, etc.
 */
export const calculateBearing = (p1: LatLng, p2: LatLng): number => {
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const dLng = toRad(p2.lng - p1.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Calculates the absolute angular difference between two bearings.
 * Handles the 0/360 wraparound correctly.
 * @returns Difference in degrees (0–180).
 */
export const bearingDelta = (bearing1: number, bearing2: number): number => {
  const diff = Math.abs(bearing1 - bearing2) % 360;
  return diff > 180 ? 360 - diff : diff;
};

/**
 * Sums the great-circle distances between consecutive points.
 * @returns Total distance in meters.
 */
export const calculateTotalDistance = (points: LatLng[]): number => {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;

  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }

  return total;
};

/**
 * Converts meters to kilometers, rounded to 3 decimal places.
 */
export const metersToKm = (meters: number): number => {
  return Math.round(meters) / 1000;
};

/**
 * Converts m/s to km/h.
 */
export const mpsToKmh = (mps: number): number => {
  return mps * 3.6;
};