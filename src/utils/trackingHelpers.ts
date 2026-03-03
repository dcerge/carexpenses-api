// ./src/utils/trackingHelpers.ts

/**
 * Tracking lifecycle helpers for live travel tracking.
 * State machine validation, record building, and route image URL generation.
 * Pure functions — no gateway or service dependencies.
 */

import { TRACKING_STATUS } from '../database/helpers';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TrackingPointInput {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  recordedAt: string; // ISO timestamp
  seq: number;
}

interface TrackingPointRecord {
  accountId: string;
  travelId: string;
  segmentId: number;
  seq: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  recordedAt: string;
}

// -----------------------------------------------------------------------------
// State Machine
// -----------------------------------------------------------------------------

/**
 * Valid tracking status transitions.
 *
 * NONE (0) → ACTIVE (1)       — start tracking
 * ACTIVE (1) → PAUSED (2)     — pause tracking
 * ACTIVE (1) → COMPLETED (3)  — complete travel with active tracking
 * PAUSED (2) → ACTIVE (1)     — resume tracking
 * PAUSED (2) → COMPLETED (3)  — complete travel while paused
 * COMPLETED (3) → ACTIVE (1)  — restart tracking (re-track a completed travel)
 */
const VALID_TRANSITIONS: Record<number, number[]> = {
  [TRACKING_STATUS.NONE]: [TRACKING_STATUS.ACTIVE],
  [TRACKING_STATUS.ACTIVE]: [TRACKING_STATUS.PAUSED, TRACKING_STATUS.COMPLETED],
  [TRACKING_STATUS.PAUSED]: [TRACKING_STATUS.ACTIVE, TRACKING_STATUS.COMPLETED],
  [TRACKING_STATUS.COMPLETED]: [TRACKING_STATUS.ACTIVE],
};

/**
 * Validates whether a tracking status transition is allowed.
 */
export const validateTrackingTransition = (
  currentStatus: number,
  targetStatus: number
): boolean => {
  const allowed = VALID_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
};

/**
 * Returns a human-readable label for a tracking status value.
 * Useful for error messages.
 */
export const trackingStatusLabel = (status: number): string => {
  switch (status) {
    case TRACKING_STATUS.NONE:
      return 'none';
    case TRACKING_STATUS.ACTIVE:
      return 'active';
    case TRACKING_STATUS.PAUSED:
      return 'paused';
    case TRACKING_STATUS.COMPLETED:
      return 'completed';
    default:
      return `unknown(${status})`;
  }
};

// -----------------------------------------------------------------------------
// Record Building
// -----------------------------------------------------------------------------

/**
 * Transforms an array of client-submitted tracking point inputs into
 * gateway-ready records with account_id, travel_id, and segment_id.
 */
export const buildTrackingPointRecords = (
  accountId: string,
  travelId: string,
  segmentId: number,
  points: TrackingPointInput[]
): TrackingPointRecord[] => {
  return points.map((p) => ({
    accountId: accountId,
    travelId: travelId,
    segmentId: segmentId,
    seq: p.seq,
    latitude: p.latitude,
    longitude: p.longitude,
    altitude: p.altitude ?? null,
    speed: p.speed ?? null,
    heading: p.heading ?? null,
    accuracy: p.accuracy ?? null,
    recordedAt: p.recordedAt,
  }));
};

// -----------------------------------------------------------------------------
// Route Image URL
// -----------------------------------------------------------------------------

interface RouteImageOptions {
  width?: number;
  height?: number;
  scale?: 1 | 2;
  pathColor?: string;  // hex without #, e.g. '4285F4'
  pathWeight?: number;
}

const DEFAULT_ROUTE_IMAGE_OPTIONS: Required<RouteImageOptions> = {
  width: 640,
  height: 400,
  scale: 2,
  pathColor: '4285F4',
  pathWeight: 3,
};

/**
 * Builds a Google Static Maps API URL that renders the route from an encoded polyline.
 * The URL can be fetched to download a PNG image.
 *
 * @param encodedPolyline - Google Encoded Polyline string.
 * @param apiKey - Google Maps API key.
 * @param options - Optional overrides for image size, scale, path color/weight.
 * @returns Full Static Maps API URL.
 */
export const generateRouteImageUrl = (
  encodedPolyline: string,
  apiKey: string,
  options?: RouteImageOptions
): string => {
  const opts = { ...DEFAULT_ROUTE_IMAGE_OPTIONS, ...options };

  const params = new URLSearchParams({
    size: `${opts.width}x${opts.height}`,
    scale: String(opts.scale),
    maptype: 'roadmap',
    path: `color:0x${opts.pathColor}FF|weight:${opts.pathWeight}|enc:${encodedPolyline}`,
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
};