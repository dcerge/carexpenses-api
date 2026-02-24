# CarExpenses — Feature Roadmap

Effort estimates assume our current pace (one feature end-to-end in ~2 days). Priorities are rated **P1** (high value, do soon) through **P4** (nice-to-have, defer).

## Audience Segments & Prioritization Principles

| Segment                              | Size                     | What They Need Most                                                                     |
| ------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------- |
| **Regular car owners**               | Largest                  | Simple expense tracking, fuel economy insights, maintenance reminders, document storage |
| **Multi-vehicle families**           | Large                    | Shared access, consolidated view, easy logging for multiple drivers                     |
| **Gig workers (rideshare/delivery)** | Medium                   | Profitability tracking, tax-compliant mileage logs, $/km and $/hour metrics             |
| **Small fleet operators**            | Smallest but highest LTV | Driver management, real-time tracking, checklists, audit trails                         |

**Core differentiator**: Multi-user collaboration — this is what Fuelio, Drivvo, and Simply Auto don't do well. Features that amplify this advantage rank higher.

**Prioritization principles**:

1. Serve the largest audience segments first
2. Reinforce the multi-user differentiator
3. Favor low effort relative to value
4. Avoid dependencies on unreleased infrastructure

---

# # Parking Sessions — Remaining Tasks

## 1. Vehicle Lifecycle Guard

**Priority:** High

Before a vehicle can be deleted or transferred, the system must check for active parking sessions on that vehicle. If an active session exists, the operation should be blocked with a clear error message prompting the user to end the parking session first.

**Scope:**

- Add a pre-delete check in the vehicle core (`beforeRemove`) that queries for active parking sessions on the target vehicle
- Return a validation error if any active sessions are found
- Display a user-friendly message: e.g., "This vehicle has an active parking session. Please end it before deleting the vehicle."
- Consider the same guard for vehicle transfer flows if applicable

---

## 2. Linked Expense Cleanup on Session Delete

**Priority:** High

When a parking session is deleted and it has a linked expense (`expenseId`), the associated expense record should also be soft-deleted to prevent orphaned expenses in the user's records.

**Scope:**

- In `ParkingSessionCore.afterRemove`, check if the removed session had an `expenseId`
- If so, call `expenseCore.remove` to soft-delete the linked expense
- Log the cleanup action for debugging
- Handle failures gracefully — log the error but don't fail the session deletion

---

## 3. Sync Parking Session When Linked Expense Changes

**Priority:** Medium

When a user edits a parking expense that was auto-generated from a parking session (i.e., the expense has a linked `parkingSessionId` or the session has an `expenseId`), the parking session should be updated to reflect the changes.

**Scope:**

- In the expense core's `afterUpdate`, detect if the updated expense is linked to a parking session
- Sync relevant fields back to the parking session:
  - `expense.totalPrice` → `session.finalPrice`
  - `expense.paidInCurrency` → `session.currency`
  - `expense.whenDone` → `session.startTime`
  - `expense.location` → `session.formattedAddress`
  - `expense.latitude` → `session.latitude`
  - `expense.longitude` → `session.longitude`
  - `expense.shortNote` → `session.notes`
  - `expense.travelId` → `session.travelId`
- Guard against infinite update loops (session updates expense → expense updates session). Use a flag or check whether values actually changed before writing back.
- When a linked expense is deleted by the user, clear `expenseId` on the parking session but keep the session itself intact

---

## 4. Drag-to-Adjust Pin on Start Parking Map

**Priority:** Low

The start parking drawer currently shows a read-only map preview after location detection. The spec envisions users being able to drag the pin to correct GPS inaccuracy, which is common in parking garages and dense urban areas.

**Scope:**

- Replace or enhance the `LocationPreview` in the `StartParkingDrawer` with an interactive map that allows pin dragging
- On pin drop, reverse-geocode the new coordinates and update the address field
- Consider feasibility within the current map component setup before prioritizing

## 5. Notifications

**PWA phase (current):** No push notifications. The active parking badge serves as the sole visual reminder across all pages. The badge's countdown/overtime display provides passive awareness.

**Capacitor phase (future):** When native app support is implemented, add local push notifications:

- Reminder at a configurable interval before expiry (e.g., 10 minutes before)
- Alert when parking time has expired
- Optional periodic reminders if overtime continues

---

## Future Enhancements

- **Parking rate calculator** — Enter hourly/daily rates and auto-calculate cost based on duration
- **Favorite parking locations** — Save frequently used parking spots for quick reuse
- **Parking photos** — Capture a photo of the parking spot, level marker, or ticket
- **Parking garage integration** — Partner APIs for real-time availability and pricing
- **Shared session visibility** — Real-time badge visibility for other account members (e.g., family member can see where the car is parked)
- **Expense receipt attachment** — Attach parking receipt photo/scan to the generated expense

---

## 1. Country-Specific Equipment Prompts (Digital Glovebox Extension)

**Priority: P1 — High** | **Effort: ~1 day**

### What it does

Adds country-specific equipment suggestions to the Digital Glovebox. When a user sets their location, the app offers a one-time prompt: "Based on your location, you may need: [list]. Add these to your Glovebox?" This helps users stay compliant with local roadside inspection requirements without having to research the rules themselves.

> **Note:** The Digital Glovebox already supports tracking physical safety equipment and accessories (first aid kits, fire extinguishers, warning triangles, reflective vests, breathalyzers, tow ropes, spare tires, jumper cables, ice scrapers, tire chains) with expiration date reminders and photo attachments. This feature adds the regional intelligence layer on top.

### How to build it

**Country-specific equipment templates:**

Create a lookup table or configuration mapping countries to their required/recommended equipment:

| Country | Required Equipment                                            |
| ------- | ------------------------------------------------------------- |
| Russia  | First aid kit, fire extinguisher, warning triangle            |
| Germany | First aid kit, warning triangle, reflective vest              |
| France  | Warning triangle, reflective vest, breathalyzer (recommended) |
| Austria | First aid kit, warning triangle, reflective vest              |
| Spain   | Warning triangle (x2), reflective vest                        |
| Canada  | Varies by province — no federal requirement                   |
| USA     | Varies by state — no federal requirement                      |

**Implementation:**

1. Add a `country_equipment_requirements` seed table (or JSON config) mapping country codes to lists of glovebox item type keys
2. When a user sets or updates their location (ties into Feature #11 if available, or based on account/profile country setting), check if they've already been prompted
3. Show a one-time prompt with the relevant equipment list and a quick-add action that creates the Glovebox items in bulk
4. Track whether the prompt has been shown (per user or per account) to avoid repeated prompts
5. Seed translations for prompt text across all four languages (EN, RU, FR, ES)

### Considerations

- For countries with state/province-level variation (USA, Canada), either skip the prompt or show a generic "Check your local requirements" message with a link to the relevant authority
- The prompt should be dismissible and not block the user — a one-time banner or modal, not a forced flow
- Users who add equipment before seeing the prompt shouldn't get duplicate suggestions — check existing Glovebox items before building the suggestion list
- Start with the countries listed above; expand based on user demand
- Keep the data maintainable — regulations change, so a simple seed file or admin-editable config is better than hardcoded logic

### Why P1

Minimal effort since the equipment tracking system is already built — this is purely a prompt and seed data layer. Adds perceived intelligence to the app ("it knows what I need for my country"). Solves a real compliance pain point for users in countries with equipment requirements (Russia, Germany, France, Austria — key target markets). Equipment compliance prompts are something no competitor offers.

---

## 2. # Vehicle Tasks — Remaining Work

### 1. Convert to Expense Workflow

**Priority: P2 — Medium** | **Effort: ~1–2 days**

### Problem

When a user completes a task like "buy new wipers" or "replace brake pads," the cost should be trackable as an expense. Currently, users must manually create a separate expense record and there is no connection between the task and the expense.

### Solution

Add a "Log as expense" flow that triggers when a task is completed (or available as an action on any completed task). The flow opens the expense creation form pre-filled with data from the task, and on save links the expense back to the task via `linked_expense_id`.

### Implementation

**Backend:**

- Add a new mutation or extend `vehicleTaskUpdate` to accept `linkedExpenseId` so the frontend can link the expense after creation
- Validate that the linked expense belongs to the same account
- When fetching tasks, resolve the `linkedExpense` reference so the UI can show expense details (amount, date)

**Frontend:**

1. **Completion prompt**: After the `vehicleTaskComplete` mutation succeeds, show a confirmation toast or bottom sheet asking: _"Task completed! Would you like to log this as an expense?"_
   - **Yes** → Open the `ExpenseEditDrawer` pre-filled with:
     - `carId` from the task
     - Description/notes pre-filled from the task title
     - Date set to today
   - **No** / dismiss → Task is simply marked complete (current behavior)

2. **Post-creation linking**: When the expense is successfully created from the prompt:
   - Call `vehicleTaskUpdate` with `linkedExpenseId` set to the new expense ID
   - Refresh the task in the dashboard/list to show the "Expense logged" indicator

3. **Completed task action**: On already-completed tasks that have no linked expense, show a "Log as expense" action button in the task card footer and swipe actions. This covers cases where the user dismissed the initial prompt but wants to link an expense later.

4. **Linked expense display**: The task list already shows a linked expense indicator (`Receipt` icon + "Expense logged" text). Enhance this to be clickable, navigating to the linked expense detail/edit page.

#### Acceptance criteria

- [ ] Completing a task shows a prompt to log an expense
- [ ] Dismissing the prompt completes the task without side effects
- [ ] Accepting the prompt opens the expense form pre-filled with task data
- [ ] Successfully created expense is linked to the task via `linkedExpenseId`
- [ ] Completed tasks without a linked expense show a "Log as expense" action
- [ ] Linked expense indicator on task cards is clickable and navigates to the expense
- [ ] Recurring tasks: the prompt appears on each completion (each occurrence is independent)
- [ ] Proper permission checks: only users who can create expenses see the prompt

---

### 2. "My Tasks" vs "All Tasks" Toggle

**Priority: P2 — Medium** | **Effort: ~0.5 day**

#### Problem

In shared accounts (families, fleets), users see all tasks for all users. There is no quick way to filter down to "tasks assigned to me" vs "everything," which can cause confusion about ownership and lead to duplicate effort.

#### Solution

Add a simple toggle or segmented control to the dashboard tasks widget and the task list that filters between "My tasks" (where `assignedToUserId` matches the current user) and "All tasks" (no user filter). Default to "My tasks" when the user has tasks assigned to them; otherwise default to "All tasks."

#### Implementation

**Backend:**

- No changes needed — the `VehicleTaskFilter.assignedToUserId` filter already exists
- The dashboard gateway query may need a parameter to optionally filter by `assigned_to_user_id`

**Frontend:**

1. **Dashboard widget**: Add a small segmented control (`My Tasks` | `All`) above the task list in `DashboardVehicleTasks`. When toggled, re-fetch dashboard tasks with or without `assignedToUserId` filter.

2. **Persistence**: Store the user's preference in local component state (or user profile if we want it to persist across sessions).

3. **Smart default**: On mount, check if the current user has any assigned tasks. If yes, default to "My Tasks." If no tasks are assigned to anyone, default to "All."

4. **Badge counts**: Show counts for both segments so the user knows at a glance: `My Tasks (3) | All (7)`.

#### Acceptance criteria

- [ ] Toggle visible on dashboard tasks widget
- [ ] "My Tasks" filters to `assignedToUserId = currentUser`
- [ ] "All" shows all tasks regardless of assignment
- [ ] Unassigned tasks appear in both views
- [ ] Smart default: "My Tasks" if user has assigned tasks, "All" otherwise
- [ ] Single-user accounts: toggle is hidden (no value in filtering)

---

## Tire Tracking — Remaining Work

**Priority: P2 — Medium** | **Effort: ~5–6 days**

Core tire management is complete (sets/items CRUD, swap workflow, mileage tracking, warning system, expense integration, mobile UI). The following items from the original spec remain:

### Tasks

| #   | Task                                                                                                                                                                                                                                | Effort    | Priority |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- |
| 1   | **Service interval integration** — Add tire-related service types (Rotation, Replacement, Pressure Check, Alignment). Auto-create rotation interval on install. Link tire warnings to reminders.                                    | ~1 day    | P2       |
| 2   | **Reports integration** — Tire costs in expense category breakdowns. Cost-per-km per tire set. Brand/model value comparison. Tire line item in yearly summaries.                                                                    | ~1–2 days | P2       |
| 3   | **Seasonal mismatch warnings** — Implement the `SEASONAL_MISMATCH` flag (currently a TODO). Resolve user hemisphere, define season boundaries, flag summer tires in winter and vice versa. Dashboard "swap by [date]" notification. | ~1 day    | P2       |
| 4   | **Tread depth history** — New `tire_tread_measurements` table to track depth over time instead of overwriting. Wear chart and remaining life prediction.                                                                            | ~1 day    | P3       |
| 5   | **Tire brands lookup** — Seed table with common brands for autocomplete in the item form.                                                                                                                                           | ~0.5 day  | P3       |
| 6   | **Dashboard tire status card** — Widget showing vehicles with active tire warnings and quick-swap action.                                                                                                                           | ~0.5 day  | P3       |

---

## 5. Recurring Revenues

**Priority: P2 — Medium-High** | **Effort: ~1–2 days**

### What it does

Users schedule automatic revenue entries for regular income — rideshare weekly payouts, delivery app settlements, monthly rental income from a vehicle, or recurring client contracts. This mirrors the existing scheduled expenses system but for the income side.

### How to build it

The backend infrastructure already exists via `expense_schedules`. Revenues in CarExpenses are already a distinct expense kind, so this is primarily about extending the scheduling system to cover them.

**Implementation:**

1. Allow `expense_schedules` to accept revenue-type entries (if not already supported, add a flag or leverage the existing expense kind discriminator)
2. Add a "Schedule this revenue" option on the revenue creation form, reusing the same schedule_type (weekly/monthly/yearly) and schedule_days UI already built for expenses
3. Backend job that generates revenue records uses the same `next_scheduled_at` mechanism and backfill logic as scheduled expenses
4. If an amount changes (e.g., new delivery rate), support bulk-updating future scheduled entries — same as the existing scheduled expense behavior

### Considerations

- Gig workers often have variable income — consider a "variable amount" option where the schedule creates a draft revenue entry that the user confirms/adjusts each period
- Weekly schedules are important here (many gig platforms pay weekly), unlike expenses which are more commonly monthly
- Plan limits should mirror scheduled expenses (Free: 2 schedules, Plus: 10, etc.)

### Why P2

Near-zero incremental effort since it reuses the scheduled expenses infrastructure. Gig workers — a key target audience — need this to calculate profitability. Without recurring revenues, revenue reports (Feature #8) have incomplete data. Ship this alongside or just before revenue reports for maximum impact.

---

## 6. # Profitability Report — Remaining Work

Remaining Tasks

### 1. Prorated Expenses for Per-Trip Profitability (#5)

**Problem:** Currently trip profit only includes expenses directly linked via `travel_id`. Unlinked period expenses (insurance, loan payments, unlinked refuels) are ignored, making per-trip profit appear higher than reality.

**Approach:** Distance-based proration — each trip gets a share of unlinked expenses proportional to `tripDistance / totalDistance`.

**Design decisions needed:**

- Proration basis: distance-based (trip km / total km) — confirmed
- Which expenses to prorate: all unlinked (refuels + maintenance + other) — needs confirmation
- Trips without distance: skip proration or fall back to equal distribution — needs confirmation

**Changes required:**

| Layer              | Change                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GraphQL**        | Add `proratedExpensesHc`, `totalCostHc` to `TripProfitability`. Add `totalProratedExpensesHc`, `totalAllCostsHc` to `TripProfitabilityTotals`. Add `totalUnlinkedExpensesHc` to `ProfitabilityReport` for transparency                      |
| **Boundary**       | New `UnlinkedExpenseTotals` raw type. Update `TripProfitability` and `TripProfitabilityTotals` interfaces                                                                                                                                   |
| **Gateway**        | New query: total unlinked expenses in period (WHERE `travel_id IS NULL`), split by refuels/maintenance/other. Or derive from existing totals minus sum of linked                                                                            |
| **Core**           | Calculate proration ratio per trip. Add `proratedExpensesHc = unlinkedTotal × (tripDistance / totalDistance)`. Update `netProfitHc = revenue - linkedExpenses - proratedExpenses`. Handle edge cases: no distance data, zero total distance |
| **API Service**    | Add new fields to GQL query and TypeScript types                                                                                                                                                                                            |
| **Frontend**       | Add prorated expenses column to `TripProfitabilityTable`. Update totals row. Add tooltip/note explaining proration method                                                                                                                   |
| **CSV Export**     | Add prorated and total cost columns to trip CSV export                                                                                                                                                                                      |
| **Print Template** | Add prorated column to trips table in print output                                                                                                                                                                                          |

### 2. Per-Platform/Tag Breakdown (#4)

**Problem:** Gig workers want to see profitability per platform (Uber vs. Lyft vs. DoorDash). Tags exist but the report only uses them as filters, not as a breakdown dimension.

**Deferred** — to be added later.

### 3. Language Hardcoded in Gateway

**Problem:** Multiple places in `ReportProfitabilityGw` have `const lang = 'en'; // TODO`. Revenue/expense category and kind names are only returned in English.

**Fix:** Pass user's language from `userProfile.lang` through the params to the gateway. Update `GetDataParams` to include `lang`, thread it from core's `buildReport` method.

**Changes required:**

| Layer       | Change                                                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gateway** | Add `lang` to `GetDataParams`. Replace `const lang = 'en'` with `params.lang` in all 4 breakdown queries (revenue by category, revenue by kind, expenses by category, expenses by kind) |
| **Core**    | Pass `userProfile.lang` (or locale) to gateway `getData()` call                                                                                                                         |

### 4. Monthly Trend `expensesCount` Always Zero

**Problem:** `expensesCount` in `ProfitabilityMonthlyTrend` is hardcoded to `0` with comment "Not tracked at monthly level in gateway."

**Fix:** Add expense count to the monthly queries, or sum refuel + maintenance + other counts. Low effort.

### 5. Foreign Currency Breakdown Not Populated

**Problem:** The aggregation helpers (`aggregateCategoryRows`, `aggregateKindRows`, etc.) initialize `foreignCurrencies: []` but never separate HC vs. foreign currency rows. The SQL groups by `home_currency` but the aggregation just sums everything into `totalAmountHc`.

**Fix:** In the aggregation helpers, detect when `paid_in_currency != home_currency` and populate the `foreignCurrencies` array with per-currency totals. This requires adjusting the SQL to also group by `paid_in_currency` and selecting `total_price` (original currency amount) alongside `total_price_in_hc`.

**Effort:** Medium — affects 4 aggregation methods and their corresponding SQL queries.

---

## Priority Order

1. **Prorated expenses (#5 from original list)** — Core feature gap for gig workers
2. **Language fix** — Quick win, affects data correctness for non-English users
3. **Monthly expensesCount** — Trivial fix
4. **Foreign currency breakdown** — Medium effort, affects multi-currency users
5. **Per-platform breakdown** — Deferred to future iteration

---

## 7. Data Import from Competitor Apps

**Priority: P2 — Medium-High** | **Effort: ~3–5 days**

### What it does

Users upload an export file from Fuelio, Drivvo, Simply Auto, Fuelly, or other vehicle tracking apps, and CarExpenses imports their historical data — vehicles, refuels, expenses, and service records.

### How to build it

**Competitor export formats (researched):**

- **Fuelio**: CSV with a specific header structure. Starts with `## Vehicle` section (Name, DistUnit, FuelUnit, ConsumptionUnit, ImportCSVDateFormat), then `## Log` section with columns for date, odometer, fuel volume, full/partial fill, price, location, notes. One file per vehicle. Well-documented format with an active community converter project on GitHub.
- **Drivvo**: CSV export available in the Pro version. Contains fuel, service, and expense records. Format is locale-dependent (Spanish, English, and Polish confirmed working in community tools; others may interpret "full fill" flags differently). Drivvo also supports direct import from Fuelio, aCar, and others.
- **Simply Auto**: CSV export via Google Drive backup. Uses separate files per data type: Vehicles.csv, Fillups.csv, Services.csv, Expenses.csv, Trips.csv. Vehicle IDs link records across files. Well-documented import guide with clear field definitions.
- **Fuelly**: Standard CSV with columns for odometer, distance, fuel volume, price per unit, city percentage, date, tags, and notes.

**Implementation approach:**

1. Upload page with a file picker and source app selector (Fuelio, Drivvo, Simply Auto, Fuelly, Generic CSV)
2. Backend parser per source format — each has quirks (date formats, unit encoding, locale-dependent values)
3. Mapping layer: normalize parsed data into CarExpenses entities (vehicles → vehicles, fillups → refuels, services → expenses with appropriate categories, trips → travels)
4. Unit conversion: detect source units from file headers and convert to metric for internal storage
5. Preview screen: show parsed records with counts before committing the import
6. Deduplication: check for overlapping dates/odometer readings to prevent double-imports

### Considerations

- Start with Fuelio (most popular competitor, best-documented format) and Simply Auto (cleanest CSV structure), then add Drivvo and Fuelly
- A "Generic CSV" option with column mapping UI would cover lesser-known apps
- Fuelio's format supports only one vehicle per file, so multi-vehicle imports need multiple file uploads
- Currency and unit detection from file headers is important — don't assume the user's current preferences match their old app's settings
- Run imports in a background job for large datasets (some users have years of data)

### Why P2

The #1 barrier to switching from a competitor is losing years of historical data. Making import painless removes this barrier entirely. Every major competitor (Fuelio, Drivvo, Simply Auto) supports importing from others — CarExpenses needs this to compete. Prioritize Fuelio first since Fuelio users are the most likely switchers given CarExpenses' superior multi-user features.

---

## 8. Monthly Budget Estimator

**Priority: P2 — Medium-High** | **Effort: ~2–3 days**

### What it does

Uses historical expense data to project future monthly costs per vehicle and across the fleet. Shows users what they can expect to spend next month based on patterns from previous months, plus any known upcoming scheduled expenses.

### How to build it

**Projection algorithm:**

1. Pull 6–12 months of historical expenses per vehicle, grouped by category (fuel, maintenance, insurance, etc.)
2. Compute monthly averages per category, with optional seasonal weighting (fuel costs tend to be higher in winter)
3. Add known future costs: scheduled expenses for the upcoming month (insurance, loan payments, etc.) are exact; non-scheduled categories use the historical average
4. Present a range: "Expected: $X–Y" using the average ± one standard deviation

**Where to show it:**

- **Dashboard** (primary placement): A "Cost Forecast" card below the fleet summary. Shows next month's projected total with a breakdown bar by category. For multi-vehicle accounts, show per-vehicle and fleet total
- **Vehicle detail page**: Monthly forecast specific to that vehicle
- **Reports page**: A "Budget vs. Actual" section comparing past projections to actual spend

**Implementation:**

1. Backend: New query that aggregates historical expenses and computes projections — pure SQL/math, no external dependencies
2. Frontend: A compact card component with a horizontal stacked bar (fuel | maintenance | insurance | other) and a total
3. Tap to expand into a detailed breakdown with per-category averages and upcoming scheduled expenses

### Considerations

- Needs at least 3 months of data to be useful — show a "Not enough data yet" placeholder for new vehicles
- Seasonal adjustments matter for fuel costs — even simple month-over-month comparison from the prior year helps
- Clearly label projections as estimates, not guarantees
- Should account for one-off large expenses (annual insurance) by detecting their periodicity in historical data

### Why P2

Turns historical data into forward-looking value — users stop asking "How much did I spend?" and start understanding "How much will I spend?" This is a sticky feature that brings users back to the dashboard regularly. All data is already in the system; this is purely a computation and presentation layer.

---

## 9. User Location for Regional Service Links

**Priority: P2 — Medium-High** | **Effort: ~2–3 days**

### What it does

Users specify their country, state/province, and city in their profile. The app uses this to surface contextually relevant links and information: where to pay traffic fines online, vehicle registration renewal portals, emissions testing requirements, insurance comparison sites, etc.

### Implementation approach

**Database changes:**

- Add `country_code`, `state_province`, `city` columns to the user profile (or account settings)
- Create a `regional_links` lookup table: (id, country_code, state_province, link_category, title, url, description, sort_order). Categories might include: fine_payment, registration_renewal, emissions_testing, insurance, roadside_assistance, recall_lookup

**Seed data (start with primary markets):**

- **Canada**: Province-by-province links (e.g., Alberta: myTrafficSafety.alberta.ca for fines, Service Alberta for registration)
- **United States**: State DMV links, state-specific fine payment portals
- **Russia**: Regional GIBDD links, Gosuslugi portal

**Integration points:**

- **Glovebox**: When a document type is "registration" and it's expiring, show a link to the user's state/province registration renewal portal
- **Service intervals**: When a service like "emissions inspection" is due, link to the local testing facility finder
- **Fines (expense kind)**: After logging a fine, show "Pay online →" link for their jurisdiction
- **Scheduled expenses**: Insurance renewal schedules can link to the user's provincial/state insurance portal
- **Dashboard**: Optional "Quick links" section for the user's region
- **Vehicle Equipment**: Country-specific equipment requirement prompts (ties into Feature #2)

### Considerations

- Start with Canada and US (primary markets), expand to other countries based on demand
- Regional links change — build an admin interface or simple seed file that can be updated without code changes
- Some jurisdictions don't have online payment portals — gracefully handle missing data
- City-level is useful for some things (local parking authority) but state/province covers most use cases

### Why P2

Low implementation effort with high perceived value. It transforms CarExpenses from a passive tracker into an active assistant. Users get relevant links exactly when they need them (document expiring, fine logged, service due). The data is mostly static — seed it once per region and update occasionally. This also lays the groundwork for future region-specific features including equipment templates.

---

## 10. Service Providers Directory

**Priority: P2 — Medium-High** | **Effort: ~2–3 days**

### What it does

A personal directory of service providers the user frequents: mechanics, tire shops, body shops, dealerships, inspection stations, car washes, etc. Each entry stores name, address, phone, specialty, and notes. Service providers can be linked to expense records ("work done at [shop]"), building a service history per provider.

### Data model

**New `service_providers` table:**

| Field                              | Type         | Description                                                                                                                                                     |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                 | uuid         | Primary key                                                                                                                                                     |
| account_id                         | uuid         | FK to accounts                                                                                                                                                  |
| name                               | varchar(255) | Business name                                                                                                                                                   |
| name_normalized                    | varchar(255) | For search                                                                                                                                                      |
| specialty                          | enum[]       | Array: 'general', 'tires', 'bodywork', 'electrical', 'transmission', 'brakes', 'exhaust', 'glass', 'inspection', 'dealership', 'car_wash', 'detailing', 'other' |
| address                            | text         | Street address                                                                                                                                                  |
| city                               | varchar      | City                                                                                                                                                            |
| state_province                     | varchar      | State/province                                                                                                                                                  |
| country_code                       | varchar(2)   | Country                                                                                                                                                         |
| latitude                           | numeric      | For map display (optional)                                                                                                                                      |
| longitude                          | numeric      | For map display (optional)                                                                                                                                      |
| phone                              | varchar      | Phone number                                                                                                                                                    |
| email                              | varchar      | Email (optional)                                                                                                                                                |
| website                            | varchar      | Website URL (optional)                                                                                                                                          |
| hours                              | text         | Business hours (free text)                                                                                                                                      |
| notes                              | text         | Personal notes ("ask for Mike", "cash discount available")                                                                                                      |
| rating                             | int          | Personal 1–5 star rating (optional)                                                                                                                             |
| is_favorite                        | boolean      | Pin to top of list                                                                                                                                              |
| created_at, updated_at, deleted_at | timestamps   | Standard audit fields                                                                                                                                           |

**Expense linkage:**

Add `service_provider_id` (nullable FK) to the expenses table. When logging an expense, the user can optionally select a service provider from their directory.

### Implementation approach

**Backend:**

1. Standard CRUD for service providers
2. Query with filters: by specialty, by location, favorites first
3. Aggregate queries: total spent at provider, number of visits, most recent visit

**Frontend:**

1. **Service Providers page**: Accessible from main navigation or settings. List view with search, filter by specialty
2. **Provider detail view**: Contact info, map thumbnail (if coordinates available), service history (linked expenses)
3. **Add provider form**: Name, specialty picker (multi-select), address with Google Places autocomplete (reuse existing integration), phone, notes
4. **Expense form integration**: "Service Provider" dropdown (optional) that filters by specialty relevant to the expense category. Quick "Add new provider" link if the provider isn't in the list
5. **Provider stats**: Total spent, visit count, average expense amount — shown on provider detail

**Google Places integration:**

When adding a provider, the user can search via Google Places autocomplete. Selecting a result auto-fills: name, address, coordinates, phone, website, and hours. The user can edit before saving. This uses the existing Places API integration.

### Considerations

- This is a personal directory, not a public review system. Don't build crowdsourced ratings or reviews — that's a different product
- The specialty field is multi-select because many shops do multiple things (a tire shop might also do alignment and brakes)
- Coordinates enable showing providers on the map visualization (Feature #18) as a layer
- Linking expenses to providers builds valuable data over time: "I've spent $2,400 at this mechanic over 3 years across 8 visits"
- Phone number should support tap-to-call on mobile
- Consider a "share provider" feature for multi-user accounts, but for MVP all providers are account-level (all users see all providers)

### Why P2

Useful practical feature that users frequently request. The service history aspect ("how much have I spent at this shop?") adds analytical value. Linking expenses to providers creates richer data over time. Implementation leverages existing Google Places integration. The multi-user sharing aspect is valuable for families ("here's our trusted mechanic").

---

## 11. Checklists (Pre/Post-Travel & Maintenance)

**Priority: P2 — Medium-High** | **Effort: ~3–4 days**

### What it does

Reusable checklists that users can attach to travels or run independently. Examples: pre-road-trip inspection (tire pressure, fluids, lights, wipers), post-trip damage check, winter preparation, vehicle handover (for fleet operators handing a vehicle to a new driver).

### How to build it

**Data model:**

- `checklist_templates` table: id, account_id, vehicle_id (nullable — account-wide or vehicle-specific), name, description, checklist_type (pre_travel, post_travel, maintenance, custom), items (JSONB array of {label, required, photo_required})
- `checklist_runs` table: id, template_id, vehicle_id, travel_id (nullable), started_at, completed_at, completed_by_user_id
- `checklist_run_items` table: id, run_id, item_label, checked, notes, photo_attachment_id

**Implementation:**

1. Template builder: simple list editor where users add items, mark which require photos, reorder via drag-and-drop (already have `@hello-pangea/dnd` in the stack)
2. Checklist execution UI: tap-to-check items, inline camera button for photo items (leverages existing attachment system), optional notes per item
3. Seed a few default templates (pre-trip inspection, post-trip check, winter prep) that users can customize
4. Travel integration: when starting or ending a travel record, prompt to run the associated checklist
5. Completion status visible on travel and vehicle detail views

### Considerations

- Photo attachments use the existing file upload system — no new infrastructure
- Fleet operators need this most — a driver completing a pre-trip checklist creates an audit trail
- Checklist templates should be shareable across vehicles within an account
- Consider offline support for checklists since they're often done in places with poor connectivity (parking lots, garages)

### Why P2

Strong differentiator for fleet operators and road-trip planners. Creates structured data about vehicle condition over time. Builds on existing infrastructure (attachments, drag-and-drop, travels). The audit trail aspect is valuable for business accounts — proof that a driver checked the vehicle before departure. Multi-user friendly: one person creates templates, drivers execute them.

---

## 12. Voice Input for Expenses, Refuels, Checkpoints & Travels

**Priority: P2 — Medium-High** | **Effort: ~3–4 days**

### What it does

Users tap a microphone button on any "add" form, speak naturally (e.g., "Oil change at Canadian Tire, forty-seven dollars"), and the app populates the form fields automatically. The audio recording is saved and attached to the record, so users can play it back later as a voice memo — useful for remembering context around an expense weeks or months after the fact.

### How to build it

The approach uses three stages: **record audio → transcribe → parse into fields**, with the original recording preserved as an attachment.

**Stage 1: Audio recording (browser-native)**

Use the `MediaRecorder` API with `getUserMedia` to capture audio. Unlike the Web Speech API (which only works reliably in Chrome), MediaRecorder has excellent cross-browser support — it's been available across all major browsers (Chrome, Firefox, Safari, Edge) since April 2021, including Safari on iOS 14.5+. This eliminates the biggest limitation of the Web Speech API approach.

The recording produces a Blob (WebM/Opus in Chrome/Firefox, MP4/AAC in Safari) that serves double duty: it gets sent to the STT service for transcription AND uploaded as a file attachment to the record via the existing attachment system.

**Stage 2: Speech-to-text transcription**

Send the audio file to a cloud STT API. Recommended options:

- **OpenAI Whisper API (recommended for MVP)**: $0.006/min, supports 50+ languages (covers EN, RU, FR, ES), excellent accuracy on noisy real-world audio (gas stations, roadside). No streaming needed since we're sending a completed recording. Simple REST API — send audio file, get text back.
- **Deepgram Nova-3**: $0.0043/min, slightly cheaper, 30+ languages, faster processing. Good alternative if volume grows.
- **AssemblyAI**: $0.0025/min (cheapest), 20+ languages, strong accuracy.

At typical usage (a 10–15 second voice note per entry, ~4 entries/week per active user), the cost is negligible — under $0.01/month per user with any of these providers.

**Stage 3: Natural language parsing**

The transcribed text (e.g., "filled up 42 liters at Shell on Main Street for sixty-two fifty") needs to be mapped to structured form fields. Send the transcript to Claude or GPT with a prompt that returns structured JSON matching the form schema. The prompt includes the record type (refuel, expense, checkpoint, travel) and the user's vehicle context. Cost: ~$0.001–0.005 per request.

**Implementation approach:**

1. **Generic `VoiceRecordButton` component** — reusable mic button with recording state (idle → recording → processing). Shows waveform or duration while recording.
2. **Recording hook** (`useVoiceRecorder`) — wraps `MediaRecorder`, handles `getUserMedia` permissions, produces a Blob on stop.
3. **Backend endpoint** — receives audio blob, sends to Whisper API for transcription, sends transcript to LLM for structured extraction, returns JSON with extracted fields.
4. **Frontend form integration** — pre-fills form fields from the JSON response. User reviews, edits if needed, and submits. The audio blob is automatically added to the record's attachments.
5. **Playback** — Audio attachment rendered with a simple `<audio>` player on the record detail view.

### Audio attachment value

Saving the voice recording adds significant value beyond just data entry:

- **Context preservation**: "Why did I spend $200 at that shop?" — play the voice memo to hear your own explanation from that moment
- **Audit trail**: For business/tax purposes, a timestamped voice note is supporting evidence
- **Hands-free logging**: At a gas station or while driving (passenger), speak the details and clean up the form later
- **Accessibility**: Users who find typing on mobile difficult get an alternative input method
- **Storage**: A 15-second audio clip at reasonable quality is ~30–50 KB — minimal impact on the user's storage quota

### Considerations

- `MediaRecorder` output format varies by browser (WebM in Chrome/Firefox, MP4 in Safari) — the backend should accept both, and the STT APIs handle both formats natively
- Microphone permission prompt will appear on first use — add a friendly UI explanation before triggering it
- Works best for quick entries; complex entries with detailed cost breakdowns are still faster by hand
- Requires internet for STT and LLM processing — show an appropriate message if offline
- The LLM parsing prompt should be locale-aware (user might say "soixante-deux dollars" in French)

### Why P2

The `MediaRecorder` approach eliminates the cross-browser limitation that made this risky before. Combined with the audio-as-attachment angle, this becomes a genuinely useful feature — not just a data entry shortcut, but a voice memo system for vehicle records. The "play back your own voice note on any record" capability is something no competitor offers. Implementation is straightforward since it builds on the existing attachment infrastructure.

---

## 13. # Receipt Scanning — v2 Roadmap

## Overview

Version 1 of receipt scanning delivers the core flow: snap a photo, extract data, pre-fill the form. Version 2 focuses on making the feature smarter, more polished, and better integrated with the rest of the app.

---

## Smarter Vehicle Matching

When a receipt contains a license plate number, automatically match it to the correct vehicle in the user's account instead of requiring manual selection. This is especially useful for users managing multiple vehicles.

## Scan Limit UX

Show users how many receipt scans they have remaining in their monthly allowance. When the limit is reached, display a clear message with an option to upgrade their plan — rather than a generic error.

## Retry Flow

When a scan fails (blurry image, unrecognizable document), offer a "Try Again" action that reopens the camera immediately instead of requiring the user to tap the scan button again from scratch.

## Batch Scanning

Allow users to scan multiple receipts in a row without returning to the dashboard between each one. Useful after a road trip or when catching up on a backlog of receipts.

## Offline Queuing

When the user has no internet connection, save the captured photo locally and queue it for scanning once connectivity is restored. This supports the PWA offline-first experience and is common during travel or in areas with poor reception.

## Cost Monitoring Dashboard

Track AI API usage and costs across all users. Provide an internal admin view showing scan volume, token consumption, and spend trends to help manage operational costs as the user base grows.

## Scan History

Let users view a log of their past scans, including failed attempts, so they can re-process a receipt or troubleshoot recognition issues.

## Multi-Page Document Support

Support scanning multi-page invoices or documents (e.g., detailed mechanic invoices) by allowing the user to capture multiple photos that are combined into a single scan request.

---

## 14. Native App Wrapper (Capacitor)

**Priority: P3 — Medium** | **Effort: ~3–5 days initial, ongoing**

### What it does

Wraps the existing CarExpenses PWA into native iOS and Android apps using Capacitor, enabling App Store/Play Store distribution and access to native device capabilities that browsers restrict.

### Recommended technology: Capacitor

Capacitor (by the Ionic team) is the clear choice for wrapping a React-based PWA into native apps. It runs your existing web app inside a native WebView while providing a bridge to native APIs through plugins. Key advantages over alternatives:

- **Same codebase**: Your React/Mantine app runs as-is inside the native container. No rewrite needed
- **Native API access via plugins**: Push notifications, background geolocation, Bluetooth (for OBD-II), file system, camera, biometric auth — all accessible through Capacitor's plugin ecosystem
- **App Store compatible**: Produces real Xcode and Android Studio projects that build to .ipa and .apk files
- **Active ecosystem**: Official plugins plus a large community plugin library (`capacitor-community/*`)

Alternatives considered: **TWA (Trusted Web Activity)** works well for Android (your PWA runs in Chrome without a visible browser bar, and can be distributed on Play Store) but offers no iOS solution and no access to native APIs. **Cordova** is the predecessor to Capacitor and still works, but Capacitor is its modern, actively maintained replacement. **Tauri** is lightweight and interesting, but its mobile support is newer and less proven.

### What it unlocks

- **App Store / Play Store distribution**: Discoverability, user trust, familiar install flow. Required for certain business customers
- **Push notifications (iOS)**: PWAs can't reliably send push notifications on iOS. Capacitor fixes this
- **Background geolocation**: Critical for real-time travel tracking (Feature #17). Multiple Capacitor plugins available: `@capacitor-community/background-geolocation` (free, lightweight), `@transistorsoft/capacitor-background-geolocation` (commercial, full-featured with motion detection, geofencing, and SQLite buffering)
- **Bluetooth**: Required for OBD-II integration (Feature #22). Web Bluetooth API has limited browser support; Capacitor's Bluetooth plugin works reliably on both platforms
- **Biometric authentication**: Face ID / fingerprint login via `@capacitor/biometric-auth`
- **Camera improvements**: Direct camera access without browser permission prompts

### Implementation approach

1. `npm install @capacitor/core @capacitor/cli`, then `npx cap init`
2. `npx cap add ios && npx cap add android`
3. `npm run build && npx cap sync` to push the web build into the native projects
4. Open in Xcode / Android Studio, configure signing, and build
5. Incrementally add native plugins: push notifications first (biggest iOS gap), then background geolocation

### Considerations

- Apple's review process requires the app to feel native — not just a website in a shell. Ensure proper iOS navigation patterns, splash screens, and offline functionality
- Maintain the PWA in parallel — the web version continues to work for users who don't want to install an app
- Native builds need CI/CD setup (Fastlane or similar) for sustainable release management
- Capacitor plugin updates should be tested on both platforms before each release
- App Store fees: Apple takes 30% (15% for small businesses) of subscription revenue from in-app purchases

### Why P3

The PWA works well today and should remain the primary experience. The native wrapper becomes important when features that require native APIs (background geolocation, OBD-II, push notifications on iOS) are ready to ship. There's no urgency to wrap just for App Store distribution — but when Features #17 or #22 are on the roadmap, Capacitor needs to be in place first.

---

## 15. Real-Time Travel Tracking with Time Tracking

**Priority: P3 — Medium** | **Effort: ~5–7 days**

### What it does

Background location tracking that automatically records travel routes without manual odometer entry. Tracks both driving time and total elapsed time (including waiting, loading, breaks). For fleet owners, shows near real-time driver positions on a map. Requires the native app wrapper (Feature #16).

### How to build it

**Prerequisite:** Capacitor native app wrapper must be in place.

**Location tracking plugins (Capacitor ecosystem):**

- **`@capacitor-community/background-geolocation`** (free, MIT license): Lightweight, provides continuous location updates even when the app is backgrounded. Returns lat/lng, accuracy, altitude, speed, and bearing. Requires a persistent notification on Android (OS requirement for foreground services). Good for basic route recording
- **`@transistorsoft/capacitor-background-geolocation`** (commercial, ~$300/year per app): Premium solution with motion detection (automatically starts/stops tracking based on accelerometer), SQLite-buffered location storage, built-in HTTP sync to your server, geofencing, and battery-optimized tracking. Includes activity recognition ("in_vehicle", "on_foot", "still")
- **`@capgo/background-geolocation`** (free, community fork): Actively maintained fork focused on accuracy over battery life. Good middle ground

**Implementation approach:**

1. **Route recording**: When a user starts a travel, activate background geolocation. Store location points to a local buffer (IndexedDB or SQLite via Capacitor). On travel end, upload the full route to the server
2. **Automatic odometer**: Calculate distance from the GPS trace (sum of haversine distances between consecutive points) and offer to auto-fill the travel's distance. Users can still manually enter odometer if they prefer GPS accuracy isn't sufficient
3. **Fleet tracking (real-time)**: For Business plan accounts, periodically sync driver location to the server (e.g., every 30 seconds while driving). Fleet owners see a live map with driver positions. Use WebSockets or server-sent events for real-time updates
4. **Route visualization**: Store the polyline and render it on the travel detail view using Google Maps or Mapbox

**Time tracking integration:**

Because this feature enables live travel tracking, time tracking becomes automatic rather than manual:

1. **Automatic time capture**: Track `driving_start_at`, `driving_end_at` timestamps based on motion detection
2. **Driving vs. waiting**: The Transistorsoft plugin's activity recognition distinguishes "in_vehicle" from "still" — automatically calculate driving minutes vs. waiting minutes
3. **Timer UI**: Show a running clock on the active travel view (driving time in green, waiting time in amber)
4. **Integration with revenue reports**: Hours worked per trip enables $/hour calculations. "You earned $45.60 on this trip in 1h 23m of driving (2h 10m total) = $21.06/driving-hour"

**Data model additions to the travel record:**

| Field                 | Type      | Description                                 |
| --------------------- | --------- | ------------------------------------------- |
| driving_start_at      | timestamp | When driving began                          |
| driving_end_at        | timestamp | When driving ended                          |
| total_elapsed_minutes | int       | Wall-clock time from travel start to end    |
| driving_minutes       | int       | Actual time spent driving (excluding stops) |
| waiting_minutes       | int       | Derived: total_elapsed - driving_minutes    |
| route_polyline        | text      | Encoded polyline of the GPS trace           |
| tracking_mode         | enum      | 'manual', 'gps_automatic'                   |

### Considerations

- Battery consumption is the #1 concern. Use motion detection to only track when the vehicle is moving. The Transistorsoft plugin's accelerometer-based approach is ideal — it powers down GPS when stationary
- Privacy: GPS tracking of employees is legally sensitive in many jurisdictions. Clearly communicate when tracking is active (persistent notification), allow drivers to see their own tracked routes, and provide opt-out controls
- Android's background execution limits (Android 8+) require a foreground service with a visible notification — this is standard but must be implemented correctly
- iOS background location requires "Always" permission, which triggers a stricter App Store review. The app must clearly justify why background location is needed
- Offline areas: buffer locations locally and sync when connectivity returns
- Time zones matter: a gig worker might start a delivery in one time zone and end in another (rare but possible for long-haul)

### Why P3

Genuine value for fleet operators and gig workers. Time tracking and real-time location tracking are bundled together because time tracking without live tracking means manual entry, which is friction-heavy and reduces adoption. The commercial plugin (Transistorsoft) adds cost but provides a significantly better experience than building from scratch. Requires the Capacitor wrapper to be in place first.

---

## 16. Map Visualization Page

**Priority: P3 — Medium** | **Effort: ~3–5 days**

### What it does

A dedicated map page where users can visualize all their records geographically. Filter by vehicle, date range, and record type (refuels, expenses, checkpoints, travel routes) to see patterns: where they refuel most often, which routes they drive, where breakdowns happened. Optionally overlay historical temperature data for fuel economy analysis.

### How to build it

**Implementation approach:**

1. **Map component**: Use Google Maps JavaScript API (already integrated for location autocomplete) or Mapbox GL JS for a more customizable/cheaper option
2. **Data layer**: Query records that have lat/lng coordinates (refuels with station location, checkpoints, travel start/end points, travel waypoints) filtered by vehicle and date range
3. **Marker types**: Different colored/shaped pins for each record type. Cluster markers at low zoom levels to avoid visual overload
4. **Travel routes**: Render travel records as polylines connecting start → waypoints → end
5. **Temperature overlay**: Pull historical weather data (already planned via Google Weather API for fuel economy analysis) and show as a color gradient or data labels on map markers
6. **Filters sidebar**: Vehicle selector, date range picker, record type toggles, temperature toggle
7. **Service providers layer**: Show saved service providers (Feature #12) as a distinct marker type

### Considerations

- Only records with location data can be shown — add a "Records without location: X" indicator so users know the map isn't showing everything
- Google Maps API pricing: ~$7 per 1,000 map loads (Dynamic Maps), which adds up. Consider Mapbox ($0.60 per 1,000 loads on free tier, then $5/1,000) or a self-hosted option like MapLibre GL for cost control
- Mobile UX: the map should be full-screen with an expandable bottom sheet for filters and record details
- Performance: for users with thousands of records, implement server-side bounding-box queries and marker clustering
- Temperature correlation is a premium feature — gate behind paid plans

### Why P3

Visually impressive and useful for power users, but not essential for core expense tracking. Requires careful API cost management at scale. Best built after the core data is solid and enough location-enriched records exist to make the map meaningful. The weather correlation feature is a unique selling point that no competitor offers.

---

## 17. Nearby Gas Stations with Fuel Prices

**Priority: P3 — Medium** | **Effort: ~3–5 days**

### What it does

Shows gas stations near the user's current location with current fuel prices, sorted by price or distance. Users can tap a station to start navigation or to pre-fill a refuel entry with that station's details.

### How to build it

**Data sources for fuel prices:**

Reliable, affordable fuel price APIs are limited. The landscape is fragmented by country:

- **GasBuddy**: The most comprehensive source for US/Canada, but no public API — data access requires a commercial partnership or scraping (against ToS)
- **Global Petrol Prices API**: Covers 135 countries with national/regional average prices. Not station-level — useful for benchmarking but not for "find cheapest nearby." Pricing is quote-based
- **Xavvy**: European and North American fuel price data with station-level detail. Commercial API, custom pricing
- **Government sources**: Some countries mandate fuel price transparency (e.g., Germany's Tankerkönig API is free and real-time; Australia has FuelWatch). Very fragmented by country
- **Google Places API**: Returns gas stations nearby with location and hours, but does NOT include fuel prices
- **Community-sourced**: A Home Assistant integration aggregates prices from GasBuddy (reverse-engineered), FuelWatch (AU), Spritpreisrechner (AT), TankerKoenig (DE), and others — showing the fragmented nature of this data

**Realistic approach:**

1. **Phase 1 — Station finder without prices**: Use Google Places API (already in the stack) to show nearby gas stations with name, address, distance, and hours. Users tap to navigate or to pre-fill a refuel's location. This alone is useful
2. **Phase 2 — Price data where available**: Integrate country-specific sources where free/affordable APIs exist (Germany, Australia, etc.). For US/Canada, consider community-sourced pricing or crowdsourced data from CarExpenses users themselves
3. **Phase 3 — Crowdsourced prices**: When users log a refuel with a station and price, contribute that data point back to a shared price database. Over time, this creates a CarExpenses-specific price network

### Considerations

- Station-level fuel price data is expensive or unavailable via API in most countries — don't promise what can't be delivered
- The Google Places API charges per request (~$17 per 1,000 Nearby Search calls) — cache results aggressively and limit calls
- Geolocation requires HTTPS and user permission — already handled for other features
- Consider showing the user's recent refuel prices at nearby stations (from their own data) as a lightweight "price history" without external APIs

### Why P3

The station finder (without prices) is useful and straightforward via Google Places. Real-time fuel prices are the compelling feature, but reliable data sources are limited and often expensive. Best approach is to ship the station finder first, add prices where free APIs exist, and build toward crowdsourced data as the user base grows.

---

## 18. AI Chatbot for Vehicle Troubleshooting

**Priority: P4 — Low** | **Effort: ~5–7 days (MVP), ongoing for data quality**

### What it does

An in-app chat where users describe symptoms ("my car makes a grinding noise when I brake") and get possible causes, estimated repair costs, and whether it's safe to keep driving.

### How to build it

**Architecture:**

- Frontend: Chat UI component (message bubbles, text input, send button)
- Backend: New endpoint that proxies to an LLM API (Claude or GPT) with a system prompt and vehicle context

**The real challenge is reliable data.** LLMs have general automotive knowledge but can hallucinate specific repair procedures or costs. Options for grounding:

1. **RAG (Retrieval-Augmented Generation)** — Build a knowledge base from reliable sources and use vector search to inject relevant context into LLM prompts:
   - **NHTSA Technical Service Bulletins** — free, public data via API
   - **OBD-II diagnostic code databases** — open datasets mapping DTCs to descriptions and common causes
   - **Repair cost data** — RepairPal and similar sites publish cost ranges by repair type and region; these could be scraped or licensed
   - **Vehicle owner manuals** — PDFs are widely available from manufacturers; chunk and index them per make/model/year

2. **Pure LLM with strong disclaimers** — Simpler MVP: use Claude API with a system prompt that includes the user's vehicle details (make, model, year, mileage from their CarExpenses profile) and always adds a disclaimer ("This is general guidance, not a professional diagnosis. Consult a certified mechanic."). No custom data needed, but less reliable for specific cost estimates.

3. **Community/curated knowledge** — Over time, allow mechanics or power users to contribute verified troubleshooting content. This is a long-term play.

**Cost implications:** Each chat message costs ~$0.01–0.05 depending on model and context length. For a consumer app, this needs to be gated behind paid plans or have daily message limits.

### Considerations

- Liability risk: Vehicle safety advice is high-stakes. Strong disclaimers are essential, and the chatbot should refuse to give definitive "safe to drive" verdicts for potentially dangerous symptoms
- The chatbot can leverage data already in CarExpenses (vehicle specs, maintenance history, mileage) to personalize responses — this is a genuine differentiator
- Could start as a simple "ask about your car" feature that wraps the user's vehicle context into an LLM call, without building a full RAG pipeline

### Why P4

High effort to do well, significant liability considerations, and ongoing cost per message. The MVP (LLM + vehicle context + disclaimers) is achievable in ~5 days, but making it genuinely reliable requires sustained investment in data curation. Best suited for a later phase when the user base is established.

---

## 19. OBD-II Integration

**Priority: P4 — Low** | **Effort: ~5–7 days**

### What it does

Connects to a Bluetooth OBD-II adapter (ELM327-compatible) plugged into the vehicle's diagnostic port to automatically read mileage, fuel level, engine data, and diagnostic trouble codes (DTCs). Eliminates manual odometer entry and enables rich vehicle health monitoring.

### How to build it

**Prerequisite:** Capacitor native app wrapper must be in place. Web Bluetooth API exists but has very limited browser support (Chrome-only, no iOS Safari) and doesn't support the Bluetooth Classic (SPP) protocol used by most OBD-II adapters. Capacitor's Bluetooth plugin provides reliable cross-platform access.

**Available data from OBD-II:**

- Vehicle speed (PID 0x0D) — for real-time tracking
- Engine RPM (PID 0x0C) — for driving behavior analysis
- Fuel level (PID 0x2F) — percentage of tank remaining, maps directly to CarExpenses' tank percentage feature
- Odometer (PID varies, not standardized) — some vehicles report this, many don't
- Coolant temperature (PID 0x05) — health monitoring
- Diagnostic Trouble Codes (DTCs) — check engine light details
- Fuel consumption rate — for real-time efficiency calculations

**Implementation approach:**

1. Use a Capacitor Bluetooth plugin to discover and connect to ELM327 adapters
2. Implement the ELM327 AT command protocol (text-based, straightforward: send command string, parse response)
3. Create an OBD-II service layer that polls for specific PIDs at configurable intervals
4. Map OBD-II data to CarExpenses entities: fuel level → checkpoint fuel percentage, odometer → travel distance, DTCs → maintenance alerts
5. Dashboard widget showing live vehicle data when connected

**Community libraries:**

- `bluetooth-obd` (npm): Node.js library for ELM327 communication. Can be adapted for the frontend
- `obd-java-api` patterns: well-documented command/response parsing that can be ported to TypeScript
- OBD-II PID databases: open datasets mapping PIDs to human-readable sensor names and value conversion formulas

### Considerations

- OBD-II adapter compatibility varies widely. ELM327 is the de facto standard, but cheap clones have inconsistent behavior. Recommend specific tested adapters in the documentation
- Not all vehicles expose all PIDs — particularly older vehicles and EVs/PHEVs. Gracefully handle missing data
- Battery drain: OBD-II adapters draw power from the vehicle's OBD port. Warn users not to leave them plugged in for extended periods when the vehicle is off
- Bluetooth Classic (SPP) is used by most OBD-II adapters; some newer ones use BLE. The implementation must support both
- This is a power-user feature — most users won't own an OBD-II adapter. Position it as a premium/Business feature

### Why P4

High implementation complexity, requires the Capacitor wrapper, and only serves users who own OBD-II adapters (a small percentage). The data is valuable but can be entered manually with reasonable effort. Best positioned as a premium differentiator for the Business plan after the native app is established.

---

## 20. Add fuel based cost of each travel based on driven distance, recent car consumption and recent car costs

## 21. Add fuel based cost per distance for a trip

## 22. Use API to fetch vehicle details by make, model and year - we need fuel tank details

## 23. Trip Cost Calculator (Gas vs EV) for marketing website, maybe update existing one to support EV vehicles and have a comparison

## Priority Summary

| #   | Feature                                   | Priority | Effort    | Key Dependencies                       |
| --- | ----------------------------------------- | -------- | --------- | -------------------------------------- |
| 1   | **Country-Specific Equipment Prompts**    | **P1**   | 1–2 days  | Existing Glovebox system               |
| 2   | **Vehicle Tasks**                         | **P1**   | 2–3 days  | DONE                                   |
| 3   | **Tire Tracking**                         | **P1**   | 2–3 days  | DONE                                   |
| 4   | **Loan/Lease Tracking**                   | **P1**   | 3–4 days  | DONE                                   |
| 5   | Recurring Revenues                        | **P2**   | 1–2 days  | Existing scheduled expenses system     |
| 6   | Revenue Reports                           | **P2**   | 2–3 days  | Existing data + Recharts               |
| 7   | Data Import                               | **P2**   | 3–5 days  | CSV parsers per competitor format      |
| 8   | Monthly Budget Estimator                  | **P2**   | 2–3 days  | 3+ months of historical data           |
| 9   | User Location → Regional Links            | **P2**   | 2–3 days  | Manual seed data per region            |
| 10  | Service Providers Directory               | **P2**   | 2–3 days  | Google Places API (existing)           |
| 11  | Checklists                                | **P2**   | 3–4 days  | Existing attachment system             |
| 12  | Voice Input + Voice Memos                 | **P2**   | 3–4 days  | MediaRecorder API + Whisper + LLM      |
| 13  | Receipt Scanning                          | **P2**   | 3–5 days  | DONE                                   |
| 14  | Native App Wrapper (Capacitor)            | **P3**   | 3–5 days  | Capacitor + Xcode/Android Studio       |
| 15  | Real-Time Travel Tracking + Time Tracking | **P3**   | 5–7 days  | Feature #16 (Capacitor)                |
| 16  | Map Visualization                         | **P3**   | 3–5 days  | Google Maps or Mapbox API              |
| 17  | Nearby Gas Stations                       | **P3**   | 3–5 days  | Google Places API + fuel price sources |
| 18  | AI Troubleshooting Chatbot                | **P4**   | 5–7 days+ | LLM API + data curation (ongoing)      |
| 19  | OBD-II Integration                        | **P4**   | 5–7 days  | Feature #16 (Capacitor) + BT adapter   |

---

## Implementation Phases

### Phase 1 — Core Value for Everyone (~2–3 weeks)

**Goal**: Make CarExpenses compelling for regular car owners and multi-vehicle families — the largest audience segments. All features work in the existing PWA with no new infrastructure.

| Order | Feature                      | Effort   | Rationale |
| ----- | ---------------------------- | -------- | --------- |
| 1     | Vehicle Equipment (Glovebox) | 1–2 days | DONE      |
| 2     | Vehicle Tasks                | 2–3 days | DONE      |
| 3     | Tire Tracking                | 2–3 days | DONE      |
| 4     | Loan/Lease Tracking          | 3–4 days | DONE      |

**Total: ~12–16 days**

### Phase 2 — Growth & Gig Worker Support (~3–4 weeks)

**Goal**: Round out the feature set for gig workers, add polish that helps with competitor switching, and increase data value.

| Order | Feature                        | Effort   | Rationale                          |
| ----- | ------------------------------ | -------- | ---------------------------------- |
| 5     | Recurring Revenues             | 1–2 days | Enables revenue reports            |
| 6     | Revenue Reports                | 2–3 days | Key for gig workers                |
| 7     | Data Import                    | 3–5 days | Removes switching barrier          |
| 8     | Monthly Budget Estimator       | 2–3 days | Forward-looking value              |
| 9     | User Location / Regional Links | 2–3 days | Contextual intelligence            |
| 10    | Service Providers Directory    | 2–3 days | Value builds over time             |
| 11    | Checklists                     | 3–4 days | Fleet/road-trip value              |
| 12    | Voice Input + Voice Memos      | 3–4 days | Differentiator, good for marketing |
| 13    | Receipt Scanning               | 3–5 days | DONE                               |

**Total: ~22–32 days**

### Phase 3 — Platform Expansion (~3–4 weeks)

**Goal**: Build the native app and ship features that require it. Time tracking and real-time tracking ship together as a cohesive "live travel" feature.

| Order | Feature                                   | Effort   | Rationale                              |
| ----- | ----------------------------------------- | -------- | -------------------------------------- |
| 14    | Native App Wrapper (Capacitor)            | 3–5 days | Foundation for native features         |
| 15    | Real-Time Travel Tracking + Time Tracking | 5–7 days | Requires Capacitor, huge for fleet/gig |
| 16    | Map Visualization                         | 3–5 days | Marketing value, power users           |
| 17    | Nearby Gas Stations                       | 3–5 days | Station finder first, prices later     |

**Total: ~14–22 days**

### Phase 4 — Advanced / Niche (Ongoing)

**Goal**: Power-user features that require significant infrastructure or serve smaller segments.

| Feature                    | Effort    | Notes                                |
| -------------------------- | --------- | ------------------------------------ |
| AI Troubleshooting Chatbot | 5–7 days+ | Defer until user base justifies cost |
| OBD-II Integration         | 5–7 days  | Power users only, requires hardware  |

---

## What This Roadmap Optimizes For

1. **Widest audience first**: Phase 1 features benefit every car owner, not just gig workers or fleets
2. **Multi-user advantage**: Viewer Role, Tasks, and Tire Tracking all shine in shared accounts
3. **PWA-first**: Phases 1 and 2 require no native app infrastructure
4. **Coherent feature bundles**: Time tracking ships with live tracking; revenue features ship together
5. **Marketing momentum**: Each phase delivers something demo-worthy for App Store launch
6. **Competitive positioning**: Data import and multi-user features directly address Fuelio/Drivvo gaps
