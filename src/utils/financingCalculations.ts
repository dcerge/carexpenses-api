// ./src/utils/financingCalculations.ts

/**
 * Financing Calculation Utilities
 *
 * Centralized calculation logic for vehicle financing (loans and leases).
 * Used by both the financing list (cost breakdown display) and the
 * financing edit drawer (monthly payment estimation).
 *
 * Designed for eventual migration to the backend — all functions are
 * pure, stateless, and framework-agnostic.
 */

// ============================================
// Constants
// ============================================

/** Divisor to convert annual interest rate (%) to money factor */
const MONEY_FACTOR_DIVISOR = 2400;

// ============================================
// Core Primitives
// ============================================

/**
 * Convert annual interest rate percentage to a monthly money factor.
 * Standard lease industry formula: Money Factor = Annual Rate% / 2400
 *
 * @param annualRatePercent - Annual interest rate as a percentage (e.g. 2.9 for 2.9%)
 * @returns Money factor (e.g. 0.00120833 for 2.9%)
 */
export function rateToMoneyFactor(annualRatePercent: number): number {
  return annualRatePercent / MONEY_FACTOR_DIVISOR;
}

/**
 * Convert a money factor back to annual interest rate percentage.
 *
 * @param moneyFactor - Money factor (e.g. 0.00120833)
 * @returns Annual interest rate as a percentage (e.g. 2.9)
 */
export function moneyFactorToRate(moneyFactor: number): number {
  return moneyFactor * MONEY_FACTOR_DIVISOR;
}

/**
 * Calculate the net capitalized cost (amount financed after down payment).
 *
 * @param totalAmount - Total vehicle price or capitalized cost
 * @param downPayment - Down payment / cap cost reduction
 * @returns Net cap cost (always >= 0)
 */
export function calcNetCapCost(totalAmount: number, downPayment: number = 0): number {
  return Math.max(0, totalAmount - downPayment);
}

// ============================================
// Loan Calculations
// ============================================

/**
 * Calculate monthly loan payment using standard amortization formula.
 *
 * Formula: P × [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly rate, n = term in months
 *
 * For zero-interest loans, returns simple division: principal / termMonths.
 *
 * @param principal - Loan principal (amount financed after down payment)
 * @param annualRatePercent - Annual interest rate as percentage (e.g. 5.0 for 5%)
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount, or 0 if inputs are invalid
 */
export function calcLoanMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;

  if (annualRatePercent === 0) {
    return principal / termMonths;
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const compound = Math.pow(1 + monthlyRate, termMonths);
  const payment = principal * (monthlyRate * compound) / (compound - 1);

  return isFinite(payment) && payment > 0 ? payment : 0;
}

/**
 * Calculate total interest paid over the life of a loan.
 *
 * @param principal - Loan principal
 * @param annualRatePercent - Annual interest rate as percentage
 * @param termMonths - Loan term in months
 * @returns Total interest amount
 */
export function calcLoanTotalInterest(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  const monthlyPayment = calcLoanMonthlyPayment(principal, annualRatePercent, termMonths);
  if (monthlyPayment <= 0) return 0;

  const totalPaid = monthlyPayment * termMonths;
  return Math.max(0, totalPaid - principal);
}

// ============================================
// Lease Calculations
// ============================================

/**
 * Calculate lease depreciation amount (total over the term).
 *
 * Depreciation = Net Cap Cost - Residual Value
 * This represents the vehicle's value loss that the lessee pays for.
 *
 * @param netCapCost - Net capitalized cost (after down payment)
 * @param residualValue - Guaranteed future / residual value
 * @returns Total depreciation (clamped to >= 0)
 */
export function calcLeaseDepreciation(
  netCapCost: number,
  residualValue: number = 0
): number {
  return Math.max(0, netCapCost - residualValue);
}

/**
 * Calculate monthly lease depreciation fee.
 *
 * @param netCapCost - Net capitalized cost
 * @param residualValue - Residual value
 * @param termMonths - Lease term in months
 * @returns Monthly depreciation fee
 */
export function calcLeaseMonthlyDepreciation(
  netCapCost: number,
  residualValue: number = 0,
  termMonths: number = 1
): number {
  if (termMonths <= 0) return 0;
  return calcLeaseDepreciation(netCapCost, residualValue) / termMonths;
}

/**
 * Calculate monthly lease finance fee (rent charge).
 *
 * Finance Fee = (Net Cap Cost + Residual Value) × Money Factor
 *
 * @param netCapCost - Net capitalized cost
 * @param residualValue - Residual value
 * @param annualRatePercent - Annual interest rate as percentage
 * @returns Monthly finance fee
 */
export function calcLeaseMonthlyFinanceFee(
  netCapCost: number,
  residualValue: number = 0,
  annualRatePercent: number = 0
): number {
  if (annualRatePercent <= 0 || netCapCost <= 0) return 0;
  const moneyFactor = rateToMoneyFactor(annualRatePercent);
  return (netCapCost + residualValue) * moneyFactor;
}

/**
 * Calculate total finance charges over the life of a lease.
 *
 * @param netCapCost - Net capitalized cost
 * @param residualValue - Residual value
 * @param annualRatePercent - Annual interest rate as percentage
 * @param termMonths - Lease term in months
 * @returns Total finance charges
 */
export function calcLeaseTotalFinanceCharges(
  netCapCost: number,
  residualValue: number = 0,
  annualRatePercent: number = 0,
  termMonths: number = 1
): number {
  if (termMonths <= 0) return 0;
  return calcLeaseMonthlyFinanceFee(netCapCost, residualValue, annualRatePercent) * termMonths;
}

/**
 * Calculate monthly lease payment (depreciation + finance fee).
 *
 * Standard lease payment formula:
 *   Monthly Payment = Depreciation Fee + Finance Fee
 *   Depreciation Fee = (Net Cap Cost - Residual Value) / Term
 *   Finance Fee = (Net Cap Cost + Residual Value) × Money Factor
 *   Money Factor = Annual Rate% / 2400
 *
 * @param netCapCost - Net capitalized cost (totalAmount - downPayment)
 * @param residualValue - Guaranteed future value at lease end
 * @param annualRatePercent - Annual interest rate as percentage
 * @param termMonths - Lease term in months
 * @returns Monthly lease payment, or 0 if inputs are invalid
 */
export function calcLeaseMonthlyPayment(
  netCapCost: number,
  residualValue: number = 0,
  annualRatePercent: number = 0,
  termMonths: number = 1
): number {
  if (netCapCost <= 0 || termMonths <= 0) return 0;

  const depreciationFee = calcLeaseMonthlyDepreciation(netCapCost, residualValue, termMonths);
  const financeFee = calcLeaseMonthlyFinanceFee(netCapCost, residualValue, annualRatePercent);
  const payment = depreciationFee + financeFee;

  return payment > 0 ? round2(payment) : 0;
}

// ============================================
// Cost Breakdown (for display)
// ============================================

export interface FinancingCostBreakdown {
  /** Whether this is a lease breakdown */
  isLease: boolean;

  /**
   * For loans: principal (totalAmount minus downPayment).
   * For leases: total depreciation (netCapCost - residualValue).
   */
  principal: number;

  /**
   * For loans: total interest over the life of the financing.
   * For leases: total finance charges (money factor portion).
   */
  totalInterest: number;

  /** Total all-in cost = downPayment + all payments */
  totalCost: number;

  /**
   * For loans: interest as a percentage of principal.
   * For leases: finance charges as a percentage of depreciation.
   */
  interestPercent: number;

  /** Down payment portion as percentage of totalCost (for bar chart) */
  downPaymentBarPercent: number;

  /** Principal/depreciation portion as percentage of totalCost (for bar chart) */
  principalBarPercent: number;

  /** Interest/finance charges portion as percentage of totalCost (for bar chart) */
  interestBarPercent: number;

  /** Down payment amount */
  downPayment: number;

  /** Residual value for leases (informational, not part of cost bar) */
  residualValue?: number;
}

/** Input parameters for cost breakdown calculation */
export interface CostBreakdownInput {
  isLease: boolean;
  totalAmount: number;
  downPayment?: number;
  termMonths: number;
  interestRate?: number | null;
  residualValue?: number | null;
  /** Actual monthly payment from expense schedule (takes priority over formula) */
  actualMonthlyPayment?: number | null;
  /** Schedule type — only MONTHLY payments are used for breakdown */
  scheduleType?: string | null;
}

/**
 * Build bar-chart percentages from raw cost components.
 * Shared helper for both loan and lease breakdowns.
 */
function buildBreakdownResult(
  isLease: boolean,
  principal: number,
  totalInterest: number,
  downPayment: number,
  residualValue?: number
): FinancingCostBreakdown | null {
  const totalPayments = principal + totalInterest;
  if (totalPayments <= 0) return null;

  const allInCost = downPayment + totalPayments;
  const interestPercent = principal > 0 ? (totalInterest / principal) * 100 : 0;

  return {
    isLease,
    principal: round2(principal),
    totalInterest: round2(totalInterest),
    totalCost: round2(allInCost),
    interestPercent: Math.round(interestPercent * 10) / 10,
    downPaymentBarPercent: downPayment > 0 ? (downPayment / allInCost) * 100 : 0,
    principalBarPercent: (principal / allInCost) * 100,
    interestBarPercent: totalInterest > 0 ? (totalInterest / allInCost) * 100 : 0,
    downPayment,
    residualValue: isLease && residualValue && residualValue > 0 ? residualValue : undefined,
  };
}

/**
 * Compute the full cost breakdown for a financing record.
 *
 * Works for both loans and leases. Uses actual monthly payment if available,
 * otherwise falls back to formula-based calculation.
 *
 * @returns Breakdown object for display, or null if insufficient data
 */
export function computeFinancingCostBreakdown(
  input: CostBreakdownInput
): FinancingCostBreakdown | null {
  const {
    isLease,
    totalAmount,
    downPayment = 0,
    termMonths,
    interestRate,
    residualValue,
    actualMonthlyPayment,
    scheduleType,
  } = input;

  if (!totalAmount || totalAmount <= 0) return null;
  if (!termMonths || termMonths <= 0) return null;

  const netCapCost = calcNetCapCost(totalAmount, downPayment);
  if (netCapCost <= 0) return null;

  const rate = interestRate ?? 0;
  const hasActualPayment =
    actualMonthlyPayment != null &&
    actualMonthlyPayment > 0 &&
    scheduleType === SCHEDULE_TYPE_MONTHLY;

  if (isLease) {
    return computeLeaseCostBreakdown(
      netCapCost, downPayment, termMonths, rate,
      residualValue ?? 0, hasActualPayment ? actualMonthlyPayment! : null
    );
  }

  return computeLoanCostBreakdown(
    netCapCost, downPayment, termMonths, rate,
    hasActualPayment ? actualMonthlyPayment! : null
  );
}

function computeLoanCostBreakdown(
  principal: number,
  downPayment: number,
  termMonths: number,
  annualRatePercent: number,
  actualMonthlyPayment: number | null
): FinancingCostBreakdown | null {
  let totalPayments: number | null = null;

  // Strategy 1: Use actual payment
  if (actualMonthlyPayment != null) {
    totalPayments = actualMonthlyPayment * termMonths;
  }

  // Strategy 2: Amortization formula
  if (totalPayments == null && annualRatePercent > 0) {
    const monthlyPayment = calcLoanMonthlyPayment(principal, annualRatePercent, termMonths);
    if (monthlyPayment > 0) {
      totalPayments = monthlyPayment * termMonths;
    }
  }

  // No interest data — can't show meaningful breakdown
  if (totalPayments == null || totalPayments <= principal) return null;

  const totalInterest = totalPayments - principal;
  return buildBreakdownResult(false, principal, totalInterest, downPayment);
}

function computeLeaseCostBreakdown(
  netCapCost: number,
  downPayment: number,
  termMonths: number,
  annualRatePercent: number,
  residualValue: number,
  actualMonthlyPayment: number | null
): FinancingCostBreakdown | null {
  let totalDepreciation: number;
  let totalFinanceCharges: number;

  if (actualMonthlyPayment != null) {
    // Strategy 1: Back-calculate split from actual payment
    const totalPayments = actualMonthlyPayment * termMonths;
    totalDepreciation = calcLeaseDepreciation(netCapCost, residualValue);
    totalFinanceCharges = totalPayments - totalDepreciation;

    // Handle edge cases where data may be inconsistent
    if (totalFinanceCharges < 0) {
      totalFinanceCharges = 0;
      totalDepreciation = totalPayments;
    }
  } else if (annualRatePercent > 0) {
    // Strategy 2: Calculate from rate
    totalDepreciation = calcLeaseDepreciation(netCapCost, residualValue);
    totalFinanceCharges = calcLeaseTotalFinanceCharges(
      netCapCost, residualValue, annualRatePercent, termMonths
    );
  } else {
    // Zero-rate lease
    totalDepreciation = calcLeaseDepreciation(netCapCost, residualValue);
    if (totalDepreciation <= 0) return null;
    totalFinanceCharges = 0;
  }

  if (totalDepreciation + totalFinanceCharges <= 0) return null;

  return buildBreakdownResult(
    true, totalDepreciation, totalFinanceCharges, downPayment, residualValue
  );
}

// ============================================
// Monthly Payment Estimation (for edit forms)
// ============================================

/** Input for monthly payment estimation */
export interface MonthlyPaymentEstimateInput {
  isLease: boolean;
  totalAmount: number;
  downPayment?: number;
  interestRate?: number;
  termMonths: number;
  /** Lease-only: residual value */
  residualValue?: number;
}

/**
 * Estimate the monthly payment for either a loan or lease.
 *
 * Used in the financing edit drawer to suggest a payment amount.
 *
 * @returns Estimated monthly payment rounded to 2 decimal places, or null if insufficient data
 */
export function estimateMonthlyPayment(
  input: MonthlyPaymentEstimateInput
): number | null {
  const {
    isLease,
    totalAmount,
    downPayment = 0,
    interestRate = 0,
    termMonths,
    residualValue = 0,
  } = input;

  if (!totalAmount || totalAmount <= 0) return null;
  if (!termMonths || termMonths <= 0) return null;

  const netCapCost = calcNetCapCost(totalAmount, downPayment);
  if (netCapCost <= 0) return null;

  if (isLease) {
    const payment = calcLeaseMonthlyPayment(netCapCost, residualValue, interestRate, termMonths);
    return payment > 0 ? payment : null;
  }

  const payment = calcLoanMonthlyPayment(netCapCost, interestRate, termMonths);
  return payment > 0 ? round2(payment) : null;
}

// ============================================
// Formatting Helpers
// ============================================

/**
 * Round a number to 2 decimal places.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================
// Schedule Type Constant (local reference)
// ============================================

/**
 * We only use the MONTHLY constant here to avoid importing the full API
 * module. This should match SCHEDULE_TYPE.MONTHLY from @/utils/api.
 * When migrating to backend, replace with the server-side constant.
 */
const SCHEDULE_TYPE_MONTHLY = "MONTHLY";