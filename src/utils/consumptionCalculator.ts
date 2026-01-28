// ./src/utils/consumptionCalculator.ts
// Fuel consumption calculation utility for accurate consumption tracking
// Supports multiple tanks, electric vehicles, and various data quality scenarios

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Raw data point from database (expense_bases + refuels join)
 */
export interface ConsumptionDataPoint {
  recordId: string;
  carId: string;
  odometerKm: number;
  whenDone: Date;
  expenseType: number; // 1=Refuel, 2=Expense, 3=Checkpoint, etc.
  fuelInTank: number | null; // 0-1 percentage from expense_bases
  // Refuel-specific fields (null for non-refuels)
  refuelVolumeLiters: number | null;
  isFullTank: boolean | null;
  tankType: 'main' | 'addl' | null;
}

/**
 * Car tank configuration
 */
export interface CarTankConfig {
  carId: string;
  mainTankVolumeLiters: number | null;
  mainTankFuelType: string | null;
  addlTankVolumeLiters: number | null;
  addlTankFuelType: string | null;
}

/**
 * Processed data point with calculated tank level
 */
interface ProcessedDataPoint {
  recordId: string;
  odometerKm: number;
  whenDone: Date;
  tankLevelLiters: number | null; // Calculated from percentage or full tank
  tankLevelSource: 'full-tank' | 'percentage' | 'unknown';
  isRefuel: boolean;
  refuelVolumeLiters: number;
}

/**
 * Consumption calculation result for a single fuel type
 */
export interface FuelTypeConsumption {
  fuelType: string;

  // Consumption metrics (in metric units - liters and km)
  fuelConsumedLiters: number; // or kWh for electric
  distanceKm: number;
  consumptionPer100Km: number | null; // L/100km or kWh/100km

  // Data quality
  confidence: 'high' | 'medium' | 'low';
  confidenceReasons: string[];

  // Statistics
  vehiclesCount: number;
  refuelsCount: number;
  dataPointsCount: number;
  usableSegmentsCount: number;

  // For detailed debugging/display
  excludedSegments: Array<{
    reason: string;
    distanceKm: number;
  }>;
}

/**
 * Parameters for consumption calculation
 */
export interface CalculateConsumptionParams {
  dataPoints: ConsumptionDataPoint[];
  carConfigs: CarTankConfig[];
  minDistanceKm?: number; // Default: 10km
}

/**
 * Result of consumption calculation
 */
export interface ConsumptionCalculationResult {
  byFuelType: FuelTypeConsumption[];
  totalDistanceKm: number;
  totalVehiclesCount: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MIN_DISTANCE_KM = 10;
const MIN_CONFIDENCE_DISTANCE_KM = 100;

// Realistic consumption bounds for validation (L/100km equivalent)
const MIN_REALISTIC_CONSUMPTION = 1; // 1 L/100km (hypermiler/electric)
const MAX_REALISTIC_CONSUMPTION = 50; // 50 L/100km (large trucks, towing)

// Electric vehicles use different units
const ELECTRIC_FUEL_TYPES = new Set(['electric']);
const HYDROGEN_FUEL_TYPES = new Set(['hydrogen']);

// =============================================================================
// Main Calculation Function
// =============================================================================

/**
 * Calculate fuel consumption from data points
 * Groups by fuel type and calculates consumption with confidence levels
 */
export function calculateConsumptionFromData(
  params: CalculateConsumptionParams
): ConsumptionCalculationResult {
  const { dataPoints, carConfigs, minDistanceKm = DEFAULT_MIN_DISTANCE_KM } = params;

  if (dataPoints.length === 0 || carConfigs.length === 0) {
    return {
      byFuelType: [],
      totalDistanceKm: 0,
      totalVehiclesCount: 0,
    };
  }

  // Create lookup map for car configs
  const carConfigMap = new Map<string, CarTankConfig>();
  for (const config of carConfigs) {
    carConfigMap.set(config.carId, config);
  }

  // Group data points by car and tank type
  const groupedData = groupDataByCarAndTank(dataPoints);

  // Calculate consumption for each car/tank combination
  const segmentResults: Array<{
    carId: string;
    fuelType: string;
    tankType: 'main' | 'addl';
    fuelConsumed: number;
    distance: number;
    confidence: 'high' | 'medium' | 'low';
    confidenceReasons: string[];
    refuelsCount: number;
    dataPointsCount: number;
    excluded: Array<{ reason: string; distanceKm: number }>;
  }> = [];

  for (const [groupKey, points] of groupedData.entries()) {
    const [carId, tankType] = groupKey.split('|') as [string, 'main' | 'addl'];
    const carConfig = carConfigMap.get(carId);

    if (!carConfig) {
      continue;
    }

    // Get tank volume and fuel type for this tank
    const tankVolume = tankType === 'main'
      ? carConfig.mainTankVolumeLiters
      : carConfig.addlTankVolumeLiters;
    const fuelType = tankType === 'main'
      ? carConfig.mainTankFuelType
      : carConfig.addlTankFuelType;

    if (!tankVolume || tankVolume <= 0 || !fuelType) {
      continue;
    }

    // Calculate consumption for this car/tank
    const result = calculateSegmentConsumption(points, tankVolume, minDistanceKm);

    if (result) {
      segmentResults.push({
        carId,
        fuelType,
        tankType,
        ...result,
      });
    }
  }

  // Aggregate by fuel type
  const byFuelType = aggregateByFuelType(segmentResults);

  // Calculate totals
  const totalDistanceKm = byFuelType.reduce((sum, ft) => sum + ft.distanceKm, 0);
  const uniqueVehicles = new Set(segmentResults.map(r => r.carId));

  return {
    byFuelType,
    totalDistanceKm,
    totalVehiclesCount: uniqueVehicles.size,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Group data points by car ID and tank type
 */
function groupDataByCarAndTank(
  dataPoints: ConsumptionDataPoint[]
): Map<string, ConsumptionDataPoint[]> {
  const grouped = new Map<string, ConsumptionDataPoint[]>();

  for (const point of dataPoints) {
    // Determine tank type: use from refuel, or 'main' for non-refuels
    const tankType = point.tankType || 'main';
    const key = `${point.carId}|${tankType}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(point);
  }

  // Sort each group by odometer
  for (const points of grouped.values()) {
    points.sort((a, b) => a.odometerKm - b.odometerKm);
  }

  return grouped;
}

/**
 * Calculate consumption for a single car/tank segment
 */
function calculateSegmentConsumption(
  points: ConsumptionDataPoint[],
  tankVolumeLiters: number,
  minDistanceKm: number
): {
  fuelConsumed: number;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceReasons: string[];
  refuelsCount: number;
  dataPointsCount: number;
  excluded: Array<{ reason: string; distanceKm: number }>;
} | null {
  if (points.length < 2) {
    return null;
  }

  // Process points to calculate tank levels
  const processed = processDataPoints(points, tankVolumeLiters);

  // Find valid start and end points (where we know tank state)
  const startIdx = findFirstKnownTankState(processed);
  const endIdx = findLastKnownTankState(processed);

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    // No valid segment with known tank states
    // Fall back to approximation method
    return calculateApproximation(points, minDistanceKm);
  }

  const startPoint = processed[startIdx];
  const endPoint = processed[endIdx];

  const distance = endPoint.odometerKm - startPoint.odometerKm;

  // Check minimum distance
  if (distance < minDistanceKm) {
    return {
      fuelConsumed: 0,
      distance: 0,
      confidence: 'low',
      confidenceReasons: ['distance-too-short'],
      refuelsCount: points.filter(p => p.expenseType === 1).length,
      dataPointsCount: points.length,
      excluded: [{ reason: 'distance-too-short', distanceKm: distance }],
    };
  }

  // Sum refuels between start (exclusive) and end (inclusive)
  let refuelsBetween = 0;
  let refuelsCount = 0;
  for (let i = startIdx + 1; i <= endIdx; i++) {
    if (processed[i].isRefuel && processed[i].refuelVolumeLiters > 0) {
      refuelsBetween += processed[i].refuelVolumeLiters;
      refuelsCount++;
    }
  }

  // Calculate fuel consumed
  // Formula: StartTank + RefuelsBetween - EndTank = FuelConsumed
  const startTank = startPoint.tankLevelLiters!;
  const endTank = endPoint.tankLevelLiters!;
  const fuelConsumed = startTank + refuelsBetween - endTank;

  // Determine confidence
  const { confidence, reasons } = determineConfidence(
    startPoint,
    endPoint,
    distance,
    fuelConsumed,
    tankVolumeLiters
  );

  // Validate result
  if (fuelConsumed < 0) {
    return {
      fuelConsumed: 0,
      distance: 0,
      confidence: 'low',
      confidenceReasons: ['negative-consumption', ...reasons],
      refuelsCount,
      dataPointsCount: points.length,
      excluded: [{ reason: 'negative-consumption', distanceKm: distance }],
    };
  }

  return {
    fuelConsumed,
    distance,
    confidence,
    confidenceReasons: reasons,
    refuelsCount,
    dataPointsCount: points.length,
    excluded: [],
  };
}

/**
 * Process raw data points to calculate tank levels
 */
function processDataPoints(
  points: ConsumptionDataPoint[],
  tankVolumeLiters: number
): ProcessedDataPoint[] {
  return points.map(point => {
    let tankLevelLiters: number | null = null;
    let tankLevelSource: 'full-tank' | 'percentage' | 'unknown' = 'unknown';

    // Priority 1: Full tank indicator (for refuels)
    if (point.isFullTank === true) {
      tankLevelLiters = tankVolumeLiters;
      tankLevelSource = 'full-tank';
    }
    // Priority 2: Percentage from fuel_in_tank
    else if (point.fuelInTank !== null && point.fuelInTank >= 0 && point.fuelInTank <= 1) {
      tankLevelLiters = point.fuelInTank * tankVolumeLiters;
      tankLevelSource = 'percentage';
    }

    return {
      recordId: point.recordId,
      odometerKm: point.odometerKm,
      whenDone: point.whenDone,
      tankLevelLiters,
      tankLevelSource,
      isRefuel: point.expenseType === 1,
      refuelVolumeLiters: point.refuelVolumeLiters || 0,
    };
  });
}

/**
 * Find first data point with known tank state
 */
function findFirstKnownTankState(points: ProcessedDataPoint[]): number {
  for (let i = 0; i < points.length; i++) {
    if (points[i].tankLevelLiters !== null) {
      return i;
    }
  }
  return -1;
}

/**
 * Find last data point with known tank state
 */
function findLastKnownTankState(points: ProcessedDataPoint[]): number {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].tankLevelLiters !== null) {
      return i;
    }
  }
  return -1;
}

/**
 * Determine confidence level based on data quality
 */
function determineConfidence(
  startPoint: ProcessedDataPoint,
  endPoint: ProcessedDataPoint,
  distanceKm: number,
  fuelConsumed: number,
  tankVolumeLiters: number
): { confidence: 'high' | 'medium' | 'low'; reasons: string[] } {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'high';

  // Check tank level sources
  const bothFullTank = startPoint.tankLevelSource === 'full-tank' &&
    endPoint.tankLevelSource === 'full-tank';
  const bothKnown = startPoint.tankLevelLiters !== null &&
    endPoint.tankLevelLiters !== null;

  if (bothFullTank) {
    reasons.push('full-to-full');
  } else if (bothKnown) {
    reasons.push('tank-percentage');
    if (startPoint.tankLevelSource !== 'full-tank' || endPoint.tankLevelSource !== 'full-tank') {
      confidence = 'medium';
    }
  }

  // Check if using non-refuel records
  if (!startPoint.isRefuel || !endPoint.isRefuel) {
    reasons.push('mixed-sources');
    if (confidence === 'high') {
      confidence = 'medium';
    }
  }

  // Check distance threshold
  if (distanceKm < MIN_CONFIDENCE_DISTANCE_KM) {
    reasons.push('short-distance');
    if (confidence === 'high') {
      confidence = 'medium';
    }
  }

  // Validate consumption is realistic
  if (distanceKm > 0) {
    const consumptionPer100 = (fuelConsumed / distanceKm) * 100;
    if (consumptionPer100 < MIN_REALISTIC_CONSUMPTION ||
      consumptionPer100 > MAX_REALISTIC_CONSUMPTION) {
      reasons.push('consumption-outlier');
      confidence = 'low';
    }
  }

  return { confidence, reasons };
}

/**
 * Fallback approximation when no known tank states
 * Uses sum of refuels (excluding first) divided by total distance
 */
function calculateApproximation(
  points: ConsumptionDataPoint[],
  minDistanceKm: number
): {
  fuelConsumed: number;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceReasons: string[];
  refuelsCount: number;
  dataPointsCount: number;
  excluded: Array<{ reason: string; distanceKm: number }>;
} | null {
  // Get refuels only, sorted by odometer
  const refuels = points
    .filter(p => p.expenseType === 1 && p.refuelVolumeLiters && p.refuelVolumeLiters > 0)
    .sort((a, b) => a.odometerKm - b.odometerKm);

  if (refuels.length < 2) {
    return null;
  }

  const firstRefuel = refuels[0];
  const lastRefuel = refuels[refuels.length - 1];
  const distance = lastRefuel.odometerKm - firstRefuel.odometerKm;

  if (distance < minDistanceKm) {
    return {
      fuelConsumed: 0,
      distance: 0,
      confidence: 'low',
      confidenceReasons: ['approximation', 'distance-too-short'],
      refuelsCount: refuels.length,
      dataPointsCount: points.length,
      excluded: [{ reason: 'distance-too-short', distanceKm: distance }],
    };
  }

  // Sum all refuels except the first one
  let fuelConsumed = 0;
  for (let i = 1; i < refuels.length; i++) {
    fuelConsumed += refuels[i].refuelVolumeLiters!;
  }

  return {
    fuelConsumed,
    distance,
    confidence: 'low',
    confidenceReasons: ['approximation'],
    refuelsCount: refuels.length,
    dataPointsCount: points.length,
    excluded: [],
  };
}

/**
 * Aggregate segment results by fuel type
 */
function aggregateByFuelType(
  segments: Array<{
    carId: string;
    fuelType: string;
    tankType: 'main' | 'addl';
    fuelConsumed: number;
    distance: number;
    confidence: 'high' | 'medium' | 'low';
    confidenceReasons: string[];
    refuelsCount: number;
    dataPointsCount: number;
    excluded: Array<{ reason: string; distanceKm: number }>;
  }>
): FuelTypeConsumption[] {
  const byFuelType = new Map<string, {
    fuelConsumed: number;
    distance: number;
    vehicles: Set<string>;
    refuelsCount: number;
    dataPointsCount: number;
    usableSegmentsCount: number;
    confidenceLevels: ('high' | 'medium' | 'low')[];
    allReasons: Set<string>;
    excluded: Array<{ reason: string; distanceKm: number }>;
  }>();

  for (const segment of segments) {
    if (!byFuelType.has(segment.fuelType)) {
      byFuelType.set(segment.fuelType, {
        fuelConsumed: 0,
        distance: 0,
        vehicles: new Set(),
        refuelsCount: 0,
        dataPointsCount: 0,
        usableSegmentsCount: 0,
        confidenceLevels: [],
        allReasons: new Set(),
        excluded: [],
      });
    }

    const agg = byFuelType.get(segment.fuelType)!;
    agg.fuelConsumed += segment.fuelConsumed;
    agg.distance += segment.distance;
    agg.vehicles.add(segment.carId);
    agg.refuelsCount += segment.refuelsCount;
    agg.dataPointsCount += segment.dataPointsCount;
    agg.confidenceLevels.push(segment.confidence);
    agg.excluded.push(...segment.excluded);

    if (segment.distance > 0) {
      agg.usableSegmentsCount++;
    }

    for (const reason of segment.confidenceReasons) {
      agg.allReasons.add(reason);
    }
  }

  // Convert to array
  const results: FuelTypeConsumption[] = [];

  for (const [fuelType, agg] of byFuelType.entries()) {
    // Determine overall confidence (worst of all segments)
    let overallConfidence: 'high' | 'medium' | 'low' = 'high';
    if (agg.confidenceLevels.includes('low')) {
      overallConfidence = 'low';
    } else if (agg.confidenceLevels.includes('medium')) {
      overallConfidence = 'medium';
    }

    // Calculate consumption per 100km
    const consumptionPer100Km = agg.distance > 0
      ? (agg.fuelConsumed / agg.distance) * 100
      : null;

    results.push({
      fuelType,
      fuelConsumedLiters: agg.fuelConsumed,
      distanceKm: agg.distance,
      consumptionPer100Km,
      confidence: overallConfidence,
      confidenceReasons: Array.from(agg.allReasons),
      vehiclesCount: agg.vehicles.size,
      refuelsCount: agg.refuelsCount,
      dataPointsCount: agg.dataPointsCount,
      usableSegmentsCount: agg.usableSegmentsCount,
      excludedSegments: agg.excluded,
    });
  }

  return results;
}

// =============================================================================
// Utility Functions for Unit Conversion
// =============================================================================

/**
 * Check if fuel type uses electricity (kWh)
 */
export function isElectricFuelType(fuelType: string): boolean {
  return ELECTRIC_FUEL_TYPES.has(fuelType);
}

/**
 * Check if fuel type is hydrogen (kg)
 */
export function isHydrogenFuelType(fuelType: string): boolean {
  return HYDROGEN_FUEL_TYPES.has(fuelType);
}

/**
 * Get the appropriate volume unit label for a fuel type
 */
export function getFuelVolumeUnitLabel(fuelType: string, volumeUnit: string): string {
  if (isElectricFuelType(fuelType)) {
    return 'kWh';
  }
  if (isHydrogenFuelType(fuelType)) {
    return 'kg';
  }
  return volumeUnit; // l, gal-us, gal-uk
}

/**
 * Get the appropriate consumption unit label for a fuel type
 */
export function getConsumptionUnitLabel(fuelType: string, consumptionUnit: string): string {
  if (isElectricFuelType(fuelType)) {
    // Convert standard units to electric equivalents
    switch (consumptionUnit) {
      case 'l100km':
        return 'kWh/100km';
      case 'mpg-us':
      case 'mpg-uk':
        return 'mi/kWh';
      default:
        return 'kWh/100km';
    }
  }
  if (isHydrogenFuelType(fuelType)) {
    switch (consumptionUnit) {
      case 'l100km':
        return 'kg/100km';
      case 'mpg-us':
      case 'mpg-uk':
        return 'mi/kg';
      default:
        return 'kg/100km';
    }
  }
  return consumptionUnit;
}