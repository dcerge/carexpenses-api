// ./src/core/TravelTrackingCore.ts

import { OpResult, OP_RESULT_CODES } from '@sdflc/api-helpers';
import { BaseCorePropsInterface, BaseCoreActionsInterface, BaseCoreValidatorsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { TRACKING_STATUS } from '../database';
import { USER_ROLES } from '../boundary';
import {
  validateTrackingTransition,
  trackingStatusLabel,
  buildTrackingPointRecords,
} from '../utils/trackingHelpers';
import { UUID_EMPTY } from '@sdflc/utils';
import { validators } from './validators/travelTrackingValidators';

class TravelTrackingCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      gatewayName: 'travelTrackingPointGw',
      name: 'TravelTracking',
      hasOrderNo: false,
      doAuth: true,
      doingWhat: {
        list: 'listing tracking points',
        get: '',
        getMany: '',
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
  // List override — filter by accountId for security
  // ===========================================================================

  public async beforeList(args: any, opt?: BaseCoreActionsInterface): Promise<any> {
    const { filter } = args || {};
    const { accountId } = this.getContext();

    return {
      ...args,
      filter: {
        ...filter,
        accountId,
      },
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Fetch a travel record and validate ownership + car access.
   * Returns [travel, null] on success or [null, OpResult] on failure.
   */
  private async getAndValidateTravel(travelId: string): Promise<[any, any]> {
    const { accountId } = this.getContext();

    if (!travelId) {
      return [null, this.failure(OP_RESULT_CODES.VALIDATION_FAILED, 'Travel ID is required')];
    }

    const travel = await this.getGateways().travelGw.get(travelId);

    if (!travel || travel.accountId !== accountId) {
      return [null, this.failure(OP_RESULT_CODES.NOT_FOUND, 'Travel not found')];
    }

    const hasAccess = await this.validateCarAccess({ id: travel.carId, accountId });

    if (!hasAccess) {
      return [null, this.failure(OP_RESULT_CODES.FORBIDDEN, 'You do not have permission to track this vehicle')];
    }

    return [travel, null];
  }

  /**
   * Check that the user's role allows tracking operations.
   * Returns an OpResult failure if forbidden, or null if allowed.
   */
  private checkTrackingPermission(): any {
    const { roleId } = this.getContext();

    if (roleId === USER_ROLES.VIEWER) {
      return this.failure(OP_RESULT_CODES.FORBIDDEN, 'You do not have permission to control tracking');
    }

    return null;
  }

  /**
   * Update travel tracking fields and invalidate its cache.
   */
  private async updateTravelTracking(travelId: string, fields: any): Promise<any[]> {
    const { accountId, userId } = this.getContext();

    const result = await this.getGateways().travelGw.update(
      { id: travelId, accountId },
      {
        ...fields,
        updatedBy: userId,
        updatedAt: this.now(),
      },
    );

    return result;
  }

  /**
   * Return the updated travel as a success response.
   */
  private async returnTravel(travelId: string): Promise<any> {
    const travel = await this.getGateways().travelGw.get(travelId);
    return this.success(travel);
  }

  // ===========================================================================
  // addTrackingPoints — batch insert of filtered GPS points
  // ===========================================================================

  public async addTrackingPoints(args: any): Promise<any> {
    return this.runAction({
      args,
      doAuth: true,
      validate: validators.addTrackingPoints,
      action: async (args: any) => {
        const { where, params } = args || {};
        const { id: travelId } = where || {};
        const { points, gpsDistance } = params || {};
        const { accountId } = this.getContext();

        // Permission check
        const permError = this.checkTrackingPermission();

        if (permError) {
          return permError;
        }

        // Validate travel
        const [travel, travelError] = await this.getAndValidateTravel(travelId);

        if (travelError) {
          return travelError;
        }

        // Must be actively tracking
        if (travel.trackingStatus !== TRACKING_STATUS.ACTIVE) {
          return this.failure(
            OP_RESULT_CODES.VALIDATION_FAILED,
            `Cannot add points: tracking is ${trackingStatusLabel(travel.trackingStatus)}, expected active`,
          );
        }

        // Validate seq continuity with existing data — skip duplicates for idempotency
        const lastPoint = await this.getGateways().travelTrackingPointGw.getLastPoint(accountId, travelId);

        let pointsToInsert = points;

        if (lastPoint) {
          const lastStoredSeq = lastPoint.seq;

          // Filter out points that have already been stored (idempotent retry)
          pointsToInsert = points.filter((p: any) => p.seq > lastStoredSeq);

          if (pointsToInsert.length === 0) {
            // All points already stored — this is a duplicate batch, just update gpsDistance and return success
            if (gpsDistance != null) {
              await this.updateTravelTracking(travelId, { gpsDistance });
            }

            return this.returnTravel(travelId);
          }
        }

        // Build gateway-ready records
        const records = buildTrackingPointRecords(
          accountId || UUID_EMPTY,
          travelId,
          travel.currentSegmentId,
          pointsToInsert,
        );

        // Batch insert
        await this.getGateways().travelTrackingPointGw.create(records);

        // Update gps_distance on the travel
        if (gpsDistance != null) {
          await this.updateTravelTracking(travelId, { gpsDistance });
        }

        return this.returnTravel(travelId);
      },
      hasTransaction: true,
      doingWhat: 'adding tracking points',
    });
  }

  // ===========================================================================
  // discardTracking — hard-delete all points and reset tracking fields
  // ===========================================================================

  public async discardTracking(args: any): Promise<any> {
    return this.runAction({
      args,
      doAuth: true,
      validate: validators.discardTracking,
      action: async (args: any) => {
        const { where } = args || {};
        const { id: travelId } = where || {};
        const { accountId } = this.getContext();

        // Permission check
        const permError = this.checkTrackingPermission();
        if (permError) return permError;

        // Validate travel
        const [travel, travelError] = await this.getAndValidateTravel(travelId);
        if (travelError) return travelError;

        // Can only discard if tracking was started
        if (travel.trackingStatus === TRACKING_STATUS.NONE) {
          return this.failure(
            OP_RESULT_CODES.VALIDATION_FAILED,
            'No tracking data to discard',
          );
        }

        // Hard-delete all tracking points for this travel
        await this.getGateways().travelTrackingPointGw.removeByTravelId(accountId, travelId);

        // Reset tracking fields on the travel record
        await this.updateTravelTracking(travelId, {
          trackingStatus: TRACKING_STATUS.NONE,
          currentSegmentId: 0,
          gpsDistance: null,
          encodedPolyline: null,
          routeUploadedFileId: null,
          trackingStartedAt: null,
          trackingEndedAt: null,
        });

        return this.returnTravel(travelId);
      },
      hasTransaction: true,
      doingWhat: 'discarding tracking data',
    });
  }
}

export { TravelTrackingCore };