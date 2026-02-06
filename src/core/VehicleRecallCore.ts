import { omit } from 'lodash';
import { BaseCorePropsInterface, BaseCoreActionsInterface } from '@sdflc/backend-helpers';
import { OP_RESULT_CODES } from '@sdflc/api-helpers';

import { AppCore } from './AppCore';
import { RECALL_SOURCES } from '../database';
import { NhtsaRecallsGateway, NormalizedRecall } from '../gateways/apis/NhtsaRecallsGateway';
import { RecallFetcherGw, RecallFetchResult, RecallSource } from '../gateways/apis/RecallFetcherGw';
import { TcRecallsGateway } from '../gateways/apis/TcRecallsGateway';
import config from '../config';
import { removeSystemFields } from '../utils';


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How long a successfully-fetched lookup stays fresh (7 days) */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** After a fetch error, wait before retrying (1 hour) */
const ERROR_RETRY_MS = 1 * 60 * 60 * 1000;

/** Maximum number of lookups to process per batch run */
const MAX_LOOKUPS_PER_BATCH = 50;

/** Status values for vehicle_recall_lookups */
const LOOKUP_STATUS = {
  PENDING: 300,
  ACTIVE: 100,
  BLOCKED: 1000,
};

/** Status values for vehicle_recalls */
const RECALL_STATUS = {
  ACTIVE: 100,
  REMOVED: 10000,
};

/** Status values for vehicle_recall_statuses */
const RECALL_STATUS_USER = {
  ACTIVE: 100,
  DISMISSED: 5000,
  RESOLVED: 10000,
};

/** Source-to-country mapping */
const SOURCE_COUNTRY: Record<string, string> = {
  [RECALL_SOURCES.NHTSA]: 'US',
  [RECALL_SOURCES.TC]: 'CA',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarCombo {
  makeName: string;
  model: string;
  modelYear: number;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

class VehicleRecallCore extends AppCore {
  constructor(props: BaseCorePropsInterface) {
    super(props);
  }

  // ===========================================================================
  // PUBLIC — Fetch / Sync operations (called by CLI / scheduler)
  // ===========================================================================

  /**
   * Ensure lookup rows exist in vehicle_recall_lookups for every unique
   * make/model/year in the cars table. Creates a lookup row per source
   * (NHTSA, TC) with status=Pending if not already present.
   *
   * Called before fetchStaleRecalls to make sure new cars get queued.
   */
  public async ensureLookups(args: any) {
    return this.runAction({
      args,
      doAuth: false,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const gateways = this.getGateways();

        // 1. Get all distinct make/model/year combos from active cars
        const combos: CarCombo[] = await gateways.carGw.getDistinctMakeModelYear();

        if (combos.length === 0) {
          return this.success({ created: 0, combos: 0 });
        }

        // 2. Load existing lookups to avoid duplicates
        const existingLookups = await gateways.vehicleRecallLookupGw.list({
          filter: {
            status: [LOOKUP_STATUS.PENDING, LOOKUP_STATUS.ACTIVE, LOOKUP_STATUS.BLOCKED],
          },
          params: {
            pagination: {
              pageSize: 10000
            },
          }
        });

        const existingKeys = new Set<string>();
        for (const lookup of existingLookups) {
          existingKeys.add(`${lookup.makeName}::${lookup.model}::${lookup.modelYear}::${lookup.source}`);
        }

        // 3. Create missing lookups — one per source per combo
        const sources = [RECALL_SOURCES.NHTSA, RECALL_SOURCES.TC];
        let createdCount = 0;

        for (const combo of combos) {
          for (const source of sources) {
            const key = `${combo.makeName}::${combo.model}::${combo.modelYear}::${source}`;

            if (existingKeys.has(key)) {
              continue;
            }

            await gateways.vehicleRecallLookupGw.create({
              makeName: combo.makeName,
              model: combo.model,
              modelYear: combo.modelYear,
              source,
              countryCode: SOURCE_COUNTRY[source] || 'US',
              fetchedAt: null,
              nextFetchAfter: null,
              resultsCount: 0,
              fetchError: null,
              status: LOOKUP_STATUS.PENDING,
            });

            createdCount++;
          }
        }

        return this.success({ created: createdCount, combos: combos.length });
      },
      hasTransaction: false,
      doingWhat: 'ensuring recall lookups exist for all vehicles',
    });
  }

  /**
   * Fetch recalls for stale lookups (pending or cache-expired).
   * Processes up to MAX_LOOKUPS_PER_BATCH lookups per invocation.
   *
   * For each lookup:
   * 1. Call the RecallFetcherGw for the relevant source
   * 2. Upsert recall records into vehicle_recalls
   * 3. Update the lookup row (fetched_at, next_fetch_after, results_count, status)
   *
   * Called by CLI scheduler (e.g. every week).
   */
  public async fetchStaleRecalls(args: any) {
    return this.runAction({
      args,
      doAuth: false,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const gateways = this.getGateways();
        const now = this.now();

        this.logger.log(`Fetch stale vehicle recalls data (date: ${now.toISOString()})`);

        // 1. Find lookups that need fetching
        const staleLookups = await gateways.vehicleRecallLookupGw.list({
          filter: {
            nextFetchBefore: now.toISOString(),
            status: [LOOKUP_STATUS.PENDING, LOOKUP_STATUS.ACTIVE, LOOKUP_STATUS.BLOCKED],
          },
          params: {
            pagination: {
              pageSize: MAX_LOOKUPS_PER_BATCH
            },
          }
        });

        if (staleLookups.length === 0) {
          this.logger.log(`No stale lookups were found, skip`);
          return this.success({ processed: 0, errors: 0, combos: 0, message: 'No stale lookups found' });
        }

        const sources: RecallSource[] = []; //['NHTSA'];
        const tcGateway = new TcRecallsGateway({ csvFilePath: config.vrdbCsvFilePath });

        if (tcGateway.isAvailable()) {
          sources.push('TC');
        }

        const recallFetcherGw = new RecallFetcherGw({
          sources,
          nhtsaGateway: new NhtsaRecallsGateway({}),
          tcGateway,
        });


        // 2. Group lookups by make/model/year
        const comboMap = new Map<string, any[]>();

        for (const lookup of staleLookups) {
          const comboKey = `${lookup.makeName}::${lookup.model}::${lookup.modelYear}`;

          if (!comboMap.has(comboKey)) {
            comboMap.set(comboKey, []);
          }

          comboMap.get(comboKey)!.push(lookup);
        }

        let processedCount = 0;
        let errorCount = 0;

        // 3. Process each combo
        for (const [comboKey, lookups] of comboMap.entries()) {
          const { makeName, model, modelYear } = lookups[0];

          try {
            const fetchResults: RecallFetchResult[] =
              await recallFetcherGw.fetchForLookup(makeName, model, modelYear);

            for (const fetchResult of fetchResults) {
              const lookup = lookups.find((l: any) => l.source === fetchResult.source);

              if (!lookup) {
                continue;
              }

              await this.processSourceResult(lookup, fetchResult, now);
              processedCount++;
            }

            // Handle stale lookups that weren't attempted
            for (const lookup of lookups) {
              const wasProcessed = fetchResults.some((r: RecallFetchResult) => r.source === lookup.source);

              if (!wasProcessed) {
                await gateways.vehicleRecallLookupGw.update(
                  { id: lookup.id },
                  {
                    nextFetchAfter: new Date(now.getTime() + ERROR_RETRY_MS).toISOString(),
                    fetchError: 'Source not configured or skipped',
                  }
                );
              }
            }
          } catch (err: any) {
            errorCount++;
            console.error(`VehicleRecallCore fetchStaleRecalls error for ${comboKey}:`, err);

            for (const lookup of lookups) {
              await gateways.vehicleRecallLookupGw.update(
                { id: lookup.id },
                {
                  status: LOOKUP_STATUS.BLOCKED,
                  fetchError: err.message || 'Unknown error',
                  nextFetchAfter: new Date(now.getTime() + ERROR_RETRY_MS).toISOString(),
                }
              );
            }
          }
        }

        return this.success({
          processed: processedCount,
          errors: errorCount,
          combos: comboMap.size,
        });
      },
      hasTransaction: false,
      doingWhat: 'fetching stale vehicle recall lookups from external APIs',
    });
  }

  // ===========================================================================
  // PUBLIC — User-facing read operations
  // ===========================================================================

  /**
   * List recalls for a user's car. Reads directly from the shared recall
   * catalog by resolving the car's make/model/year, then overlays any
   * user-specific statuses (dismiss, resolve, notes).
   *
   * No pre-linking required — vehicle_recall_statuses rows only exist
   * when a user has taken action on a recall.
   */
  public async listRecallsForCar(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { userId, accountId } = this.getContext();
        const gateways = this.getGateways();
        const { carId, statusFilter, searchKeyword, params } = args || {};

        if (!carId) {
          return this.failure(OP_RESULT_CODES.FAILED, 'Car ID is required');
        }

        // 1. Load the car and verify access
        const cars = await gateways.carGw.list({
          filter: { id: carId, accountId },
          params: {
            pagination: {
              pageSize: 1,
            },
          }
        });

        const car = cars.length > 0 ? cars[0] : null;

        if (!car) {
          this.logger.log(`Failed to list vehicle recalls as car ID ${carId} was not found in the account ${accountId}`);
          return this.failure(OP_RESULT_CODES.FAILED, 'Vehicle not found');
        }

        // DRIVER role access control
        if (this.isDriverRole()) {
          const hasAccess = await this.hasAccessToCar(car.id);
          if (!hasAccess) {
            this.logger.log(`The user ${userId} has no access to the car ID ${carId} in the account ${accountId}`);
            return this.failure(OP_RESULT_CODES.FAILED, 'Access denied to this vehicle');
          }
        }

        // 2. Resolve make/model/year
        const makeName = await this.resolveCarMakeName(car);
        const model = (car.model || '').toUpperCase().trim();
        const modelYear = car.manufacturedIn;

        if (!makeName || !model || !modelYear) {
          // Car is missing make/model/year — return empty list, not an error
          this.logger.log(`The car ID ${carId} has no make, not model and no year, return empty list`);
          return this.success([]);
        }

        // 3. Find lookups for this make/model/year
        const lookups = await gateways.vehicleRecallLookupGw.list({
          filter: { makeName, model, modelYear },
          params: {
            pagination: {
              pageSize: 100
            },
          }
        });

        this.logger.debug(`Recall lookups for the car: ${makeName} ${model} ${modelYear}`, lookups);

        if (lookups.length === 0) {
          return this.success([]);
        }

        const lookupIds = lookups.map((l: any) => l.id);

        // 4. Load recalls from the shared catalog
        const recallFilter: Record<string, any> = {
          lookupId: lookupIds,
          status: [RECALL_STATUS.ACTIVE],
        };

        if (searchKeyword) {
          recallFilter.searchKeyword = searchKeyword;
        }

        const recalls = await gateways.vehicleRecallGw.list({
          filter: recallFilter,
          params: {
            pagination: {
              pageSize: params?.pageSize || 500
            },
          }
        });

        this.logger.debug(`Recalls for the filter:`, recallFilter, recalls);

        if (recalls.length === 0) {
          return this.success([]);
        }

        // 5. Load user's statuses for this car (sparse — only where user acted)
        const recallIds = recalls.map((r: any) => r.id);

        const statuses = await gateways.vehicleRecallStatusGw.list({
          filter: {
            accountId,
            carId,
            vehicleRecallId: recallIds,
          },
          params: {
            pagination: {
              pageSize: recallIds.length
            },
          }
        });

        this.logger.debug(`User recall statuses for the filter:`, statuses);

        // Build status lookup map
        const statusMap = new Map<string, any>();
        for (const status of statuses) {
          statusMap.set(status.vehicleRecallId, status);
        }

        // 6. Merge recalls with user statuses
        let results = recalls.map((recall: any) => {
          const userStatus = statusMap.get(recall.id);

          return {
            // Recall fields from shared catalog
            id: userStatus?.id || null,         // status row ID (null if user hasn't acted)
            vehicleRecallId: recall.id,          // shared recall ID
            carId,
            source: recall.source,
            campaignNumber: recall.campaignNumber,
            manufacturer: recall.manufacturer,
            component: recall.component,
            systemType: recall.systemType,
            summary: recall.summary,
            consequence: recall.consequence,
            remedy: recall.remedy,
            recallNotes: recall.notes,
            reportReceivedDate: recall.reportReceivedDate,
            parkIt: recall.parkIt,
            parkOutside: recall.parkOutside,
            otaUpdate: recall.otaUpdate,
            createdAt: recall.createdAt,
            // User status fields (defaults for unacted recalls)
            status: userStatus?.status || RECALL_STATUS_USER.ACTIVE,
            dismissedAt: userStatus?.dismissedAt || null,
            resolvedAt: userStatus?.resolvedAt || null,
            userNotes: userStatus?.notes || null,
          };
        });

        this.logger.debug(`Merged recalls:`, results);

        // 7. Apply status filter if requested
        if (statusFilter) {
          const filterStatuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
          results = results.filter((r: any) => filterStatuses.includes(r.status));
        }



        // 8. Sort by report date descending
        results.sort((a: any, b: any) => {
          const dateA = a.reportReceivedDate ? new Date(a.reportReceivedDate).getTime() : 0;
          const dateB = b.reportReceivedDate ? new Date(b.reportReceivedDate).getTime() : 0;
          return dateB - dateA;
        });

        return this.success(results);
      },
      hasTransaction: false,
      doingWhat: 'listing vehicle recalls for car',
    });
  }

  /**
   * Get recall counts by status for dashboard badges.
   * Uses the same read-through approach: resolve car → find recalls → overlay statuses.
   */
  public async getRecallCounts(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { accountId } = this.getContext();
        const gateways = this.getGateways();
        const { carId } = args || {};

        // Get accessible car IDs
        let carIds: string[] = [];

        if (carId) {
          if (this.isDriverRole()) {
            const hasAccess = await this.hasAccessToCar(carId);
            if (!hasAccess) {
              return this.success({ active: 0, dismissed: 0, resolved: 0 });
            }
          }
          carIds = [carId];
        } else {
          // All cars for this account
          const accessibleCarIds = await this.filterAccessibleCarIds(null);
          const cars = await gateways.carGw.list({
            filter: { accountId, ...(accessibleCarIds ? { id: accessibleCarIds } : {}) },
            params: {
              pagination: {
                pageSize: 1000
              },
            }
          });
          carIds = cars.map((c: any) => c.id);
        }

        if (carIds.length === 0) {
          return this.success({ active: 0, dismissed: 0, resolved: 0 });
        }

        // For each car, resolve make/model/year and find matching recalls
        let totalActive = 0;
        let totalDismissed = 0;
        let totalResolved = 0;

        for (const cId of carIds) {
          const carList = await gateways.carGw.list({
            filter: { id: cId, accountId },
            params: {
              pagination: {
                pageSize: 1
              },
            }
          });

          const car = carList.length > 0 ? carList[0] : null;
          if (!car) continue;

          const makeName = await this.resolveCarMakeName(car);
          const model = (car.model || '').toUpperCase().trim();
          const modelYear = car.manufacturedIn;

          if (!makeName || !model || !modelYear) continue;

          // Find matching lookups
          const lookups = await gateways.vehicleRecallLookupGw.list({
            filter: { makeName, model, modelYear },
            params: {
              pagination: {
                pageSize: 100
              },
            }
          });

          if (lookups.length === 0) continue;

          const lookupIds = lookups.map((l: any) => l.id);

          // Count total active recalls from catalog
          const recalls = await gateways.vehicleRecallGw.list({
            filter: { lookupId: lookupIds, status: [RECALL_STATUS.ACTIVE] },
            params: {
              pagination: {
                pageSize: 1000
              },
            }
          });

          if (recalls.length === 0) continue;

          // Load user statuses for these recalls
          const recallIds = recalls.map((r: any) => r.id);

          const statuses = await gateways.vehicleRecallStatusGw.list({
            filter: { accountId, carId: cId, vehicleRecallId: recallIds },
            params: {
              pagination: {
                pageSize: recallIds.length
              },
            }
          });

          const statusMap = new Map<string, any>();
          for (const s of statuses) {
            statusMap.set(s.vehicleRecallId, s);
          }

          // Count by effective status
          for (const recall of recalls) {
            const userStatus = statusMap.get(recall.id);
            const effectiveStatus = userStatus?.status || RECALL_STATUS_USER.ACTIVE;

            if (effectiveStatus === RECALL_STATUS_USER.ACTIVE) {
              totalActive++;
            } else if (effectiveStatus === RECALL_STATUS_USER.DISMISSED) {
              totalDismissed++;
            } else if (effectiveStatus === RECALL_STATUS_USER.RESOLVED) {
              totalResolved++;
            }
          }
        }

        return this.success({ active: totalActive, dismissed: totalDismissed, resolved: totalResolved });
      },
      hasTransaction: false,
      doingWhat: 'getting vehicle recall counts',
    });
  }

  // ===========================================================================
  // PUBLIC — User-facing write operations
  // ===========================================================================

  /**
   * Update a vehicle recall status — creates the status row on first
   * interaction (upsert pattern). Only creates vehicle_recall_statuses
   * rows when a user actually takes action.
   *
   * Where input supports:
   *   - id: direct status row lookup (fastest, used for already-acted recalls)
   *   - vehicleRecallId + carId: always required for validation and upsert
   */
  public async updateRecallStatus(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { params, where } = args || {};
        const { id, vehicleRecallId, carId } = where || {};
        const { status, notes } = params || {};

        const { accountId, userId } = this.getContext();
        const gateways = this.getGateways();

        if (!vehicleRecallId || !carId) {
          return this.failure(OP_RESULT_CODES.FAILED, 'Recall ID and Car ID are required');
        }

        // Verify the recall exists in the shared catalog
        const recalls = await gateways.vehicleRecallGw.list({
          filter: { id: vehicleRecallId },
          params: {
            pagination: {
              pageSize: 1
            }
          },
        });

        if (recalls.length === 0) {
          this.logger.log(`No vehicle recall was found by ID ${vehicleRecallId}`);
          return this.failure(OP_RESULT_CODES.FAILED, 'Recall not found');
        }

        // Verify car access
        const cars = await gateways.carGw.list({
          filter: { id: carId, accountId },
          params: {
            pagination: {
              pageSize: 1
            }
          },
        });

        if (cars.length === 0) {
          this.logger.log(`No vehicle  was found by ID ${carId} for the account ${accountId}`);
          return this.failure(OP_RESULT_CODES.FAILED, 'Vehicle not found');
        }

        if (this.isDriverRole()) {
          const hasAccess = await this.hasAccessToCar(carId);
          if (!hasAccess) {
            this.logger.log(`User ${userId} has no access to the vehicle with ID ${carId} and the account ${accountId}`);
            return this.failure(OP_RESULT_CODES.FAILED, 'Access denied to this vehicle');
          }
        }

        // Try to find existing status row.
        // Use direct ID lookup when available (faster), fall back to composite key.
        let existing: any = null;

        if (id) {
          const byId = await gateways.vehicleRecallStatusGw.list({
            filter: { id, accountId },
            params: {
              pagination: {
                pageSize: 1
              }
            },
          });
          existing = byId.length > 0 ? byId[0] : null;

          this.logger.log(`Lookup of user vehicle recall status by ID ${id} and the account ${accountId}`);
        }

        if (!existing) {
          const byComposite = await gateways.vehicleRecallStatusGw.list({
            filter: { accountId, carId, vehicleRecallId },
            params: {
              pagination: {
                pageSize: 1
              }
            },
          });
          existing = byComposite.length > 0 ? byComposite[0] : null;

          this.logger.log(`Lookup of user vehicle recall status by car ID ${carId}, account ${accountId} and vehicle recall ID ${vehicleRecallId}:`, existing);
        }

        const now = this.now();
        let result;

        if (existing) {
          // Update existing status row
          const updateData: Record<string, any> = {};

          if (status != null) {
            updateData.status = status;

            if (status === RECALL_STATUS_USER.DISMISSED) {
              updateData.dismissedAt = now;
              updateData.resolvedAt = null;
            } else if (status === RECALL_STATUS_USER.RESOLVED) {
              updateData.resolvedAt = now;
              updateData.dismissedAt = null;
            } else if (status === RECALL_STATUS_USER.ACTIVE) {
              updateData.dismissedAt = null;
              updateData.resolvedAt = null;
            }
          }

          if (notes !== undefined) {
            updateData.notes = notes;
          }

          if (Object.keys(updateData).length === 0) {
            return this.failure(OP_RESULT_CODES.FAILED, 'No changes provided');
          }

          this.logger.log(`Updating user vehicle recall status ${existing.id}:`, updateData);

          result = await gateways.vehicleRecallStatusGw.update(
            { id: existing.id, accountId },
            updateData
          );
        } else {
          // Create on first interaction
          const createData: Record<string, any> = {
            accountId,
            carId,
            vehicleRecallId,
            status: status || RECALL_STATUS_USER.ACTIVE,
            dismissedAt: null,
            resolvedAt: null,
            notes: notes || null,
          };

          if (status === RECALL_STATUS_USER.DISMISSED) {
            createData.dismissedAt = now;
          } else if (status === RECALL_STATUS_USER.RESOLVED) {
            createData.resolvedAt = now;
          }

          this.logger.log(`Creating user vehicle recall status for car ID ${carId}, account ${accountId} and vehicle recall ID ${vehicleRecallId}`, createData);

          result = await gateways.vehicleRecallStatusGw.create(createData);
        }



        let vehicleRecallStatus = result[0];

        if (vehicleRecallStatus) {
          const vehicleRecall = await gateways.vehicleRecallGw.get(vehicleRecallStatus.vehicleRecallId);

          if (vehicleRecall) {
            vehicleRecallStatus = {
              ...removeSystemFields(omit(vehicleRecall, ['id', 'status'])),
              ...vehicleRecallStatus
            };
          }
        }

        this.logger.log(`Created/updated user vehicle recall status is:`, vehicleRecallStatus);

        return this.success([vehicleRecallStatus]);
      },
      hasTransaction: true,
      doingWhat: 'updating vehicle recall status',
    });
  }

  // ===========================================================================
  // PUBLIC — Force-refresh for a specific car (user-triggered)
  // ===========================================================================

  /**
   * Force-refresh recalls for a specific car. Resets the lookup's
   * next_fetch_after to now so that the next fetchStaleRecalls run picks it up.
   */
  public async requestRefreshForCar(args: any) {
    return this.runAction({
      args,
      doAuth: true,
      action: async (args: any, opt: BaseCoreActionsInterface) => {
        const { accountId } = this.getContext();
        const gateways = this.getGateways();
        const { carId } = args || {};

        // Load the car
        const cars = await gateways.carGw.list({
          filter: { id: carId, accountId },
          params: {
            pagination: {
              pageSize: 1
            }
          },
        });

        const car = cars.length > 0 ? cars[0] : null;

        if (!car) {
          this.logger.log(`Failed to request vehicle recalls for car ID ${carId} and account ${accountId}: Car was not found`);
          return this.failure(OP_RESULT_CODES.FAILED, 'Vehicle not found');
        }

        if (this.isDriverRole()) {
          const hasAccess = await this.hasAccessToCar(carId);
          if (!hasAccess) {
            this.logger.log(`Failed to request vehicle recalls for car ID ${carId} and account ${accountId}: User has not access rights to the car`);
            return this.failure(OP_RESULT_CODES.FAILED, 'Access denied to this vehicle');
          }
        }

        const makeName = await this.resolveCarMakeName(car);
        const model = (car.model || '').toUpperCase().trim();
        const manufacturedIn = car.manufacturedIn;

        if (!makeName || !model || !manufacturedIn) {
          this.logger.log(`Failed to request vehicle recalls for car ID ${carId} and account ${accountId}: no make or model or year:`, { makeName, model, manufacturedIn });
          return this.failure(OP_RESULT_CODES.FAILED, 'Vehicle is missing make, model, or year data');
        }

        // Find matching lookups and reset their next_fetch_after
        const lookups = await gateways.vehicleRecallLookupGw.list({
          filter: { makeName, model, modelYear: manufacturedIn },
          params: {
            pagination: {
              pageSize: 10
            }
          },
        });

        this.logger.debug(`Found recall lookups for ${makeName} ${model} ${manufacturedIn}:`, lookups);

        const now = this.now();
        let updatedCount = 0;

        for (const lookup of lookups) {
          await gateways.vehicleRecallLookupGw.update(
            { id: lookup.id },
            {
              nextFetchAfter: now.toISOString(),
              status: LOOKUP_STATUS.PENDING,
            }
          );
          updatedCount++;
        }

        // If no lookups exist yet, create them
        if (lookups.length === 0) {
          const sources = [RECALL_SOURCES.NHTSA, RECALL_SOURCES.TC];
          for (const source of sources) {
            await gateways.vehicleRecallLookupGw.create({
              makeName,
              model,
              modelYear: manufacturedIn,
              source,
              countryCode: SOURCE_COUNTRY[source] || 'US',
              fetchedAt: null,
              nextFetchAfter: null,
              resultsCount: 0,
              fetchError: null,
              status: LOOKUP_STATUS.PENDING,
            });
            updatedCount++;
          }
        }

        this.logger.debug(`Requesting recall refresh for ${makeName} ${model} ${manufacturedIn}, restult:`, { queued: updatedCount });

        return this.success({ queued: updatedCount });
      },
      hasTransaction: true,
      doingWhat: 'requesting recall refresh for a vehicle',
    });
  }

  // ===========================================================================
  // PRIVATE — Core processing logic (CLI/scheduler only)
  // ===========================================================================

  /**
   * Process one source's fetch result for a lookup row:
   * 1. Upsert recall records into vehicle_recalls
   * 2. Update the lookup row with fetch metadata
   *
   * No linking step — recalls are read-through at query time.
   */
  private async processSourceResult(
    lookup: any,
    fetchResult: RecallFetchResult,
    now: Date
  ): Promise<void> {
    const gateways = this.getGateways();

    if (fetchResult.error) {
      await gateways.vehicleRecallLookupGw.update(
        { id: lookup.id },
        {
          status: LOOKUP_STATUS.BLOCKED,
          fetchError: fetchResult.error,
          nextFetchAfter: new Date(now.getTime() + ERROR_RETRY_MS).toISOString(),
        }
      );
      return;
    }

    // 1. Upsert recall records
    await this.upsertRecalls(lookup.id, fetchResult.source, fetchResult.recalls);

    // 2. Mark stale recalls as removed
    await this.markStaleRecalls(lookup.id, fetchResult.source, fetchResult.recalls);

    // 3. Update the lookup row
    await gateways.vehicleRecallLookupGw.update(
      { id: lookup.id },
      {
        status: LOOKUP_STATUS.ACTIVE,
        fetchedAt: fetchResult.fetchedAt.toISOString(),
        nextFetchAfter: new Date(fetchResult.fetchedAt.getTime() + CACHE_TTL_MS).toISOString(),
        resultsCount: fetchResult.recalls.length,
        fetchError: null,
      }
    );
  }

  private async upsertRecalls(
    lookupId: string,
    source: string,
    recalls: NormalizedRecall[]
  ): Promise<void> {
    const gateways = this.getGateways();

    if (recalls.length === 0) {
      return;
    }

    // Check by campaignNumber + source globally (matches the unique constraint)
    const campaignNumbers = recalls.map((r) => r.campaignNumber);

    const existingRecalls = await gateways.vehicleRecallGw.list({
      filter: { campaignNumber: campaignNumbers, source },
      params: {
        pagination: {
          pageSize: campaignNumbers.length
        }
      }
    });

    const existingByCampaign = new Map<string, any>();
    for (const existing of existingRecalls) {
      existingByCampaign.set(existing.campaignNumber, existing);
    }

    for (const recall of recalls) {
      const existing = existingByCampaign.get(recall.campaignNumber);

      const recallData = {
        manufacturer: recall.manufacturer,
        component: recall.component,
        systemType: recall.systemType,
        summary: recall.summary,
        consequence: recall.consequence,
        remedy: recall.remedy,
        notes: recall.notes,
        reportReceivedDate: recall.reportReceivedDate,
        parkIt: recall.parkIt,
        parkOutside: recall.parkOutside,
        otaUpdate: recall.otaUpdate,
        status: RECALL_STATUS.ACTIVE,
      };

      if (existing) {
        await gateways.vehicleRecallGw.update(
          { id: existing.id },
          recallData
        );
      } else {
        await gateways.vehicleRecallGw.create({
          lookupId,
          source,
          campaignNumber: recall.campaignNumber,
          ...recallData,
        });
      }
    }
  }

  /**
 * Mark recalls that were previously fetched for this lookup but are no
 * longer returned by the API. Only marks a recall as Removed if no other
 * active lookup still references it (i.e., the recall's lookupId points
 * to this lookup). Recalls shared across multiple lookups are left alone
 * since another make/model/year combo may still return them.
 */
  private async markStaleRecalls(
    lookupId: string,
    source: string,
    freshRecalls: NormalizedRecall[]
  ): Promise<void> {
    const gateways = this.getGateways();

    // Only consider recalls whose lookupId is THIS lookup —
    // shared recalls (created by a different lookup) are not ours to manage
    const existingRecalls = await gateways.vehicleRecallGw.list({
      filter: { lookupId, source, status: [RECALL_STATUS.ACTIVE] },
      params: {
        pagination: {
          pageSize: 1000
        }
      },
    });

    if (existingRecalls.length === 0) {
      return;
    }

    const freshCampaigns = new Set(freshRecalls.map((r) => r.campaignNumber));

    for (const existing of existingRecalls) {
      if (freshCampaigns.has(existing.campaignNumber)) {
        continue;
      }

      // This recall was created by this lookup and is no longer in the
      // fresh results. Check if any OTHER active lookup also produced a
      // recall with the same campaign number — if so, leave it alone.
      const otherRecalls = await gateways.vehicleRecallGw.list({
        filter: {
          campaignNumber: existing.campaignNumber,
          source,
          status: [RECALL_STATUS.ACTIVE],
        },
        params: {
          pagination: {
            pageSize: 10
          },
        }
      });

      const ownedOnlyByThisLookup = otherRecalls.every(
        (r: any) => r.lookupId === lookupId
      );

      if (ownedOnlyByThisLookup) {
        await gateways.vehicleRecallGw.update(
          { id: existing.id },
          { status: RECALL_STATUS.REMOVED }
        );
      }
    }
  }

  // ===========================================================================
  // PRIVATE — Helpers
  // ===========================================================================

  private async resolveCarMakeName(car: any): Promise<string | null> {
    if (!car?.makeId) {
      return null;
    }

    const gateways = this.getGateways();

    const makes = await gateways.vehicleMakeGw.list({
      filter: { id: car.makeId },
      params: {
        pagination: {
          pageSize: 1
        },
      }
    });

    if (makes.length === 0) {
      return null;
    }

    return (makes[0].makeName || '').toUpperCase().trim() || null;
  }
}

export { VehicleRecallCore };