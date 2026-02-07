const typeDefs = `#graphql
  type VehicleFinancing @key(fields: "id") {
    "Unique identifier for the financing record"
    id: ID
    "Account ID that owns this financing record"
    accountId: ID

    # Ownership
    "Reference to the vehicle this financing applies to"
    carId: ID
    "User ID who created this financing record"
    userId: ID

    # Linked expense schedule
    "Reference to the auto-created expense schedule for recurring payments"
    expenseScheduleId: ID

    # Financing terms
    "Financing type: loan, lease"
    financingType: String
    "Bank, credit union, or leasing company name"
    lenderName: String
    "Loan or lease agreement/account number from the lender"
    agreementNumber: String
    "Loan or lease start date (ISO 8601 format)"
    startDate: String
    "Loan maturity date or lease end date (ISO 8601 format). Auto-calculated from startDate + termMonths if not explicitly provided."
    endDate: String
    "Total term length in months"
    termMonths: Int
    "Loan principal or total lease cost"
    totalAmount: Float
    "Currency of financing amounts (ISO 4217 code)"
    financingCurrency: String
    "Annual interest rate as percentage (e.g. 5.25). Primarily for loans."
    interestRate: Float
    "Initial down payment amount"
    downPayment: Float

    # Lease-specific fields
    "Lease residual / buyout price at end of term"
    residualValue: Float
    "Annual mileage allowance for leases (in unit specified by mileageAllowanceUnit)"
    mileageAllowance: Float
    "Unit for mileage allowance: km, mi"
    mileageAllowanceUnit: String
    "Cost per km/mile over the annual mileage allowance"
    mileageOverageCost: Float

    # Additional info
    "Additional terms, conditions, or notes about the financing agreement"
    notes: String

    # Audit fields
    "Record status: 100=Active, 200=Completed (paid off/lease ended), 10000=Removed"
    status: Int
    "Optimistic locking version number"
    version: Int
    "User ID who created this record"
    createdBy: ID
    "User ID who last updated this record"
    updatedBy: ID
    "User ID who removed this record"
    removedBy: ID
    "Timestamp when record was created (ISO 8601 format)"
    createdAt: String
    "Timestamp when record was last updated (ISO 8601 format)"
    updatedAt: String
    "Timestamp when record was removed (ISO 8601 format)"
    removedAt: String

    # Resolved references
    "Vehicle this financing applies to (resolved from carId)"
    car: Car
    "User who created this financing record (resolved from userId)"
    user: User
    "User who created this record (resolved from createdBy)"
    userCreated: User
    "User who last updated this record (resolved from updatedBy)"
    userUpdated: User
    "Linked expense schedule for recurring payments (resolved from expenseScheduleId)"
    expenseSchedule: ExpenseSchedule

    # Computed fields
    "Number of payments remaining based on term and elapsed months"
    paymentsRemaining: Int
    "Estimated remaining balance for loans (principal minus estimated payments applied to principal)"
    remainingBalance: Float
    "Percentage of term completed (0-100)"
    percentComplete: Float
    "Total mileage allowance for the full lease term (annual allowance × term in years)"
    totalMileageAllowance: Float
  }

  type VehicleFinancingResult implements OpResult {
    "Operation result code: 0=Success, non-zero=Error"
    code: Int!
    "List of errors if operation failed"
    errors: [Error!]
    "List of vehicle financing records"
    data: [VehicleFinancing!]
  }

  input VehicleFinancingInput {
    "Financing record ID (required for update, omit for create)"
    id: ID
    "Reference to the vehicle this financing applies to"
    carId: ID
    "Financing type: loan, lease"
    financingType: String
    "Bank, credit union, or leasing company name"
    lenderName: String
    "Loan or lease agreement/account number from the lender"
    agreementNumber: String
    "Loan or lease start date (ISO 8601 format)"
    startDate: String
    """
    Loan maturity date or lease end date (ISO 8601 format).
    Optional — if omitted but startDate and termMonths are provided, 
    endDate is auto-calculated as startDate + termMonths.
    If explicitly provided, it takes precedence over the calculated value.
    """
    endDate: String
    "Total term length in months"
    termMonths: Int
    "Loan principal or total lease cost"
    totalAmount: Float
    "Currency of financing amounts (ISO 4217 code)"
    financingCurrency: String
    "Annual interest rate as percentage (e.g. 5.25). Primarily for loans."
    interestRate: Float
    "Initial down payment amount"
    downPayment: Float
    "Lease residual / buyout price at end of term"
    residualValue: Float
    "Annual mileage allowance for leases (in unit specified by mileageAllowanceUnit)"
    mileageAllowance: Float
    "Unit for mileage allowance: km, mi"
    mileageAllowanceUnit: String
    "Cost per km/mile over the annual mileage allowance"
    mileageOverageCost: Float
    "Additional terms, conditions, or notes about the financing agreement"
    notes: String
    "Record status: 100=Active, 200=Completed, 10000=Removed"
    status: Int

    """
    Payment schedule configuration. Uses the standard ExpenseScheduleInput to define
    recurring payment frequency (weekly, monthly, yearly, one-time), amounts, and currency.
    When provided, an ExpenseSchedule record is auto-created (on create) or updated (on update).
    Fields like carId and kindId are auto-populated from the financing context.
    If null/omitted on update, the existing schedule is left unchanged.
    """
    expenseSchedule: ExpenseScheduleInput
  }

  input VehicleFinancingFilter {
    "Filter by financing record ID(s)"
    id: [ID]
    "Filter by account ID(s)"
    accountId: [ID]
    "Filter by user ID(s)"
    userId: [ID]
    "Filter by vehicle ID(s)"
    carId: [ID]
    "Filter by financing type(s): loan, lease"
    financingType: [String]
    "Filter by linked expense schedule ID(s)"
    expenseScheduleId: [ID]
    "Filter by record status(es): 100=Active, 200=Completed, 10000=Removed"
    status: [Int]
    "Search by lender name"
    searchKeyword: String
  }

  input VehicleFinancingWhereInput {
    "Financing record ID to target for update/remove operations"
    id: ID
  }

  type Query {
    "Get a paginated and filtered list of vehicle financing records"
    vehicleFinancingList(filter: VehicleFinancingFilter, params: PaginationAndSorting): VehicleFinancingResult
    "Get a single vehicle financing record by ID"
    vehicleFinancingGet(id: ID): VehicleFinancingResult
    "Get multiple vehicle financing records by IDs"
    vehicleFinancingGetMany(ids: [ID]): VehicleFinancingResult
  }

  type Mutation {
    "Create a new vehicle financing record. Optionally auto-creates a linked expense schedule if paymentSchedule is provided."
    vehicleFinancingCreate(params: VehicleFinancingInput): VehicleFinancingResult
    "Update an existing vehicle financing record. Updates the linked expense schedule if paymentSchedule fields change."
    vehicleFinancingUpdate(where: VehicleFinancingWhereInput, params: VehicleFinancingInput): VehicleFinancingResult
    "Soft-delete a vehicle financing record. Also disables the linked expense schedule."
    vehicleFinancingRemove(where: VehicleFinancingWhereInput): VehicleFinancingResult
    "Soft-delete multiple vehicle financing records"
    vehicleFinancingRemoveMany(where: [VehicleFinancingWhereInput]): VehicleFinancingResult
  }
`;

export default typeDefs;