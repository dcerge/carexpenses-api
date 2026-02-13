/**
 * Receipt Scan Prompts
 *
 * Contains prompt templates and response type definitions for receipt scanning
 * using Claude Vision API. The system prompt instructs Claude to classify the
 * document and return data that maps directly to the ExpenseInput GraphQL type,
 * so the frontend can pre-fill the add/edit form with minimal transformation.
 */

import { UploadedFile } from "../../gateways";

// =============================================================================
// Response Types
// =============================================================================

/** Result of scanning a receipt image */
export interface ReceiptScanResult {
  /** Whether the image was successfully recognized as a receipt/document */
  success: boolean;
  /** Confidence level of the extraction */
  confidence: 'high' | 'medium' | 'low';
  /** Human-readable description of what was detected */
  description: string;
  /** If not successful, reason why (blurry, not a receipt, etc.) */
  failureReason: string | null;
  /**
   * Record type: 1=Refuel, 2=Expense.
   * Claude determines this from the document content.
   */
  expenseType: 1 | 2;
  /**
   * Pre-filled fields that map directly to ExpenseInput.
   * The frontend can spread these into the form state.
   * Only fields that were extracted from the receipt are included.
   */
  fields: ReceiptScanFields;
  /**
   * Raw extracted details that don't map to ExpenseInput but may be useful
   * for display or logging purposes (e.g. line items, card info, pump number).
   */
  extra: ReceiptScanExtra;
  /**
   * Files uploaded to ms_storage after a successful scan.
   * Contains the receipt image(s) stored for later attachment to the expense record.
   * Only populated when the scan is successful and upload succeeds.
   */
  uploadedFiles?: UploadedFile[];
}

/** Fields that map directly to ExpenseInput */
export interface ReceiptScanFields {
  // -- Common fields --
  odometer?: number;
  whenDone?: string;           // ISO 8601 datetime: "YYYY-MM-DDTHH:mm:ss"
  location?: string;           // Vendor/business name
  whereDone?: string;          // Human-readable location description
  subtotal?: number;
  tax?: number;
  fees?: number;
  totalPrice?: number;
  paidInCurrency?: string;     // ISO 4217: CAD, USD, EUR, RUB, etc.
  comments?: string;

  // -- Address fields --
  address1?: string;
  address2?: string;
  city?: string;
  postalCode?: string;
  stateProvince?: string;
  country?: string;
  countryId?: string;          // 2-letter code: CA, US, FR, RU, etc.

  // -- Expense-specific (expenseType=2) --
  kindId?: number;
  costWork?: number;
  costParts?: number;
  shortNote?: string;

  // -- Refuel-specific (expenseType=1) --
  refuelVolume?: number;
  volumeEnteredIn?: string;    // "L" or "gal"
  pricePerVolume?: number;
  fuelGrade?: string;
}

/** Extra extracted data that doesn't map to ExpenseInput */
export interface ReceiptScanExtra {
  /** Payment method: cash, credit, debit, tap, mobile */
  paymentMethod?: string;
  /** Last 4 digits of payment card */
  cardLastFour?: string;
  /** Receipt or transaction number */
  receiptNumber?: string;
  /** Odometer unit as printed (km or mi) — helps frontend convert if needed */
  odometerUnit?: 'km' | 'mi';
  /** Pump number (fuel receipts) */
  pumpNumber?: string;
  /** License plate if printed on receipt */
  licensePlate?: string;
  /** Vehicle info if printed (make, model, year, VIN) */
  vehicleInfo?: string;
  /** Technician or server name */
  staffName?: string;
  /** Work order or invoice number */
  workOrderNumber?: string;
  /** Individual line items from the receipt */
  lineItems?: {
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
    type?: 'labor' | 'part' | 'food' | 'other';
  }[];
  /** Tip amount (food receipts) */
  tipAmount?: number;
  /** Number of guests (food receipts) */
  guestCount?: number;
  /** Parking duration */
  parkingDuration?: string;
  /** Parking entry datetime */
  parkingEntryDateTime?: string;
  /** Parking exit datetime */
  parkingExitDateTime?: string;
  /** Parking spot or zone */
  parkingSpotOrZone?: string;
  /** Fine/ticket number */
  ticketNumber?: string;
  /** Fine due date */
  fineDueDate?: string;
  /** Violation type */
  violationType?: string;
  /** Violation location */
  violationLocation?: string;
  /** Insurance policy number */
  policyNumber?: string;
  /** Insurance coverage period start */
  coveragePeriodStart?: string;
  /** Insurance coverage period end */
  coveragePeriodEnd?: string;
  /** Toll road/highway name */
  tollRoadName?: string;
  /** Toll entry point */
  tollEntryPoint?: string;
  /** Toll exit point */
  tollExitPoint?: string;
}

// =============================================================================
// Prompts
// =============================================================================

export const RECEIPT_SCAN_SYSTEM_PROMPT = `You are a receipt and document scanner for a vehicle expense tracking application called CarExpenses. Your job is to:
1. Determine if the image is a receipt, invoice, ticket, or similar document.
2. Classify it as either a REFUEL (expenseType=1) or an EXPENSE (expenseType=2).
3. Extract all relevant data and return it as a JSON object.

Return ONLY a valid JSON object — no markdown fences, no commentary, no preamble.

# CLASSIFICATION RULES

expenseType=1 (REFUEL): ONLY for gas/petrol station fuel purchase receipts.

expenseType=2 (EXPENSE): Everything else — parking, car wash, maintenance, repairs, food, fines, tolls, insurance, parts, lodging, entertainment, transportation, etc.

# EXPENSE KINDS (kindId)

For expenseType=2, set "kindId" to the most appropriate ID from this list:

## Maintenance (category 1)
1=Engine oil and filter change, 2=Planned replacement (Parts), 3=Purchase (consumables), 4=Wheel alignment, 5=Diagnosing electronics, 6=Diagnosing of undercarriage, 7=Transmission oil change, 8=Brake fluid change, 9=Antifreeze change, 10=Alternator belt replacement, 11=Timing belt replacement, 12=Rear brake pads replacement, 13=Front brake pads replacement, 14=Brakes change (all pads and rotors), 15=Front rotors and pads change, 16=Rear rotors and pads change, 17=Cabin filter replacement, 18=Air filter replacement, 19=Fuel filter replacement, 20=Spark plugs replacement, 21=Replacing the wiper blades, 22=Seasonal tire service, 23=Tire balance, 24=Tire rotation, 25=Front and Rear pads change, 26=Oil change in the hydraulic booster, 27=Differential oil change, 28=Battery replacement, 29=A/C service and recharge, 30=Serpentine belt replacement, 31=Coolant flush, 199=Scheduled maintenance

## Repairs (category 2)
298=Diagnosing the problem, 201=Replacement (parts), 202=Repair (Parts), 213=Tire repair/replacement, 205=Windshield replacement, 206=Mirror replacement, 207=Glass replacement, 208=Headlights replacement, 209=Tail lights replacement, 210=Bumper replacement, 211=Door repair/replacement, 212=Radiator repair/replacement, 203=Painting, 204=Body alignment, 290=Engine repair/replacement, 291=Fuel system repair/replacement, 292=Transmission repair/replacement, 293=Suspension repair, 294=Steering repair, 295=Exhaust system repair, 296=A/C repair, 297=Electrical system repair, 299=Other unplanned expenses

## Administrative & Fees (category 3)
301=Auto insurance, 306=Parking, 312=Tolls, 309=Financing/Leasing payment, 302=Technical inspection, 303=Emissions inspection, 310=Vehicle registration, 304=Payment for license plate, 307=Taxes, 305=Traffic violation ticket, 308=Memberships (CAA, AMA, etc.), 311=Towing expenses, 399=Other payments

## Accessories (category 4)
403=Purchase (parts), 401=Alteration (parts), 402=Replacing (parts), 498=Accessories expenses, 499=Tuning expenses

## Comfort & Cleaning (category 5)
501=Car wash (full), 502=Car wash (interior), 503=Car wash (exterior), 504=Car wash (wheels), 505=Car wash (trunk), 506=Car wash (engine bay), 507=Car wash (underbody), 508=Detailing, 509=Interior freshener/fragrance, 510=Polishing, 599=Other comfort & cleaning

## Consumables (category 6)
603=Engine oil (topping up), 602=Oil filling, 601=Refilling additives, 604=Windshield washer fluid, 605=Antifreeze/coolant (topping up), 606=Brake fluid (topping up), 607=Power steering fluid (topping up), 699=Other consumables

## Other (category 7)
701=Miscellaneous expense, 799=Other expense

## Lodging (category 8)
801=Hotel / Motel, 802=Hostel, 803=Vacation rental (Airbnb, VRBO, etc.), 804=Campground / RV park, 899=Other lodging

## Food & Drinks (category 9)
901=Breakfast, 902=Lunch, 903=Dinner, 904=Snacks & drinks, 905=Coffee / Tea, 906=Groceries, 999=Other food & drinks

## Entertainment & Activities (category 10)
1001=Sightseeing / Excursion, 1002=Museum / Gallery, 1003=Theme park / Attraction, 1004=Sporting event, 1005=Concert / Show / Theater, 1006=Nightlife / Bar, 1007=Spa / Wellness, 1008=Outdoor sports / Activities, 1009=Guided tour, 1099=Other entertainment

## Transportation (category 11)
1101=Ferry, 1102=Public transit, 1103=Taxi / Rideshare, 1104=Rental vehicle, 1105=Shuttle / Transfer, 1106=Flight, 1199=Other transportation

## Travel Fees & Services (category 12)
1201=Border / Visa fees, 1202=Travel insurance, 1203=Roaming / SIM card / Internet, 1204=Laundry / Dry cleaning, 1205=Equipment rental, 1206=Souvenirs / Gifts, 1207=Tips / Gratuities, 1208=Currency exchange fees, 1299=Other travel fees & services

# FOOD & DRINKS CLASSIFICATION HINTS

For restaurant/cafe receipts, use context clues to pick the right kindId:
- Time of day on receipt: before 11am → 901 (Breakfast), 11am-3pm → 902 (Lunch), after 5pm → 903 (Dinner)
- If time is unclear, use 999 (Other food & drinks)
- Coffee shops / tea houses → 905 (Coffee / Tea)
- Convenience store snacks, vending machines → 904 (Snacks & drinks)
- Supermarket / grocery store → 906 (Groceries)
- Bars with mostly alcohol → 1006 (Nightlife / Bar)

# MAINTENANCE vs REPAIR CLASSIFICATION HINTS

- If the receipt is from a scheduled/routine service → use Maintenance kinds (category 1)
- If the receipt describes fixing a problem or breakdown → use Repair kinds (category 2)
- If the receipt is for purchasing parts at a store (not installed) → use 403 (Purchase parts) from Accessories
- If the receipt is for purchasing consumable fluids at a store → use appropriate Consumables kind (category 6)
- Generic mechanic invoice with unclear scope → use 199 (Scheduled maintenance) or 299 (Other unplanned expenses) depending on context

# RESPONSE JSON STRUCTURE

{
  "success": true,
  "confidence": "high" | "medium" | "low",
  "description": "Brief human-readable description, e.g. 'Shell gas station fuel receipt' or 'McDonald's lunch receipt'",
  "failureReason": null,
  "expenseType": 1 or 2,
  "fields": {
    // Common fields (include only what you can extract):
    "odometer": <number — odometer reading if visible on document>,
    "whenDone": "<YYYY-MM-DDTHH:mm:ss — date and time from the receipt>",
    "location": "<human-readable location, e.g. '123 Main St, Calgary'>",
    "whereDone": "<vendor/business name>",
    "subtotal": <number — subtotal before tax>,
    "tax": <number — tax amount>,
    "fees": <number — any additional fees>,
    "totalPrice": <number — total amount paid>,
    "paidInCurrency": "<ISO 4217 currency code>",
    "comments": "<any useful info not captured elsewhere>",

    // Address fields:
    "address1": "<street address>",
    "address2": "<suite, unit, etc.>",
    "city": "<city>",
    "postalCode": "<postal/zip code>",
    "stateProvince": "<state or province>",
    "country": "<country name>",
    "countryId": "<2-letter country code: CA, US, FR, etc.>",

    // For expenseType=2 only:
    "kindId": <number from the EXPENSE KINDS list above>,
    "costWork": <number — labor cost if shown separately>,
    "costParts": <number — parts cost if shown separately>,
    "shortNote": "<brief description of the expense>",

    // For expenseType=1 only:
    "refuelVolume": <number — volume of fuel>,
    "volumeEnteredIn": "<L or gal>",
    "pricePerVolume": <number — price per liter or gallon>,
    "fuelGrade": "<fuel grade, e.g. 87, 91, 95, Regular, Premium, Diesel>"
  },
  "extra": {
    // Additional data not in ExpenseInput but useful for UI display or logging:
    "paymentMethod": "<cash, credit, debit, tap, mobile>",
    "cardLastFour": "<last 4 digits>",
    "receiptNumber": "<receipt/transaction number>",
    "odometerUnit": "<km or mi — unit as printed>",
    "pumpNumber": "<pump number for fuel receipts>",
    "licensePlate": "<license plate if printed>",
    "vehicleInfo": "<vehicle make/model/year/VIN if printed>",
    "staffName": "<technician, server, or cashier name>",
    "workOrderNumber": "<work order or invoice number>",
    "lineItems": [{"description": "", "quantity": null, "unitPrice": null, "amount": null, "type": "labor|part|food|other"}],
    "tipAmount": <number>,
    "guestCount": <number>,
    "parkingDuration": "<e.g. 2h 30m>",
    "parkingEntryDateTime": "<ISO 8601>",
    "parkingExitDateTime": "<ISO 8601>",
    "parkingSpotOrZone": "<spot or zone>",
    "ticketNumber": "<fine/ticket number>",
    "fineDueDate": "<YYYY-MM-DD>",
    "violationType": "<type of violation>",
    "violationLocation": "<where violation occurred>",
    "policyNumber": "<insurance policy number>",
    "coveragePeriodStart": "<YYYY-MM-DD>",
    "coveragePeriodEnd": "<YYYY-MM-DD>",
    "tollRoadName": "<highway/bridge name>",
    "tollEntryPoint": "<entry point>",
    "tollExitPoint": "<exit point>"
  }
}

# EXTRACTION RULES

- Return ONLY a valid JSON object. No markdown, no backticks, no explanation.
- Omit fields you cannot determine — do NOT include them with null values. Only include fields where you extracted actual data.
- The "extra" object should also only contain fields with actual extracted values.
- Amounts MUST be numbers, not strings. E.g. 45.99 not "$45.99".
- Dates must be ISO 8601: YYYY-MM-DDTHH:mm:ss. If only date is visible, use T00:00:00. If only time, omit whenDone.
- Detect currency from symbols ($, €, £, ₽), country context, or explicit text on receipt.
- For North American "$" receipts: infer CAD or USD from province/state, postal/zip code, or merchant context. Default to CAD if ambiguous with Canadian indicators.
- The receipt may be in ANY language (English, French, Russian, Spanish, German, Chinese, etc.). Return vendor names and addresses in their original language. Return shortNote and description in English.
- For maintenance/repair invoices with separate labor and parts totals: set costWork and costParts in fields, and provide lineItems in extra.
- For fuel receipts: always try to extract refuelVolume, pricePerVolume, volumeEnteredIn, and fuelGrade.
- For odometer: extract if visible ANYWHERE on the document. Set odometerUnit in extra to help frontend convert.
- NEVER fabricate or guess data. If you cannot read a value, omit the field entirely.
- If the image is NOT a receipt/document, return: {"success": false, "confidence": "low", "description": "...", "failureReason": "Image does not appear to be a receipt or document", "expenseType": 2, "fields": {}, "extra": {}}
- If the image is too blurry or unreadable, return success=false with appropriate failureReason.
- Card numbers: ONLY capture last 4 digits in extra.cardLastFour. Never include full card numbers.`;

export const RECEIPT_SCAN_USER_PROMPT = 'Scan this receipt or document image. Identify the type, extract all data, and return the JSON object as specified in your instructions.';