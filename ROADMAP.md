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

## 2. Vehicle Tasks (To-Do List)

**Priority: P1 — High** | **Effort: ~2–3 days**

### What it does

A lightweight task list for ad-hoc vehicle-related to-dos that don't fit into the scheduled maintenance system: "buy new wipers," "get headlight alignment checked," "renew parking permit," "clean interior before road trip." Tasks can have due dates, priorities, and can optionally convert to expense or service records upon completion.

### Data model

**New `vehicle_tasks` table:**

| Field                              | Type         | Description                                        |
| ---------------------------------- | ------------ | -------------------------------------------------- |
| id                                 | uuid         | Primary key                                        |
| account_id                         | uuid         | FK to accounts                                     |
| vehicle_id                         | uuid         | FK to vehicles (nullable — for account-wide tasks) |
| title                              | varchar(255) | Task description                                   |
| notes                              | text         | Additional details                                 |
| due_date                           | date         | Optional due date                                  |
| priority                           | enum         | 'low', 'medium', 'high'                            |
| status                             | enum         | 'pending', 'completed', 'cancelled'                |
| completed_at                       | timestamp    | When marked complete                               |
| completed_by_user_id               | uuid         | Who completed it                                   |
| linked_expense_id                  | uuid         | FK to expenses (if converted)                      |
| created_by_user_id                 | uuid         | Who created the task                               |
| created_at, updated_at, deleted_at | timestamps   | Standard audit fields                              |

### Implementation approach

**Backend:**

1. Standard CRUD operations: `vehicleTasks`, `vehicleTask`, `vehicleTaskCreate`, `vehicleTaskUpdate`, `vehicleTaskDelete`
2. Query filters: by vehicle, by status (pending/completed), by due date range, by assignee
3. Batch operations: mark multiple tasks complete, delete completed tasks older than X days

**Frontend:**

1. **Tasks tab on vehicle detail page**: List of pending tasks with due dates and priorities, completed tasks collapsed below
2. **Dashboard widget**: "Upcoming Tasks" card showing tasks due in the next 7 days across all vehicles, sorted by due date
3. **Quick add**: Floating action button or inline input for rapid task creation
4. **Task detail sheet**: Edit task, add notes, mark complete, convert to expense

**Convert to expense workflow:**

When completing a task like "buy new wipers," offer a prompt: "Log this as an expense?" If yes, open the expense form pre-filled with the task title as the description. On save, link the expense to the task (`linked_expense_id`). The task shows "Completed · Logged as expense" with a link to the expense record.

**Multi-user collaboration:**

Tasks inherit the account's sharing model. All users with Driver or higher access can create, view, and complete tasks. A family account might have one person create "rotate tires on the Honda" and another person complete it — this is the multi-user value proposition in action.

### Considerations

- Tasks are intentionally simple and don't replace the service intervals system. Service intervals are for recurring, scheduled maintenance with odometer/time triggers. Tasks are for one-off items
- Don't over-engineer: no subtasks, no complex assignment workflows, no notifications beyond the dashboard widget. Keep it lightweight
- Account-wide tasks (vehicle_id = null) are useful for things like "research new car insurance" that aren't tied to a specific vehicle
- Consider a "suggested tasks" feature based on vehicle age or season ("Check antifreeze levels" in October) — but this is a future enhancement, not MVP

### Integration with existing features

- **Dashboard**: Tasks widget shows pending count and nearest due dates
- **Vehicle detail**: Tasks tab alongside Refuels, Expenses, etc.
- **Expenses**: Two-way link between tasks and expenses
- **Notifications** (future): Push notification for tasks due today (requires native app wrapper)

### Why P1

Simple feature that increases daily engagement — users return to the app to check off tasks, not just to log expenses. The multi-user angle is strong: shared task lists are genuinely useful for families and fleets ("I added a task, you completed it"). The "convert to expense" workflow bridges the gap between planning and tracking. Low implementation effort with existing patterns. Universal appeal: every car owner has things they need to remember to do.

---

## 3. Tire Tracking

**Priority: P1 — High** | **Effort: ~2–3 days**

### What it does

Users track tire sets installed on their vehicles with full details: brand, model, size, type (summer/winter/all-season), installation date, odometer at install, and purchase price. The system calculates wear metrics (km driven on current tires), integrates with service intervals for rotation and replacement reminders, and feeds tire costs into reporting.

### Data model

**New `vehicle_tires` table:**

| Field                              | Type       | Description                                                                      |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| id                                 | uuid       | Primary key                                                                      |
| account_id                         | uuid       | FK to accounts                                                                   |
| vehicle_id                         | uuid       | FK to vehicles                                                                   |
| brand                              | varchar    | Manufacturer (Michelin, Continental, etc.)                                       |
| model                              | varchar    | Tire model name                                                                  |
| size                               | varchar    | Size code (e.g., "225/45R17")                                                    |
| tire_type                          | enum       | 'summer', 'winter', 'all_season', 'performance', 'off_road'                      |
| position                           | enum       | 'all', 'front', 'rear' — for vehicles with staggered setups                      |
| quantity                           | int        | Number of tires (typically 4, but could be 2 for motorcycles or staggered swaps) |
| purchase_date                      | date       | When purchased                                                                   |
| purchase_price                     | numeric    | Total cost for the set                                                           |
| purchase_currency                  | varchar    | Currency code                                                                    |
| installed_at                       | date       | When mounted on vehicle                                                          |
| odometer_at_install                | numeric    | Odometer reading at installation (stored in km)                                  |
| removed_at                         | date       | When removed/replaced (null if current)                                          |
| odometer_at_removal                | numeric    | Odometer at removal                                                              |
| tread_depth_initial                | numeric    | Starting tread depth in mm (optional)                                            |
| dot_code                           | varchar    | DOT manufacturing date code (optional, for age tracking)                         |
| notes                              | text       | Additional notes                                                                 |
| is_current                         | boolean    | Currently installed on vehicle                                                   |
| created_at, updated_at, deleted_at | timestamps | Standard audit fields                                                            |

**New `tire_brands` lookup table** (optional, for autocomplete):

| Field           | Type    | Description |
| --------------- | ------- | ----------- |
| id              | int     | Primary key |
| name            | varchar | Brand name  |
| name_normalized | varchar | For search  |

Seed with common brands: Michelin, Continental, Bridgestone, Goodyear, Pirelli, Dunlop, Hankook, Yokohama, Nokian, BFGoodrich, Toyo, Firestone, Kumho, Cooper, Falken, etc.

### Implementation approach

**Backend:**

1. Create migration for `vehicle_tires` table with proper indexes on `vehicle_id`, `account_id`, and `is_current`
2. CRUD operations via GraphQL: `vehicleTires`, `vehicleTire`, `vehicleTireCreate`, `vehicleTireUpdate`, `vehicleTireDelete`
3. Computed fields in resolver: `distanceDriven` (current odometer minus odometer_at_install), `monthsInstalled`, `costPerKm` (purchase_price / distance_driven)
4. When a new tire set is marked as `is_current`, automatically set `is_current = false` and populate `removed_at` / `odometer_at_removal` on the previous current set

**Frontend:**

1. New "Tires" tab on vehicle detail page, similar to existing tabs (Refuels, Expenses, etc.)
2. List view showing current tires prominently, with history below
3. Tire form with brand autocomplete, size format validation (regex for standard tire size codes), and tire type selector
4. Dashboard card for vehicles with seasonal tires: "Winter tire swap recommended" based on date rules (configurable per region or user preference)

**Service interval integration:**

1. Add tire-related service types to `service_interval_types`: "Tire Rotation", "Tire Replacement", "Tire Pressure Check", "Wheel Alignment"
2. When a tire set is installed, offer to auto-create a rotation interval (e.g., every 10,000 km)
3. Tire replacement reminders can be distance-based (e.g., 60,000 km) or tread-depth-based if the user tracks tread measurements

**Reports integration:**

1. Add "Tires" as a cost category in expense reports (sum of purchase_price from tire records)
2. Per-vehicle tire cost per km metric
3. Tire cost comparison: which brand/model gave the best value (cost per km driven)

### Seasonal tire swap workflow

For users in regions with mandatory or recommended seasonal tire changes (Canada, Russia, Scandinavia, Germany):

1. User logs two tire sets per vehicle: summer and winter
2. "Swap Tires" action: select which set to install, enter current odometer, system handles the `is_current` flag swap
3. Optional: integrate with User Location (Feature #11) to show seasonal swap reminders based on regional norms ("Swap to winter tires by October 15" for Alberta users)

### Considerations

- Tire size validation should accept standard formats: "225/45R17", "225/45/17", "P225/45R17" — normalize on save
- DOT code parsing: the last four digits indicate manufacturing week and year (e.g., "2319" = week 23 of 2019). Could calculate tire age and warn if tires are over 6 years old regardless of tread
- Staggered tire setups (different front/rear sizes, common on sports cars) need the `position` field
- Motorcycle support: quantity of 2, different size format conventions
- Some users track tread depth over time — consider a `tire_measurements` child table for users who want to log periodic tread checks, but this can be a future enhancement

### Why P1

Tires represent a significant recurring expense that users currently can't track properly — often the second-largest vehicle expense after fuel. The seasonal swap workflow is a genuine pain point in cold-climate countries (Canada, Russia, Scandinavia — key target markets) that no competitor handles well. Implementation leverages existing patterns (similar to service intervals) and feeds valuable data into reports. The cost-per-km analysis helps users make informed purchasing decisions. Universal relevance: every vehicle has tires.

---

## 4. Loan/Lease Tracking with Dashboard Countdown

**Priority: P1 — High** | **Effort: ~3–4 days**

### What it does

Users mark a vehicle as financed (loan) or leased, enter key details, and the dashboard shows a payoff countdown, remaining balance, and lease-end date. For loans, it tracks equity buildup over time.

### Data model

Add fields to the vehicle record (or a new `vehicle_financing` table):

| Field                | Type    | Description                          |
| -------------------- | ------- | ------------------------------------ |
| financing_type       | enum    | 'owned', 'loan', 'lease', 'none'     |
| lender_name          | varchar | Bank or leasing company              |
| start_date           | date    | Loan/lease start                     |
| end_date             | date    | Loan maturity or lease end           |
| term_months          | int     | Total term length                    |
| monthly_payment      | numeric | Regular payment amount               |
| payment_currency     | varchar | Currency of payments                 |
| total_amount         | numeric | Loan principal or total lease cost   |
| interest_rate        | numeric | Annual interest rate (loans)         |
| down_payment         | numeric | Initial down payment                 |
| residual_value       | numeric | Lease residual / buyout price        |
| mileage_allowance    | numeric | Annual mileage limit (leases)        |
| mileage_overage_cost | numeric | Cost per km/mile over limit (leases) |
| notes                | text    | Additional terms                     |

### Dashboard integration

- **Loan**: "X payments remaining · $Y,ZZZ left · Paid off by [date]" with a progress bar
- **Lease**: "Lease ends in X months · [date] · Mileage: XX,XXX / YY,YYY km allowance" with mileage status (green/yellow/red based on pace vs. allowance)
- **Mileage pace alert (leases)**: Compare current odometer against prorated mileage allowance. If the user is on pace to exceed their allowance, show a warning with estimated overage cost

### Integration with existing features

- **Scheduled expenses**: Auto-create a monthly payment schedule when financing details are entered
- **Yearly report**: Include total financing payments as a separate line item
- **Expense summary**: Financing costs shown as their own category
- **Glovebox**: Prompt users to store their loan/lease agreement document

### Considerations

- Amortization calculations for loans (principal vs. interest breakdown per payment) are standard formulas — no external API needed
- Lease mileage tracking leverages the existing odometer data from refuels, checkpoints, and travels
- This data is sensitive — ensure it's properly scoped to accountId like everything else

### Why P1

Loan and lease payments are often the single largest vehicle expense — yet most expense trackers ignore them entirely. The dashboard countdown creates daily engagement ("I'm 68% done paying off my car"). Lease mileage warnings are genuinely useful and something people currently track manually in spreadsheets. Implementation is primarily data model + dashboard widget + a bit of math. No external APIs needed. Most vehicle owners have some form of financing — broad relevance.

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

## 6. Revenue Reports

**Priority: P2 — Medium-High** | **Effort: ~2–3 days**

### What it does

Dedicated reporting for vehicle profitability: net profit per vehicle, per trip, per km/mile, and over time. Shows whether a vehicle is actually making money after accounting for all expenses (fuel, maintenance, insurance, loan payments, depreciation).

### How to build it

**Metrics to compute:**

- **Net profit per vehicle**: Total revenues − total expenses (including fuel, maintenance, insurance, financing) for a selected period
- **Profit per trip**: For trips with attached revenue (rideshare, delivery), show revenue − (fuel cost for that distance + prorated daily expenses)
- **Profit per distance**: Net revenue per km/mile driven — the key metric for gig workers deciding whether a gig is worth it
- **Break-even analysis**: At current rates, how many km/trips until the vehicle pays for itself this month
- **Trend charts**: Monthly profit/loss over time with expense and revenue lines

**Implementation approach:**

1. Add a "Profitability" tab to the existing reports page
2. Query existing revenues and expenses by vehicle and date range — all data already exists in the database
3. Use Recharts (already in the stack) for profit/loss line charts and bar breakdowns
4. Include financing costs from loan/lease data (Feature #6) when available
5. Export to CSV/PDF for tax reporting

### Considerations

- Distance-based calculations need reliable odometer data — warn if odometer gaps exist
- Multi-currency scenarios: convert all amounts to the user's home currency for aggregation
- Gig workers may want to see per-platform breakdown (Uber vs. Lyft vs. DoorDash) — this could be supported via revenue categories or tags

### Why P2

Revenue tracking without profitability reports is only half the story. Gig workers making financial decisions ("Should I keep driving for this platform?") need clear profit-per-km data. All the underlying data already exists — this is a reporting/UI layer on top. Pairs naturally with recurring revenues (Feature #7).

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

## 13. Receipt Scanning for Refuels and Expenses

**Priority: P2 — Medium-High** | **Effort: ~3–5 days**

### What it does

User snaps a photo of a gas station receipt. The app extracts station name, date, fuel volume, price per unit, total cost, and payment method, then pre-fills the refuel form.

### How to build it

**OCR/Parsing options (from simplest to most powerful):**

1. **Claude/GPT Vision API (recommended for MVP)** — Send the receipt image directly to a multimodal LLM. Prompt it to extract structured JSON with fields matching the refuel form. Pros: excellent accuracy on varied receipt formats, handles multiple languages, no specialized OCR service needed. Cost: ~$0.01–0.03 per receipt.

2. **Dedicated Receipt OCR APIs** — Services like Veryfi, Taggun, Mindee, and Klippa offer specialized receipt parsing with 95–99% accuracy. They return structured data (vendor, date, line items, tax, total). Veryfi specifically mentions fleet/fuel receipt support. Cost: $0.05–0.15 per receipt depending on volume and provider.

3. **Google Vision OCR + custom parsing** — Use Google Cloud Vision for raw text extraction, then parse with regex or LLM. More control but more development effort.

**Recommended approach (Claude Vision):**

1. User takes photo or selects from gallery
2. Frontend compresses image and uploads to backend
3. Backend sends image to Claude API with prompt: "Extract from this fuel receipt: station name, address, date, time, fuel type, volume (liters or gallons), price per unit, total price, currency. Return as JSON."
4. Backend maps JSON to refuel form fields
5. Frontend pre-fills form; user reviews and submits

### Extending to expenses

The same pipeline works for general expense receipts (mechanic invoices, parking receipts, car wash receipts). The prompt just needs to extract different fields. This makes the feature reusable across all expense types.

### Considerations

- Receipt quality varies wildly (faded thermal paper, crumpled, poorly lit) — LLM vision handles this better than traditional OCR
- Multi-currency receipts (traveling users) need currency detection — LLMs handle this naturally
- Storage: receipt images can be attached as documents (existing attachment system)
- Gate behind paid plans to manage API costs, or allow a limited number of scans on free plan
- Privacy: receipt images may contain payment card numbers — consider masking or not storing raw images after extraction

### Why P2

Directly reduces the biggest friction point (manual data entry for refuels). Gas station receipts have a fairly consistent structure, making extraction reliable. The Claude Vision approach keeps it simple — no new vendor dependency. Users who refuel 2–4 times per month will notice the time savings immediately.

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

## Priority Summary

| #   | Feature                                   | Priority | Effort    | Key Dependencies                       |
| --- | ----------------------------------------- | -------- | --------- | -------------------------------------- |
| 1   | **Country-Specific Equipment Prompts**    | **P1**   | 1–2 days  | Existing Glovebox system               |
| 2   | **Vehicle Tasks**                         | **P1**   | 2–3 days  | None                                   |
| 3   | **Tire Tracking**                         | **P1**   | 2–3 days  | Service intervals integration          |
| 4   | **Loan/Lease Tracking**                   | **P1**   | 3–4 days  | None (math only)                       |
| 5   | Recurring Revenues                        | **P2**   | 1–2 days  | Existing scheduled expenses system     |
| 6   | Revenue Reports                           | **P2**   | 2–3 days  | Existing data + Recharts               |
| 7   | Data Import                               | **P2**   | 3–5 days  | CSV parsers per competitor format      |
| 8   | Monthly Budget Estimator                  | **P2**   | 2–3 days  | 3+ months of historical data           |
| 9   | User Location → Regional Links            | **P2**   | 2–3 days  | Manual seed data per region            |
| 10  | Service Providers Directory               | **P2**   | 2–3 days  | Google Places API (existing)           |
| 11  | Checklists                                | **P2**   | 3–4 days  | Existing attachment system             |
| 12  | Voice Input + Voice Memos                 | **P2**   | 3–4 days  | MediaRecorder API + Whisper + LLM      |
| 13  | Receipt Scanning                          | **P2**   | 3–5 days  | Claude Vision API or OCR service       |
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

| Order | Feature                      | Effort   | Rationale                              |
| ----- | ---------------------------- | -------- | -------------------------------------- |
| 1     | Vehicle Equipment (Glovebox) | 1–2 days | Universal value, trivial effort        |
| 2     | Vehicle Tasks                | 2–3 days | Engagement driver, multi-user friendly |
| 3     | Tire Tracking                | 2–3 days | Major expense, seasonal workflow       |
| 4     | Loan/Lease Tracking          | 3–4 days | High engagement, no external deps      |

**Total: ~12–16 days**

### Phase 2 — Growth & Gig Worker Support (~3–4 weeks)

**Goal**: Round out the feature set for gig workers, add polish that helps with competitor switching, and increase data value.

| Order | Feature                        | Effort   | Rationale                           |
| ----- | ------------------------------ | -------- | ----------------------------------- |
| 5     | Recurring Revenues             | 1–2 days | Enables revenue reports             |
| 6     | Revenue Reports                | 2–3 days | Key for gig workers                 |
| 7     | Data Import                    | 3–5 days | Removes switching barrier           |
| 8     | Monthly Budget Estimator       | 2–3 days | Forward-looking value               |
| 9     | User Location / Regional Links | 2–3 days | Contextual intelligence             |
| 10    | Service Providers Directory    | 2–3 days | Value builds over time              |
| 11    | Checklists                     | 3–4 days | Fleet/road-trip value               |
| 12    | Voice Input + Voice Memos      | 3–4 days | Differentiator, good for marketing  |
| 13    | Receipt Scanning               | 3–5 days | Friction reduction, API cost gating |

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
