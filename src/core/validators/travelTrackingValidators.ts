import Checkit from 'checkit';
import dayjs from 'dayjs';
import {
  BaseCoreActionsInterface,
  validateList,
} from '@sdflc/backend-helpers';
import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';

// =============================================================================
// List filter validation (for trackingPointList)
// =============================================================================

const rulesList = new Checkit({
  travelId: [
    {
      rule: 'uuid',
      message: 'Travel ID should be a valid UUID',
    },
  ],
  accountId: [
    {
      rule: 'array',
      message: 'Account IDs should be an array of UUIDs',
    },
  ],
  segmentId: [
    {
      rule: 'integer',
      message: 'Segment ID should be an integer',
    },
  ],
});

// =============================================================================
// Single tracking point validation
// =============================================================================

const MAX_BATCH_SIZE = 50;
const MAX_FUTURE_TOLERANCE_SECONDS = 60;

/**
 * Validate a single tracking point input.
 * Returns an array of error objects or empty array if valid.
 */
const validateTrackingPoint = (
  point: any,
  index: number,
): Array<{ field: string; message: string }> => {
  const errors: Array<{ field: string; message: string }> = [];
  const prefix = `points[${index}]`;

  // latitude — required, number, -90 to 90
  if (point.latitude == null) {
    errors.push({ field: `${prefix}.latitude`, message: 'Latitude is required' });
  } else if (typeof point.latitude !== 'number' || isNaN(point.latitude)) {
    errors.push({ field: `${prefix}.latitude`, message: 'Latitude should be a number' });
  } else if (point.latitude < -90 || point.latitude > 90) {
    errors.push({ field: `${prefix}.latitude`, message: 'Latitude must be between -90 and 90' });
  }

  // longitude — required, number, -180 to 180
  if (point.longitude == null) {
    errors.push({ field: `${prefix}.longitude`, message: 'Longitude is required' });
  } else if (typeof point.longitude !== 'number' || isNaN(point.longitude)) {
    errors.push({ field: `${prefix}.longitude`, message: 'Longitude should be a number' });
  } else if (point.longitude < -180 || point.longitude > 180) {
    errors.push({ field: `${prefix}.longitude`, message: 'Longitude must be between -180 and 180' });
  }

  // altitude — optional, number
  if (point.altitude != null && (typeof point.altitude !== 'number' || isNaN(point.altitude))) {
    errors.push({ field: `${prefix}.altitude`, message: 'Altitude should be a number' });
  }

  // speed — optional, number, >= 0
  if (point.speed != null) {
    if (typeof point.speed !== 'number' || isNaN(point.speed)) {
      errors.push({ field: `${prefix}.speed`, message: 'Speed should be a number' });
    } else if (point.speed < 0) {
      errors.push({ field: `${prefix}.speed`, message: 'Speed cannot be negative' });
    }
  }

  // heading — optional, number, 0 to 360
  if (point.heading != null) {
    if (typeof point.heading !== 'number' || isNaN(point.heading)) {
      errors.push({ field: `${prefix}.heading`, message: 'Heading should be a number' });
    } else if (point.heading < 0 || point.heading > 360) {
      errors.push({ field: `${prefix}.heading`, message: 'Heading must be between 0 and 360' });
    }
  }

  // accuracy — optional, number, >= 0
  if (point.accuracy != null) {
    if (typeof point.accuracy !== 'number' || isNaN(point.accuracy)) {
      errors.push({ field: `${prefix}.accuracy`, message: 'Accuracy should be a number' });
    } else if (point.accuracy < 0) {
      errors.push({ field: `${prefix}.accuracy`, message: 'Accuracy cannot be negative' });
    }
  }

  // recordedAt — required, valid ISO timestamp, not too far in the future
  if (!point.recordedAt) {
    errors.push({ field: `${prefix}.recordedAt`, message: 'Recorded at timestamp is required' });
  } else {
    const parsed = dayjs(point.recordedAt);
    if (!parsed.isValid()) {
      errors.push({ field: `${prefix}.recordedAt`, message: 'Recorded at is not a valid datetime' });
    } else {
      const now = dayjs();
      const diffSeconds = parsed.diff(now, 'second');
      if (diffSeconds > MAX_FUTURE_TOLERANCE_SECONDS) {
        errors.push({
          field: `${prefix}.recordedAt`,
          message: `Recorded at cannot be more than ${MAX_FUTURE_TOLERANCE_SECONDS} seconds in the future`,
        });
      }
    }
  }

  // seq — required, integer, >= 0
  if (point.seq == null) {
    errors.push({ field: `${prefix}.seq`, message: 'Sequence number is required' });
  } else if (!Number.isInteger(point.seq)) {
    errors.push({ field: `${prefix}.seq`, message: 'Sequence number should be an integer' });
  } else if (point.seq < 0) {
    errors.push({ field: `${prefix}.seq`, message: 'Sequence number cannot be negative' });
  }

  return errors;
};

// =============================================================================
// addTrackingPoints validation
// =============================================================================

const validateAddTrackingPoints = async (args: any, opt: BaseCoreActionsInterface) => {
  const { where, params } = args || {};
  const { id: travelId } = where || {};
  const { points, gpsDistance } = params || {};

  const errors: Array<{ field: string; message: string }> = [];

  // Travel ID — required, UUID
  if (!travelId) {
    errors.push({ field: 'where.id', message: 'Travel ID is required' });
  }

  // gpsDistance — required, number, >= 0
  if (gpsDistance == null) {
    errors.push({ field: 'gpsDistance', message: 'GPS distance is required' });
  } else if (typeof gpsDistance !== 'number' || isNaN(gpsDistance)) {
    errors.push({ field: 'gpsDistance', message: 'GPS distance should be a number' });
  } else if (gpsDistance < 0) {
    errors.push({ field: 'gpsDistance', message: 'GPS distance cannot be negative' });
  }

  // points — required, non-empty array, max batch size
  if (!Array.isArray(points) || points.length === 0) {
    errors.push({ field: 'points', message: 'Points array is required and must not be empty' });
  } else if (points.length > MAX_BATCH_SIZE) {
    errors.push({ field: 'points', message: `Maximum ${MAX_BATCH_SIZE} points per batch` });
  } else {
    // Validate each point
    for (let i = 0; i < points.length; i++) {
      const pointErrors = validateTrackingPoint(points[i], i);
      errors.push(...pointErrors);
    }

    // Validate seq monotonicity within batch (only if individual points passed)
    if (errors.length === 0) {
      for (let i = 1; i < points.length; i++) {
        if (points[i].seq <= points[i - 1].seq) {
          errors.push({
            field: `points[${i}].seq`,
            message: `Sequence numbers must be monotonically increasing (${points[i].seq} <= ${points[i - 1].seq})`,
          });
          break; // One error is enough to convey the issue
        }
      }
    }
  }

  if (errors.length > 0) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    errors.forEach((err) => opResult.addError(err.field, err.message));
    return [opResult, {}];
  }

  return [true, {}];
};

// =============================================================================
// discardTracking validation
// =============================================================================

const validateDiscardTracking = async (args: any, opt: BaseCoreActionsInterface) => {
  const { where } = args || {};
  const { id: travelId } = where || {};

  if (!travelId) {
    const opResult = new OpResult({ code: OP_RESULT_CODES.VALIDATION_FAILED });
    opResult.addError('where.id', 'Travel ID is required');
    return [opResult, {}];
  }

  return [true, {}];
};

// =============================================================================
// Exports
// =============================================================================

const validators = {
  list: validateList({ rules: rulesList }),
  addTrackingPoints: validateAddTrackingPoints,
  discardTracking: validateDiscardTracking,
};

export { validators };