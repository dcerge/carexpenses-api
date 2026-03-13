// ./src/core/ReportCarHandoverCore.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';

import { AppCore } from './AppCore';
import { validators } from './validators/reportCarHandoverValidators';
import { fromMetricDistanceRounded } from '../utils/unitConversions';
import { CAR_STATUSES } from '../boundary';
import { OP_RESULT_CODES } from '@sdflc/api-helpers';

dayjs.extend(utc);

// =============================================================================
// Interfaces
// =============================================================================

interface HandoverRecord {
  id: string;
  whenDone: string;
  odometer: number | null;
  odometerUnit: string;
  categoryCode: string;
  categoryName: string;
  kindCode: string;
  kindName: string;
  whereDone: string | null;
  shortNote: string | null;
  comments: string | null;
}

interface HandoverReport {
  carId: string;
  latestMileage: number | null;
  //mileageUnit: string;
  generatedAt: string;
  totalRecords: number;
  records: HandoverRecord[];
}

// =============================================================================
// ReportCarHandoverCore
// =============================================================================

class ReportCarHandoverCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super({
      ...props,
      name: 'ReportCarHandover',
      hasOrderNo: false,
      doAuth: true,
    });
  }

  public async get(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      validate: validators.get,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const params = args?.params || {};
        const { accountId, userId } = this.getContext();

        // =====================================================================
        // 1. Apply defaults
        // =====================================================================

        const timezoneOffset = params.timezoneOffset ?? 0;

        // =====================================================================
        // 2. Resolve language from user profile
        // =====================================================================

        const authUser = await this.getGateways().authUserGw.get(userId, { headers: this.getHeaders() });
        const userProfile = await this.getCurrentUserProfile();
        const lang = authUser.uiLanguage || 'en';
        const userDistanceUnit = userProfile.distanceIn || 'km';

        // =====================================================================
        // 3. Verify car exists and is accessible to this account
        // =====================================================================

        const accessibleCarIds = await this.filterAccessibleCarIds([params.carId]);

        if (!accessibleCarIds || accessibleCarIds.length === 0) {
          this.logger.log(`Car handover report requested for inaccessible car '${params.carId}' by account '${accountId}'`);
          return this.failure(OP_RESULT_CODES.NOT_FOUND, "Car not found or access denied");
        }

        const carId = accessibleCarIds[0];

        const carsResult = await this.getGateways().carGw.list({
          filter: {
            accountId,
            id: carId,
            status: [CAR_STATUSES.ACTIVE],
          },
        });

        const cars = carsResult.data || carsResult || [];

        if (cars.length === 0) {
          this.logger.log(`Car handover report: car '${carId}' not found for account '${accountId}'`);
          return this.failure(OP_RESULT_CODES.NOT_FOUND, "Car not found");
        }

        const car = cars[0];
        const carMileageUnit = car.mileageIn || 'km';

        // =====================================================================
        // 4. Fetch latest known mileage from car total summaries
        // =====================================================================

        const totalSummariesResult = await this.getGateways().carTotalSummaryGw.list({
          filter: { carId, accountId },
        });

        const totalRows: any[] = totalSummariesResult.data || totalSummariesResult || [];

        // latest_known_mileage is stored in km — take max across currency rows
        let latestMileageKm = 0;
        let hasAnyMileage = false;

        for (const row of totalRows) {
          const km = row.latestKnownMileage != null ? Number(row.latestKnownMileage) : 0;
          if (km > 0) {
            hasAnyMileage = true;
            latestMileageKm = Math.max(latestMileageKm, km);
          }
        }

        // Convert to car's display unit and round to whole number
        const latestMileage = hasAnyMileage
          ? fromMetricDistanceRounded(latestMileageKm, carMileageUnit)
          : null;

        // =====================================================================
        // 5. Fetch maintenance and repair records
        // =====================================================================

        const rawRecords = await this.getGateways().expenseBaseGw.listForHandover({
          carId,
          accountId,
          lang,
        });

        // =====================================================================
        // 6. Map raw records — convert odometer from km to car's unit
        // =====================================================================

        const records: HandoverRecord[] = rawRecords.map((raw) => {
          // Odometer in expense_bases is stored in the car's native unit,
          // not in km — no conversion needed, just round to whole number
          const odometer = raw.odometer != null
            ? fromMetricDistanceRounded(raw.odometer, carMileageUnit)
            : null;

          return {
            id: raw.id,
            whenDone: dayjs(raw.whenDone).utc().format('YYYY-MM-DDTHH:mm:ss.000Z'),
            odometer,
            //odometerUnit: carMileageUnit,
            categoryCode: raw.categoryCode,
            categoryName: raw.categoryName ?? raw.categoryCode,
            kindCode: raw.kindCode,
            kindName: raw.kindName ?? raw.kindCode,
            whereDone: raw.whereDone,
            shortNote: raw.shortNote,
            comments: raw.comments,
          };
        });

        // =====================================================================
        // 7. Build generatedAt in user's local time
        // =====================================================================

        const generatedAt = dayjs.utc().subtract(timezoneOffset, 'minute').format('YYYY-MM-DDTHH:mm:ss.000Z');

        // =====================================================================
        // 8. Assemble and return report
        // =====================================================================

        const report: HandoverReport = {
          carId,
          latestMileage,
          //mileageUnit: carMileageUnit,
          generatedAt,
          totalRecords: records.length,
          records,
        };

        return this.success([report]);
      },
      hasTransaction: false,
      doingWhat: 'getting car handover report',
    });
  }
}

export { ReportCarHandoverCore };