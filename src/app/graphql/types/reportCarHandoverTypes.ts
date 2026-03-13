const typeDefs = `#graphql
  # ===========================================================================
  # Car Handover Report
  # A print-ready service history report for use when selling a vehicle.
  # Contains car details (via Car type resolver), current stats, and a full
  # chronological list of MAINTENANCE and REPAIRS category expenses —
  # without any pricing information.
  # ===========================================================================

  """
  A single maintenance or repair record in the handover report.
  Odometer is in the car's native mileage unit (mileageIn field on Car).
  No pricing fields are included — this report is intended for the buyer.
  """
  type HandoverRecord {
    "Expense base ID (uuid)"
    id: ID!

    "Date and time the service was performed (ISO 8601 UTC)"
    whenDone: String!

    """
    Odometer reading at the time of service, converted to the car's mileageIn unit.
    Null if the user did not record an odometer reading for this expense.
    """
    odometer: Float

    """
    Expense category code. Always one of: MAINTENANCE, REPAIRS.
    Useful on the frontend to group or color-code records by category.
    """
    categoryCode: String!

    """
    Localized category name in the requested lang (e.g. 'Maintenance', 'Repairs').
    Falls back to English if the requested language translation is missing.
    """
    categoryName: String!

    "Expense kind code (e.g. ENGINE_OIL_FILTER_CHANGE, SUSPENSION_REPAIR)"
    kindCode: String!

    """
    Localized expense kind name in the requested lang.
    Falls back to English if the requested language translation is missing.
    """
    kindName: String!

    """
    Name of the place where the service was performed (e.g. 'Jiffy Lube', 'Toyota Dealership').
    Comes from expense_bases.where_done. Null if not recorded.
    """
    whereDone: String

    """
    Short one-line note about the expense (max 128 chars).
    Comes from expenses.short_note. Null if not recorded.
    """
    shortNote: String

    """
    Longer free-text comments about the expense.
    Comes from expense_bases.comments. Null if not recorded.
    """
    comments: String
  }

  """
  Full handover report for a single vehicle.

  The car field resolves to the full Car type — the frontend can request
  any car subfields it needs: label, vin, licensePlate, manufacturedIn,
  model, color, engineVolume, mileageIn, makeId, bodyTypeId,
  transmissionTypeId, vehicleMake, carBodyType, carTransmissionType,
  uploadedFile (main image URL), etc.

  Monetary values are intentionally excluded from all record fields.
  """
  type HandoverReport {
    "The vehicle this report covers"
    carId: ID!

    """
    Resolved Car object. Use this to access all vehicle details:
    label, vin, licensePlate, color, manufacturedIn, model, engineVolume,
    mileageIn, driveType, mainTankFuelType, whenBought, boughtFrom,
    ownerNumber, vehicleMake { makeName }, carBodyType { name },
    carTransmissionType { name }, uploadedFile { url, thumbnailUrl }, etc.
    """
    car: Car

    """
    Latest known odometer reading for this vehicle, converted to the
    car's mileageIn unit. Sourced from car_total_summaries.latest_known_mileage
    (stored in km internally, converted here). Null if no expense/refuel
    records with odometer exist yet.
    """
    latestMileage: Float

    """
    ISO 8601 UTC timestamp when this report was generated.
    Useful for printing a 'Report generated on' line on the document.
    """
    generatedAt: String!

    """
    Total number of MAINTENANCE and REPAIRS records included in the report.
    Useful for a summary line like '47 service records'.
    """
    totalRecords: Int!

    """
    All MAINTENANCE and REPAIRS expense records for this vehicle,
    ordered newest-first (whenDone DESC).
    Excludes refuels (expense_type=1) — only expense_type=2 records.
    Excludes soft-deleted records (removed_at IS NULL).
    The frontend may re-sort or group by categoryCode as needed.
    """
    records: [HandoverRecord!]!
  }

  type HandoverReportResult implements OpResult {
    code: Int!
    errors: [Error!]
    data: [HandoverReport!]
  }

  input HandoverReportParamsInput {
    "Car ID to generate the report for (required)"
    carId: ID!

    """
    User's timezone offset in minutes from UTC (same as JS Date.getTimezoneOffset()).
    Used to format the generatedAt timestamp in local time.
    Defaults to 0 (UTC).
    """
    timezoneOffset: Int
  }

  type Query {
    reportCarHandoverGet(params: HandoverReportParamsInput): HandoverReportResult
  }
`;

export default typeDefs;