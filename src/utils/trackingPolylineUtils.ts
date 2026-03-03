// ./src/utils/trackingPolylineUtils.ts
/**
 * Polyline encoding/decoding and route simplification for live travel tracking.
 * Uses @mapbox/polyline for encoding and implements Ramer-Douglas-Peucker for simplification.
 * Pure functions — no gateway or service dependencies.
 */

import polyline from '@mapbox/polyline';

interface LatLng {
  lat: number;
  lng: number;
}

interface SegmentedPoint extends LatLng {
  segmentId: number;
}

// -----------------------------------------------------------------------------
// Polyline Encoding / Decoding
// -----------------------------------------------------------------------------

/**
 * Encodes an array of lat/lng points into a Google Encoded Polyline string.
 */
export const encodePolyline = (points: LatLng[]): string => {
  const coords: Array<[number, number]> = points.map((p) => [p.lat, p.lng]);
  return polyline.encode(coords);
};

/**
 * Decodes a Google Encoded Polyline string into an array of lat/lng points.
 */
export const decodePolyline = (encoded: string): LatLng[] => {
  const coords = polyline.decode(encoded);
  return coords.map(([lat, lng]) => ({ lat, lng }));
};

// -----------------------------------------------------------------------------
// Ramer-Douglas-Peucker Simplification
// -----------------------------------------------------------------------------

/**
 * Default RDP epsilon in degrees. Roughly corresponds to 10–15 meters.
 */
export const RDP_DEFAULT_EPSILON = 0.00010;

/**
 * Calculates the perpendicular distance from a point to the line defined by lineStart → lineEnd.
 * Uses a simple Cartesian approximation, which is accurate enough for small distances
 * between consecutive GPS points (sub-kilometer scale).
 */
const perpendicularDistance = (point: LatLng, lineStart: LatLng, lineEnd: LatLng): number => {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  // If start and end are the same point, return distance to that point
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    const px = point.lng - lineStart.lng;
    const py = point.lat - lineStart.lat;
    return Math.sqrt(px * px + py * py);
  }

  // Project point onto the line and compute perpendicular distance
  const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / lengthSq;
  const clampedT = Math.max(0, Math.min(1, t));

  const projLng = lineStart.lng + clampedT * dx;
  const projLat = lineStart.lat + clampedT * dy;

  const distLng = point.lng - projLng;
  const distLat = point.lat - projLat;

  return Math.sqrt(distLng * distLng + distLat * distLat);
};

/**
 * Ramer-Douglas-Peucker line simplification algorithm.
 * Recursively removes points that are within `epsilon` distance of the line
 * between their neighbors, preserving the overall shape of the route.
 *
 * @param points - Array of lat/lng points to simplify.
 * @param epsilon - Maximum allowed perpendicular distance in degrees. Default ~10-15m.
 * @returns Simplified array of points.
 */
export const rdpSimplify = (points: LatLng[], epsilon: number = RDP_DEFAULT_EPSILON): LatLng[] => {
  if (points.length <= 2) {
    return [...points];
  }

  // Find the point with the maximum distance from the line (first → last)
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If the max distance exceeds epsilon, recursively simplify both halves
  if (maxDistance > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIndex), epsilon);

    // Concatenate, removing the duplicate point at the junction
    return [...left.slice(0, -1), ...right];
  }

  // All intermediate points are within epsilon — keep only the endpoints
  return [points[0], points[points.length - 1]];
};

/**
 * Simplifies tracking points respecting segment boundaries.
 * Each segment is simplified independently to preserve gaps between pause/resume cycles.
 * Points must be pre-sorted by seq.
 *
 * @param points - Array of points with segmentId, sorted by seq.
 * @param epsilon - RDP epsilon in degrees.
 * @returns Simplified array preserving segment boundaries.
 */
export const rdpSimplifyBySegments = (
  points: SegmentedPoint[],
  epsilon: number = RDP_DEFAULT_EPSILON
): SegmentedPoint[] => {
  if (points.length === 0) {
    return [];
  }

  // Group points by segment
  const segments = new Map<number, SegmentedPoint[]>();

  for (const point of points) {
    const segment = segments.get(point.segmentId);
    if (segment) {
      segment.push(point);
    } else {
      segments.set(point.segmentId, [point]);
    }
  }

  // Simplify each segment independently, then concatenate in segment order
  const sortedSegmentIds = [...segments.keys()].sort((a, b) => a - b);
  const result: SegmentedPoint[] = [];

  for (const segmentId of sortedSegmentIds) {
    const segmentPoints = segments.get(segmentId)!;
    const simplified = rdpSimplify(segmentPoints, epsilon) as SegmentedPoint[];

    // Restore segmentId on simplified points (rdpSimplify returns LatLng[])
    for (const p of simplified) {
      p.segmentId = segmentId;
    }

    result.push(...simplified);
  }

  return result;
};