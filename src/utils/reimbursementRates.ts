// ./src/utils/reimbursementRates.ts
// Reimbursement rate utility for IRS and CRA mileage deductions
// Supports both flat rates (IRS style) and tiered rates (CRA style)

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Rate tier for distance-based calculations (CRA style)
 * When tierUpToDistance is null, rate applies to all remaining distance
 */
export interface RateTier {
  tierUpToDistance: number | null;  // null means "and above" (no upper limit)
  rate: number;
}

/**
 * Reimbursement rate configuration for a travel type
 */
export interface ReimbursementRateConfig {
  travelType: string;
  currency: string;
  distanceUnit: 'km' | 'mi';
  tiers: RateTier[];               // Ordered from first tier to last
  notes?: string;                  // Additional info (e.g., "charity rate is optional")
}

/**
 * Country-specific rates for a given year
 */
export interface CountryYearRates {
  country: 'US' | 'CA';
  year: number;
  rates: ReimbursementRateConfig[];
  source?: string;                 // URL or reference to official source
}

/**
 * Result of reimbursement calculation
 */
export interface ReimbursementCalculationResult {
  distance: number;
  distanceUnit: string;
  totalReimbursement: number;
  currency: string;
  breakdown: Array<{
    tierIndex: number;
    distanceInTier: number;
    rate: number;
    amount: number;
  }>;
}

// =============================================================================
// Hardcoded Rate Data
// =============================================================================

/**
 * IRS Standard Mileage Rates (United States)
 * Source: https://www.irs.gov/tax-professionals/standard-mileage-rates
 * 
 * TODO: Future implementation:
 * - Store rates in database table (e.g., reimbursement_rates)
 * - Add admin UI to manage rates
 * - Support regional variations if needed
 * - Add effective date ranges for mid-year changes
 */
const US_RATES: CountryYearRates[] = [
  {
    country: 'US',
    year: 2023,
    source: 'https://www.irs.gov/tax-professionals/standard-mileage-rates',
    rates: [
      {
        travelType: 'business',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.655 }],  // $0.655 per mile
      },
      {
        travelType: 'medical',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.22 }],  // $0.22 per mile
      },
      {
        travelType: 'charity',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.14 }],  // $0.14 per mile (set by statute)
        notes: 'Charity rate is set by statute and rarely changes',
      },
      // Personal and commute are NOT deductible under IRS
    ],
  },
  {
    country: 'US',
    year: 2024,
    source: 'https://www.irs.gov/tax-professionals/standard-mileage-rates',
    rates: [
      {
        travelType: 'business',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.67 }],  // $0.67 per mile
      },
      {
        travelType: 'medical',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.21 }],  // $0.21 per mile
      },
      {
        travelType: 'charity',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.14 }],  // $0.14 per mile (set by statute)
        notes: 'Charity rate is set by statute and rarely changes',
      },
      // Personal and commute are NOT deductible under IRS
    ],
  },
  {
    country: 'US',
    year: 2025,
    source: 'https://www.irs.gov/tax-professionals/standard-mileage-rates',
    rates: [
      {
        travelType: 'business',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.70 }],  // $0.70 per mile
      },
      {
        travelType: 'medical',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.21 }],  // $0.21 per mile
      },
      {
        travelType: 'charity',
        currency: 'USD',
        distanceUnit: 'mi',
        tiers: [{ tierUpToDistance: null, rate: 0.14 }],  // $0.14 per mile
      },
    ],
  },
];

/**
 * CRA Automobile Allowance Rates (Canada)
 * Source: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/benefits-allowances/automobile/automobile-motor-vehicle-allowances/automobile-allowance-rates.html
 * 
 * CRA uses tiered rates:
 * - Higher rate for first 5,000 km
 * - Lower rate for kilometers after 5,000
 * - Additional 4¢/km for Yukon, NWT, and Nunavut (not implemented yet)
 * 
 * TODO: Future implementation:
 * - Add territory/province-specific rates
 * - Support employer vs self-employed distinctions
 */
const CA_RATES: CountryYearRates[] = [
  {
    country: 'CA',
    year: 2024,
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/benefits-allowances/automobile/automobile-motor-vehicle-allowances/automobile-allowance-rates.html',
    rates: [
      {
        travelType: 'business',
        currency: 'CAD',
        distanceUnit: 'km',
        tiers: [
          { tierUpToDistance: 5000, rate: 0.70 },   // $0.70/km for first 5,000 km
          { tierUpToDistance: null, rate: 0.64 },   // $0.64/km after 5,000 km
        ],
      },
      {
        travelType: 'medical',
        currency: 'CAD',
        distanceUnit: 'km',
        tiers: [
          { tierUpToDistance: 5000, rate: 0.70 },
          { tierUpToDistance: null, rate: 0.64 },
        ],
      },
      // Charity travel in Canada follows same rules as business
      {
        travelType: 'charity',
        currency: 'CAD',
        distanceUnit: 'km',
        tiers: [
          { tierUpToDistance: 5000, rate: 0.70 },
          { tierUpToDistance: null, rate: 0.64 },
        ],
        notes: 'Volunteer travel for registered charities',
      },
    ],
  },
  {
    country: 'CA',
    year: 2025,
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/benefits-allowances/automobile/automobile-motor-vehicle-allowances/automobile-allowance-rates.html',
    rates: [
      {
        travelType: 'business',
        currency: 'CAD',
        distanceUnit: 'km',
        tiers: [
          { tierUpToDistance: 5000, rate: 0.72 },   // $0.72/km for first 5,000 km
          { tierUpToDistance: null, rate: 0.66 },   // $0.66/km after 5,000 km
        ],
      },
      {
        travelType: 'medical',
        currency: 'CAD',
        distanceUnit: 'km',
        tiers: [
          { tierUpToDistance: 5000, rate: 0.72 },
          { tierUpToDistance: null, rate: 0.66 },
        ],
      },
      {
        travelType: 'charity',
        currency: 'CAD',
        distanceUnit: 'km',
        tiers: [
          { tierUpToDistance: 5000, rate: 0.72 },
          { tierUpToDistance: null, rate: 0.66 },
        ],
      },
    ],
  },
];

// =============================================================================
// Rate Lookup Functions
// =============================================================================

/**
 * Get all rates for a specific country and year
 * Falls back to most recent year if requested year not found
 * 
 * @param year Tax year
 * @param country Country code: 'US' or 'CA'
 * @returns Country year rates or null if country not supported
 */
export function getReimbursementRates(
  year: number,
  country: 'US' | 'CA',
): CountryYearRates | null {
  const ratesCollection = country === 'US' ? US_RATES : CA_RATES;

  // Try exact year match
  let rates = ratesCollection.find(r => r.year === year);

  // Fallback to most recent year if not found
  if (!rates) {
    const sortedRates = [...ratesCollection].sort((a, b) => b.year - a.year);
    rates = sortedRates[0];
  }

  return rates || null;
}

/**
 * Get rate configuration for a specific travel type
 * 
 * @param year Tax year
 * @param country Country code: 'US' or 'CA'
 * @param travelType Travel type: 'business', 'medical', 'charity', etc.
 * @returns Rate configuration or null if not found/not deductible
 */
export function getRateForTravelType(
  year: number,
  country: 'US' | 'CA',
  travelType: string,
): ReimbursementRateConfig | null {
  const countryRates = getReimbursementRates(year, country);

  if (!countryRates) {
    return null;
  }

  return countryRates.rates.find(r => r.travelType === travelType) || null;
}

/**
 * Check if a travel type is eligible for deduction in a country
 * Personal and commute travel are generally not deductible
 * 
 * @param travelType Travel type to check
 * @param country Country code
 * @returns True if travel type is deductible
 */
export function isDeductibleTravelType(
  travelType: string,
  country: 'US' | 'CA',
): boolean {
  const deductibleTypes = ['business', 'medical', 'charity'];

  // Moving is deductible in some cases but complex rules apply
  // For now, only include the clear-cut deductible types
  return deductibleTypes.includes(travelType);
}

/**
 * Get list of all deductible travel types for a country
 * 
 * @param country Country code
 * @returns Array of deductible travel type strings
 */
export function getDeductibleTravelTypes(country: 'US' | 'CA'): string[] {
  // TODO: This could be derived from the rates data
  // For now, hardcoded based on tax rules
  return ['business', 'medical', 'charity'];
}

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate reimbursement for a given distance using tiered rates
 * Handles both flat rates (single tier) and tiered rates (multiple tiers)
 * 
 * @param distance Total distance traveled
 * @param rateConfig Rate configuration with tiers
 * @returns Calculation result with breakdown by tier
 */
export function calculateTieredReimbursement(
  distance: number,
  rateConfig: ReimbursementRateConfig,
): ReimbursementCalculationResult {
  const breakdown: ReimbursementCalculationResult['breakdown'] = [];
  let remainingDistance = distance;
  let totalReimbursement = 0;
  let previousTierLimit = 0;

  for (let i = 0; i < rateConfig.tiers.length; i++) {
    const tier = rateConfig.tiers[i];

    if (remainingDistance <= 0) {
      break;
    }

    // Calculate distance that falls in this tier
    let distanceInTier: number;

    if (tier.tierUpToDistance === null) {
      // Last tier - takes all remaining distance
      distanceInTier = remainingDistance;
    } else {
      // Calculate tier capacity
      const tierCapacity = tier.tierUpToDistance - previousTierLimit;
      distanceInTier = Math.min(remainingDistance, tierCapacity);
      previousTierLimit = tier.tierUpToDistance;
    }

    const tierAmount = distanceInTier * tier.rate;

    breakdown.push({
      tierIndex: i,
      distanceInTier,
      rate: tier.rate,
      amount: tierAmount,
    });

    totalReimbursement += tierAmount;
    remainingDistance -= distanceInTier;
  }

  return {
    distance,
    distanceUnit: rateConfig.distanceUnit,
    totalReimbursement: Math.round(totalReimbursement * 100) / 100,  // Round to 2 decimals
    currency: rateConfig.currency,
    breakdown,
  };
}

/**
 * Calculate total reimbursement for multiple travel types
 * Used for generating the standard mileage deduction section of the report
 * 
 * @param distancesByType Map of travel type to distance
 * @param year Tax year
 * @param country Country code
 * @returns Array of calculation results per travel type
 */
export function calculateReimbursementByType(
  distancesByType: Map<string, number>,
  year: number,
  country: 'US' | 'CA',
): Array<{
  travelType: string;
  isDeductible: boolean;
  calculation: ReimbursementCalculationResult | null;
}> {
  const results: Array<{
    travelType: string;
    isDeductible: boolean;
    calculation: ReimbursementCalculationResult | null;
  }> = [];

  for (const [travelType, distance] of distancesByType.entries()) {
    const isDeductible = isDeductibleTravelType(travelType, country);

    if (!isDeductible || distance <= 0) {
      results.push({
        travelType,
        isDeductible,
        calculation: null,
      });
      continue;
    }

    const rateConfig = getRateForTravelType(year, country, travelType);

    if (!rateConfig) {
      results.push({
        travelType,
        isDeductible,
        calculation: null,
      });
      continue;
    }

    const calculation = calculateTieredReimbursement(distance, rateConfig);

    results.push({
      travelType,
      isDeductible,
      calculation,
    });
  }

  return results;
}

/**
 * Get the default/primary rate for a travel type (first tier rate)
 * Useful for displaying rate to user or for simple calculations
 * 
 * @param year Tax year
 * @param country Country code
 * @param travelType Travel type
 * @returns Primary rate value or null
 */
export function getPrimaryRate(
  year: number,
  country: 'US' | 'CA',
  travelType: string,
): number | null {
  const rateConfig = getRateForTravelType(year, country, travelType);

  if (!rateConfig || rateConfig.tiers.length === 0) {
    return null;
  }

  return rateConfig.tiers[0].rate;
}

/**
 * Get available years for a country
 * 
 * @param country Country code
 * @returns Array of available years, sorted descending
 */
export function getAvailableYears(country: 'US' | 'CA'): number[] {
  const ratesCollection = country === 'US' ? US_RATES : CA_RATES;
  return ratesCollection.map(r => r.year).sort((a, b) => b - a);
}