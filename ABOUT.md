# CarExpenses

**One app for every car, every driver, every cost.**

CarExpenses is a mobile-friendly Progressive Web Application (PWA) that helps you understand and manage the true cost of vehicle ownership. Track fuel, maintenance, trips, tires, tasks, documents, and every other vehicle-related expense — and share it all with family members, co-drivers, or your team.

Whether you're managing one family car or a small fleet, CarExpenses gives everyone a single place to log, review, and stay on top of what your vehicles need. Free to start. Works on any device. No app store required.

An internet connection is required.

---

## Who CarExpenses Is For

**Multi-Vehicle Families**
Parents sharing cars with teen drivers. Partners splitting household vehicle costs. Families who want one shared view of every car's expenses, maintenance, and documents — without spreadsheet chaos.

**Gig Economy Workers**
Delivery drivers, rideshare operators, and contractors who need every deductible mile and expense documented. Track business vs. personal use, link revenue to trips, and stay audit-ready for IRS/CRA.

**Small Fleet Operators**
Businesses with 5–40 vehicles who need affordable fleet oversight. Role-based access lets owners maintain control while drivers log their own fuel, expenses, and trips.

**Car Enthusiasts & Meticulous Owners**
Drivers who want a complete vehicle history — from purchase to eventual sale. Checkpoints, tire records, maintenance logs, and documents that preserve (and prove) your vehicle's story.

**Anyone Who Shares a Vehicle**
Roommates splitting a car, couples with one vehicle, parents lending a car to a college student — if more than one person drives it, CarExpenses keeps everyone on the same page.

---

## Vehicle Management

Add and manage multiple vehicles (quantity depends on subscription plan):

- **Basic info**: Display name, make, model, year, color, VIN
- **Specifications**: Trim, transmission type, engine type and displacement, fuel tank volume
- **Odometer**: Initial mileage reading with support for metric (km) or imperial (miles) units
- **Purchase details**: Price, date, seller information
- **Media**: Vehicle photo and attached documents (registration, title, etc.)
- **Notes**: Free-form notes field
- **Designated Drivers**: Assign users to vehicles as drivers or owners so only they can add records

---

## Dashboard

The dashboard is your home screen — a single view of everything that needs your attention across all vehicles.

**Fleet summary bar** (multi-vehicle accounts):

- Displays combined expense totals across all vehicles for the current month
- Swipe left or right to browse previous months and compare spending over time
- Gives an at-a-glance sense of total vehicle costs without opening reports

**Vehicle cards:**

Each vehicle appears as a card with quick-action buttons for the most common tasks:

- **Add expense**: Log a maintenance cost, parking fee, fine, or any other expense
- **Add refuel**: Record a fill-up with price, volume, and location
- **Add checkpoint**: Capture a point-in-time vehicle snapshot
- **Start a travel**: Begin tracking a new trip

**Alerts & reminders:**

- **Document alerts**: Expired or soon-to-expire documents from the Digital Glove Box (insurance policies, registrations, driver licenses) so you never get caught off guard
- **Equipment alerts**: Expired or soon-to-expire safety equipment from the Digital Glove Box (first aid kits, fire extinguishers, breathalyzers) so you stay compliant with roadside inspection requirements
- **Service reminders**: Upcoming maintenance that's due or overdue services that haven't been recorded yet — oil changes, tire rotations, inspections, and other scheduled intervals

**Recent activity:**

- A feed of the latest entries across all vehicles — expenses, refuels, checkpoints, and travels — so you can quickly review what's been logged and by whom

---

## Refuel Tracking

Log every fill-up with comprehensive details:

- **Reading**: Odometer and date/time
- **Fuel**: Volume purchased, fuel tank level after refueling (0–100% for consumption calculations)
- **Pricing**: Price per unit and total cost
- **Multi-currency**: Enter price in a foreign currency when traveling, with conversion to home currency
- **Location**: Gas station name and address (with Google Places autocomplete)
- **Weather conditions**: Automatically captured when location coordinates are available (premium feature)
- **Attachments**: Photos or scans of receipts
- **Tags**: Custom tags for flexible categorization and reporting
- **Notes**: Additional details

---

## Expense Tracking

Record maintenance, repairs, travel costs, and all other vehicle-related expenses:

- **Reading**: Odometer and date/time
- **Fuel tank level**: Current tank percentage (0–100%)
- **Expense kind**: Oil change, tire rotation, filter change, part replacement, car wash, parking, toll, towing, fine, insurance payment, registration, lodging, meals/food, ferry, border/visa fees, equipment rental, and more
- **Description**: Short summary and detailed notes
- **Cost breakdown**: Parts, labor, fees, taxes, and total
- **Multi-currency**: Foreign currency support with home currency conversion
- **Location**: Service provider name and address (with Google Places autocomplete)
- **Weather conditions**: Automatically captured when location coordinates are available (premium feature)
- **Attachments**: Invoices, photos, PDFs
- **Tags**: Custom tags for flexible categorization and reporting
- **Linked travel**: Optionally associate an expense with a specific travel record for per-trip cost tracking

**Travel-related expense categories** make it easy to capture the full cost of a road trip or business journey — not just fuel and maintenance, but also hotel stays, meals, tolls, ferry crossings, and border fees. Link these expenses to a travel record to see accurate per-trip totals.

---

## Scheduled Expenses

Automate recurring vehicle costs that follow a predictable pattern — insurance premiums, loan payments, parking permits, registration renewals, and other regular expenses you shouldn't have to enter manually every time.

**Schedule configuration:**

- **Vehicle & expense kind**: Select the vehicle and expense type (any kind except refuels)
- **Schedule type**: Weekly, monthly, yearly, or one-time
  - _Weekly_: Select one or more days of the week (Monday through Sunday)
  - _Monthly_: Select one or more days of the month (1st, 15th, last, etc.)
  - _Yearly_: Select one or more dates (e.g., January 15, June 15)
  - _One-time_: Select a specific future date
- **Date range**: Set a start date and optional end date (no end date = runs indefinitely)
- **Cost template**: Define the amount with full cost breakdown (parts, labor, fees, taxes, total) — each generated expense inherits these values
- **Currency**: Specify payment currency or default to your home currency
- **Details**: Place name, location, notes, and comments carried over to each generated expense

**Key capabilities:**

- **Backfill past expenses**: Create a schedule with a past start date and generate all missed entries at once — useful when setting up tracking for payments you've already been making
- **Bulk update on amount change**: If you adjust the scheduled amount and regenerate, all previously created expenses from that schedule are updated to reflect the new values
- **Edit individual expenses**: Any expense created by a schedule can be edited independently if a particular payment differed from the template
- **Plan limits**: Free plan includes 2 scheduled expenses; higher plans allow more

**Common use cases:**

- Monthly insurance premiums
- Bi-weekly or monthly loan/lease payments
- Annual registration or inspection fees
- Weekly or monthly parking permits
- Quarterly roadside assistance memberships
- Any fixed-cost vehicle expense on a repeating schedule

---

## Checkpoints

Capture point-in-time vehicle snapshots for any significant moment in your vehicle's life:

- **Reading**: Odometer reading and date/time
- **Fuel tank level**: Current tank percentage (0–100%)
- **Location**: Where the checkpoint occurred (with Google Places autocomplete)
- **Weather conditions**: Automatically captured when location coordinates are available (premium feature)
- **Notes and observations**: Free-form text for any details
- **Document attachments**: Photos, PDFs, and other files
- **Tags**: Custom tags for categorization

**Use cases for checkpoints:**

- Mileage milestones (50,000 km, 100,000 km, etc.)
- Minor incidents or accidents
- Vehicle condition notes
- Pre-sale or post-purchase documentation
- Anchoring odometer/fuel state to correct data drift
- Any event worth recording in your vehicle's history

---

## Vehicle Financing

Track loan and lease details for your vehicles and see at a glance where you stand — payments remaining, balance owed, mileage pace, and projected costs.

**Financing record includes:**

- **Financing type**: Loan or Lease
- **Lender**: Bank, credit union, or leasing company name
- **Agreement number**: Loan or lease account number
- **Term**: Start date, end date, and term length in months
- **Financials**: Total amount (principal or lease cost), annual interest rate, down payment, and financing currency
- **Lease-specific fields**: Residual/buyout value, annual mileage allowance (km or mi), and per-unit overage cost
- **Notes**: Additional terms or conditions
- **Linked payment schedule**: Automatically creates a recurring expense schedule for loan or lease payments — weekly, monthly, yearly, or one-time

**Computed insights (loans):**

- Payments remaining and estimated remaining balance
- Term completion percentage with visual progress ring
- Cost breakdown: principal, total interest, and down payment shown as an animated stacked bar with exact amounts and percentages
- Estimated monthly payment calculated from loan amortization formula

**Computed insights (leases):**

- Payments remaining and term completion percentage
- Cost breakdown: depreciation, finance charges, and down payment
- Estimated monthly payment calculated from lease formula (depreciation + money factor)
- **Mileage tracking**: Actual distance driven vs. total mileage allowance, derived from odometer readings across refuels, expenses, checkpoints, and travels
- **Mileage pace status**: Under pace, on pace, or over pace (±5% tolerance against linear allowance schedule) — color-coded for quick scanning
- **Projections**: Annual mileage rate, projected total mileage at lease end, projected overage distance, and projected overage cost
- **Data confidence indicator**: Shows the number of odometer readings backing the projection, with a note when data is limited

**Integration with existing features:**

- **Scheduled expenses**: Payment schedule auto-created from financing terms — supports all schedule types (weekly, monthly, yearly, one-time) with full cost breakdown template
- **Odometer data**: Mileage tracking pulls from all record types that capture odometer readings, requiring no extra data entry
- **Multi-currency**: Financing amounts and payment schedules support any currency with home currency conversion
- **Role-based access**: Follows the same Owner/Admin/Driver/Viewer permissions as all other features

---

## Service Intervals & Reminders

Configure recurring maintenance schedules to receive timely notifications:

- **Maintenance services**: Oil changes, tire rotations, brake inspections, etc.
- **Recurring expenses**: Car washes, insurance renewals, registration fees
- **Triggers**: Distance-based, time-based, or both (whichever comes first)
- **Notifications**: Alerts when service is due or approaching

---

## Travel Tracking

Log trips for mileage records, business expense reports, or personal tracking:

1. **Start travel**: Enter date/time, starting odometer, departure location, and trip purpose
2. **Add travel points**: Record intermediate waypoints with odometer readings, location, and notes
3. **End travel**: Close the trip to calculate total distance and duration
4. **Trip summary**: View all expenses and revenue linked to the trip — including fuel, tolls, lodging, meals, and other travel-related costs — with subtotals by category
5. **Tags**: Assign custom tags for reporting and organization
6. **Trip categorization**: Assign trip type (business, personal, medical, charity, other) for tax deductions (IRS/CRA)

**Travel features:**

- **Multiple waypoints**: Add as many intermediate stops as needed
- **Map visualization**: View your entire route with all waypoints on Google Maps
- **Location detection**: Optionally pre-fill coordinates based on your current location
- **Weather tracking**: Weather conditions captured for travel start, waypoints, and end points when coordinates are available (premium feature)
- **In-app travel widget**: Quickly add waypoints or stop trips from any screen in the app — no need to navigate away from what you're doing
- **Linked expenses**: Associate refuels, meals, tolls, lodging, ferry crossings, and other costs directly to the trip for accurate per-trip totals
- **Linked revenue**: Connect earnings to specific trips for profitability tracking

---

## Digital Glove Box

Store important vehicle documents and track safety equipment — all in one place.

**Documents:**

- Insurance policies with expiration date tracking
- Registration and title documents
- Warranty information
- Road assistance card (membership number, phone number, expiration date)
- Driver license and ID documents
- Any other vehicle or driver-related paperwork
- Expiration reminders before documents lapse

**Vehicle Equipment:**

Track physical safety equipment and accessories stored in your vehicle, with expiration reminders where applicable:

- First aid kit (with expiry tracking)
- Fire extinguisher (with expiry tracking)
- Warning triangle
- Reflective vest
- Breathalyzer (with expiry tracking)
- Tow rope, jumper cables, spare tire / repair kit
- Ice scraper, tire chains
- Any other equipment you keep in your vehicle

Attach photos to equipment items (e.g., a photo of the first aid kit label showing its expiration date). Equipment with expiration dates triggers the same reminder system used for documents, so you're alerted before anything lapses.

**Country-specific equipment prompts:** Based on your location, CarExpenses can suggest required safety equipment for your region. For example, drivers in Russia are prompted to add a first aid kit, fire extinguisher, and warning triangle; drivers in Germany see first aid kit, warning triangle, and reflective vest. This helps you stay compliant with local roadside inspection requirements.

---

## Vehicle Recall Report

Check for open safety recalls on your vehicles using official government databases. The recall report page shows all known recalls for each vehicle based on its make, model, and year (or VIN when available).

**Current capabilities:**

- **Recall lookup**: Automatically checks the NHTSA Recalls API (United States) and Transport Canada Vehicle Recalls Database API (Canada) for open safety recalls
- **Recall details**: View campaign number, affected component, summary, consequence description, and remedy instructions for each recall
- **Dismiss recalls**: Mark recalls as dismissed if they don't apply to your specific vehicle
- **Resolve recalls**: Mark recalls as resolved with optional comments (e.g., "Completed at dealer on Jan 15" or "Part replaced under warranty")
- **Per-vehicle view**: See all recalls organized by vehicle for easy review

**Data sources:**

- **NHTSA Recalls API (United States)** — Free, no API key required. Supports lookup by VIN or by make/model/year
- **Transport Canada Vehicle Recalls Database API (Canada)** — Free, covers all historical recalls

**Planned enhancements:**

- Dashboard indicator when new recall data is available for any of your vehicles
- Email notifications when new recalls are published (pending mass email sending infrastructure)

---

## Tire Management

CarExpenses includes a comprehensive tire tracking system designed to help vehicle owners manage their tire inventory, monitor tire health, and keep accurate service records.

### Tire Sets & Items

Each vehicle can have multiple tire sets (e.g., "Summer 2024," "Winter Nokians"), and each set contains individual tire items that track specific details like brand, model, size, DOT manufacturing code, tread depth, and position on the vehicle. This structure supports real-world scenarios where tires are partially replaced — for example, two worn front tires swapped for a different brand while keeping the rears.

### Lifecycle Tracking

Tire sets follow a clear lifecycle with three statuses: **Active** (currently installed on the vehicle), **Stored** (off the vehicle, in storage), and **Retired** (disposed of, sold, or worn out). The system enforces that each vehicle can only have one active tire set at a time, preventing data conflicts.

### Seasonal Swap

A dedicated swap workflow handles the seasonal tire change process. When swapping, the system automatically moves the current active set to storage, installs the selected stored set, records the odometer reading, accumulates mileage on the outgoing tires, and optionally creates a service expense record — all in a single operation. Users can specify the storage location for the outgoing set and log the service shop details with address auto-detection.

### Mileage Tracking

The system tracks tire mileage across multiple installation periods. Each time tires are removed from a vehicle, the driven distance is calculated from the odometer delta and accumulated into the tire's lifetime total. For used tires or tires that came with the vehicle, users can enter an estimated initial mileage. Live mileage for currently installed tires is computed on the fly from the vehicle's current odometer reading. All values are stored internally in kilometers and converted to the car's mileage unit and the user's preferred distance unit for display.

### Warning System

A daily background job evaluates every tire set and item across all accounts, computing warning flags as a bitmask for efficient querying and display:

- **Age warnings** — parsed from the DOT manufacturing code on each tire, flagged at 70% and 100% of the configurable age limit (default: 10 years)
- **Mileage warnings** — based on total lifetime mileage against the mileage warranty threshold (default: 80,000 km), flagged at 70% and 100%
- **Tread depth warnings** — compared against a configurable minimum tread limit (default: 2.0 mm), with warning at 130% of the limit and critical at the limit itself
- **Stale tread measurement** — flagged when the last tread depth reading is older than 12 months
- **Extended storage** — flagged when a stored set has been sitting for an extended period

Users can override the default thresholds (mileage warranty, age limit, tread limit) per tire set. Warning indicators appear throughout the interface — on set cards, item rows, and in the edit drawer — using color-coded badges and border accents to draw attention to tires that need inspection or replacement.

### Expense Integration

Tire operations integrate directly with the expense tracking system. Users can create a purchase expense when adding a new tire set or an additional expense when updating one (e.g., partial replacement). Swap operations automatically generate a service expense record. Expenses are linked both at the set level and at the individual item level, so users can see exactly which tires were purchased in each transaction. A mini expense timeline on each tire set card shows recent service history with totals.

### Interface

The tire management UI follows the application's mobile-first design with swipeable cards for quick actions on mobile, collapsible form sections to reduce clutter, animated list transitions, and auto-location detection for service records. The edit drawer supports inline management of tire items with expandable/collapsible cards, real-time quantity calculation, and contextual fields that appear based on tire condition (e.g., initial mileage input only shows for used tires).

---

# Vehicle Tasks — Feature Description

## Keep Track of Everything Your Vehicles Need

Life with a car means a never-ending list of things to remember: renew the registration, swap to winter tires, buy replacement wipers, schedule that inspection. CarExpenses now includes a built-in task manager designed specifically for vehicle owners, so nothing falls through the cracks.

### Per-Vehicle To-Do Lists

Create tasks for any vehicle in your garage — or for your account as a whole. Each task can have a due date, priority level (low, medium, high), and a category to keep things organized: purchases, appointments, seasonal prep, repairs, administrative items, and more.

### Smart Recurrence

Some things come back every year — registration renewals, seasonal tire swaps, insurance deadlines. Set tasks to repeat on a weekly, monthly, or yearly schedule. When you complete a recurring task, the next occurrence is automatically created with the correct due date, so you never have to remember to re-add it.

### Dashboard at a Glance

Your dashboard highlights the tasks that need attention right now. Overdue items surface at the top in red, followed by tasks due soon and those already in progress. You'll always know what needs doing next without digging through lists.

### Shared Task Lists

In a shared account — whether it's a family or a small fleet — anyone with Driver access or above can create, view, and complete tasks. Assign a task to a specific person so everyone knows who's responsible. One family member adds "rotate tires on the Honda," another completes it. That's real collaboration around vehicle care.

### Simple Workflow: To Do → In Progress → Complete

Move tasks through a straightforward three-step workflow. Tap the checkbox to mark a task complete, or set it to "In Progress" when you've started working on it. Completed tasks stay in your history with a record of who completed them and when.

### Priorities and Due Dates

Flag urgent items as high priority so they stand out with a colored border and badge. Set due dates to get visual countdowns — "3 days left," "due tomorrow," or "overdue by 2 days" — right on the task card.

---

# Parking Sessions

Never forget where you parked, never lose track of your meter, and never miss a parking expense.

## The Problem

Parking is one of the most frequent vehicle expenses — yet it's easy to forget the exact spot, lose track of how much time is left on the meter, or skip logging the cost altogether. Parking Sessions solves all three.

## What It Does

**Remember where you parked.** When you start a parking session, the app asks permission to use your device's location to pinpoint where you are (you can also type in an address manually). Your parking spot is saved with GPS coordinates and address so you can always find your way back.

**Know exactly how much time you have left.** If you entered a parking duration — whether paid or free with a time limit — a persistent banner appears across every page of the app showing a live countdown. When time is running low, the banner shifts to a warning state, and once your time has expired, you'll see exactly how long you've been over. For parking with no set duration, the banner simply shows how long you've been parked.

**Walk back to your car with one tap.** From the active session view, open your parked location directly in Google Maps to get walking directions from wherever you are straight to your vehicle.

**Log parking expenses without the hassle.** When you end a session and enter a price, a parking expense is automatically created and linked to the session — with the correct vehicle, date, amount, and location already filled in. No price? No expense. The session is simply saved as a free parking record.

## How It Works

**Starting a session.** Tap the parking button on your vehicle card. The app requests your location (or you enter an address), shows a map preview, and lets you optionally add how long you paid for, the price, and a note about your spot. Confirm and you're parked.

**While you're parked.** The active session banner is visible on every page. Tap it to see full details including the map, address, timer, and your notes. If you extended your parking time — whether by feeding the meter or simply deciding to stay longer at a time-limited free spot — tap "Add Time" to update the session so the countdown stays accurate. This is a manual update to keep your records in sync, not a connection to any external parking service.

**Ending a session.** When you're back at your car, end the session. Review the start and end times, enter or confirm the final price, and save. If you entered a price, a linked parking expense is created automatically.

**Parking history.** A dedicated page shows all your past parking sessions — filterable by vehicle and date range — with summary stats on total spend, average duration, and your most-visited locations. You can edit any past session or manually create one for parking you forgot to log at the time.

## Key Details

- **One active session per vehicle** — each of your vehicles can have its own active session running at the same time
- **Location permission optional** — the app works best with GPS access, but you can always enter an address manually
- **Free parking friendly** — use it purely as a "where did I park?" tool without entering any price
- **Automatic expense creation** — enter a price when ending a session and a parking expense is created and linked automatically
- **Link to your travels** — associate a parking session with a travel record so parking costs are tracked as part of a trip
- **Full history with manual entry** — browse and edit past sessions, or create new ones after the fact
- **Multi-user support** — account members with the appropriate role can manage parking sessions for vehicles they have access to

---

## Revenue Tracking

Track income generated through vehicle usage, with optional linkage to trips for accurate profit and tax reporting.

Revenue entries can exist independently or be associated with a specific travel record.

**Revenue record includes:**

- **Date/Time**: When the revenue was earned or received
- **Amount**: Gross earned amount
- **Currency**: Multi-currency support with conversion to home currency
- **Revenue type**: Delivery, ride, service call, rental, mileage reimbursement, bonus, other (extensible)
- **Description & notes**: Short summary and detailed context
- **Attachments**: Invoices, payout statements, receipts, contracts
- **Tags**: Custom tags (e.g., Business, Taxable, Reimbursed, Cash, Platform:Uber)
- **Linked travel** (optional): Associate revenue with a specific travel to calculate per-trip or per-distance profitability
- **Vehicle**: Selected manually or automatically derived from linked travel

**Reporting & Analytics (Revenue-aware):** (_coming soon_)

- Revenue per vehicle
- Revenue per travel
- Revenue per distance (e.g., $/km or $/mile)
- Net profit calculations (revenue minus expenses)
- Yearly and monthly income summaries
- Export-ready records for accounting and tax filing (IRS/CRA)

---

# Receipt Scanning

## Overview

CarExpenses includes a built-in receipt scanner powered by AI vision technology. Instead of manually entering expense details, users can simply take a photo of a receipt and the app will automatically extract the relevant information and pre-fill the form — saving time and reducing data entry errors.

## How It Works

1. **Tap "Scan Receipt"** on any vehicle card on the dashboard
2. **Take a photo** using the full-screen camera view, or **choose an existing image** from the phone's gallery or computer's files, then preview and confirm
3. **Wait a few seconds** while the AI analyzes the image (a progress overlay shows each step)
4. **Review the pre-filled form** — the app opens the correct form (refuel or expense) with all extracted data already populated
5. **Make any adjustments** and save

## What Gets Recognized

### Fuel Receipts

Gas station receipts are automatically classified as refuels. The scanner extracts:

- Station name and address
- Date and time of purchase
- Fuel volume and unit (liters or gallons)
- Price per unit
- Fuel grade (Regular, Premium, Diesel, etc.)
- Total cost, tax, and fees
- Currency
- Payment method

### General Expense Receipts

All other receipts are classified as expenses and automatically assigned to the most appropriate category. Supported receipt types include:

- **Maintenance & repairs** — oil changes, brake work, tire services, mechanic invoices with labor and parts breakdowns
- **Car washes & detailing**
- **Parking** — with duration, entry/exit times, and zone information
- **Traffic fines & tickets** — including violation type, ticket number, and due date
- **Tolls** — with road name, entry and exit points
- **Insurance** — policy number and coverage period
- **Food & drinks** — restaurants, coffee shops, groceries (auto-classified by time of day)
- **Lodging** — hotels, hostels, vacation rentals
- **Entertainment** — attractions, events, tours
- **Transportation** — ferries, transit, taxis, rental vehicles
- **Travel fees** — border fees, roaming, laundry, tips

## Multi-Language Support

The scanner recognizes receipts in any language — English, French, Russian, Spanish, German, Chinese, and more. Vendor names and addresses are preserved in their original language.

## Automatic Currency Detection

The scanner detects the currency from symbols, country context, or text on the receipt. For North American receipts, it distinguishes between CAD and USD based on location clues like province/state or postal code format.

## Location Detection

When a receipt includes an address or business name, the app automatically geocodes the location so it's saved with the expense record.

## Receipt Image Storage

The original receipt photo is automatically uploaded and attached to the expense record as a document, so users always have a copy for their records or tax purposes.

## Smart Details in Comments

Information that doesn't fit into standard form fields — such as receipt numbers, payment card last four digits, pump numbers, work order numbers, staff names, and itemized breakdowns — is compiled into the comments field for reference.

## Usage Limits

Receipt scanning is a metered feature tied to the user's subscription plan, with a monthly scan allowance. If a scan fails (blurry image, unrecognizable document), the scan count is not charged.

---

## Checklists (_coming soon_)

Create structured, repeatable checklists to enforce consistency, safety, and compliance before or after vehicle usage.

Checklists can be attached to travels, vehicles, or triggered manually.

**Checklist capabilities:**

- Checklist types: Pre-travel, Post-travel, Maintenance, Custom (user-defined)
- Checklist items: Yes/No, Pass/Fail, Notes-required
- Attachments per item: Photos or documents as proof (e.g., tire condition, damage photos)
- Required vs optional items
- Reusable templates: Create once, reuse across vehicles or drivers

**Assignment & Execution:**

- Assign checklists to specific vehicles, drivers, or travel types
- Enforce completion: Block travel start until required pre-travel checklist is completed
- Require post-travel checklist before closing a trip
- Timestamped completion records with user attribution

**Use cases:**

- Safety verification before long trips
- Damage inspection before and after vehicle usage
- Business compliance for shared or fleet vehicles
- Driver accountability in multi-user setups
- Personal routines (e.g., "Did I lock the car?", "Check child seat")

---

## Tags

Create custom tags to organize and filter data:

- Assign tags to expenses, refuels, checkpoints, travels, and revenues
- Use tags in reports for flexible grouping and analysis
- Filter any list or report by one or multiple tags
- Examples: "Business", "Vacation", "Tax Deductible", "Warranty Repair", "Highway", "City"

---

## Reports & Analytics

Gain insights into vehicle costs and usage with detailed, filterable reports.

### Fuel Economy Report

Understand how your vehicles consume fuel:

- **Key metrics**: Average consumption (L/100km, MPG), total fuel volume, total distance, total cost, cost per km/mile, average fuel price with min/max range
- **Trend analysis**: See if your efficiency is improving, stable, or degrading over time
- **Period comparison**: Compare against previous period, previous month, same month last year, or custom date range
- **Weather correlation**: Understand how temperature and conditions affect your fuel consumption (requires weather data from premium plans)
- **Tag-based breakdown**: Compare consumption by tags (e.g., city vs highway driving, summer vs winter)
- **Per-vehicle breakdown**: When tracking multiple vehicles, see individual performance
- **Data quality indicators**: Automatic detection of partial fills, odometer anomalies, and data gaps with clear flags when calculations may be less reliable
- **Filtering**: By date range, vehicle, fuel grade, or tags
- **Export**: CSV export for custom analysis

### Expense Summary Report

Get a complete overview of all vehicle expenses:

- **Summary metrics**: Total cost, refuels total, other expenses total, daily average, mileage, fuel volume, consumption, cost per km/mile
- **Expense distribution**: Visual chart showing where your money goes
- **Breakdown by category**: Administrative & Fees, Comfort & Cleaning, Maintenance & Repairs, Safety & Compliance, Travel Costs, etc. with amounts, record counts, and percentage shares
- **Breakdown by type**: Detailed view by specific expense type (oil change, parking, car wash, traffic ticket, lodging, meals, tolls, etc.)
- **Filtering**: By date range, vehicle, or tags

### Yearly Report

See your entire year at a glance:

- **Annual summary**: Total cost, refuels, other expenses, total mileage, total fuel volume
- **Monthly expenses chart**: Visual bar chart showing spending by month with separate colors for refuels vs other expenses
- **Monthly breakdown table**: Month-by-month detail including mileage, refuel/expense counts, fuel volume, costs, and totals
- **Monthly budget estimator**: Based on historical data, shows average monthly cost for each vehicle (fuel + maintenance + insurance + other) to help plan future expenses (_coming soon_)
- **Filtering**: By year, vehicle, or tags

### Travel Report

Track your trips for tax compliance and mileage deductions (IRS/CRA):

- **Summary metrics**: Total distance in period, tracked trips distance, business use percentage, trips count by type
- **Business use calculation**: Automatically calculates what percentage of your total driving was for business, medical, charity, or other deductible purposes
- **Two deduction methods**:
  - **Standard Mileage Method (IRS)**: Calculates deductions using official IRS rates ($0.67/mile business, $0.21/mile medical, $0.14/mile charity for 2024) or CRA tiered rates ($0.70/km first 5,000 km, $0.64/km after)
  - **Actual Expense Method (CRA/IRS)**: Shows total vehicle expenses (fuel, maintenance, other) and calculates deductible portion based on business use percentage
- **Trip details table**: Date, purpose, destination, distance, travel type, linked expenses/refuels/revenues, calculated reimbursement, and tags for each trip
- **Expense allocation**: See refuels, maintenance, lodging, meals, tolls, and other expenses directly linked to each trip
- **Revenue tracking**: Track earnings from gig work or delivery services alongside expenses
- **Time tracking**: Active driving time and total time (including waiting) for gig economy workers (_coming soon_)
- **Trip type breakdown**: Visual breakdown showing distance and percentage for each travel type (business, personal, medical, charity, commute)
- **Multi-vehicle support**: Combine trips from multiple vehicles in a single report
- **Filtering**: By date range, vehicle, travel type, or tags
- **Tax-ready output**: All the information needed for IRS Schedule C or CRA T2125 vehicle expense claims

### Profitability Report

#### Overview

The Profitability Report helps gig workers, delivery drivers, and small fleet operators answer the most important question: "Is my vehicle actually making money?" It compares all vehicle revenue against all expenses — fuel, maintenance, and other costs — to show net profit, profit margins, and profit per kilometer or mile driven.

#### How It Works

1. **Open the Reports section** and select the Profitability tab
2. **Set the date range** using the toolbar — defaults to the current year
3. **Optionally filter** by specific vehicles or tags to narrow the analysis
4. **Review the report** — the page loads automatically with summary cards, charts, tables, and break-even analysis
5. **Export the data** as CSV files or print/save as PDF for tax reporting

#### Summary KPIs

The top of the report shows key performance indicators at a glance:

- **Total Revenue** — all income recorded against selected vehicles in the period
- **Total Expenses** — combined refuels, maintenance, and other costs
- **Net Profit** — revenue minus expenses, with color coding (green for profit, red for loss)
- **Profit Margin** — net profit as a percentage of revenue
- **Profit per Distance** — net profit per kilometer or mile, the key metric for deciding whether a gig is worth it
- **Daily Averages** — average daily revenue, expenses, and net profit to show run-rate performance

All amounts are displayed in the user's home currency. If expenses or revenue were recorded in foreign currencies, the original currency totals are shown alongside the converted amounts.

#### Break-Even Analysis

The report calculates whether the selected vehicles are profitable overall and provides:

- **Profitable or not** — a clear yes/no indicator for the period
- **Break-even day** — if profitable, the approximate day in the period when cumulative revenue first exceeded cumulative expenses
- **Days to break even** — if currently unprofitable, an estimate of how many more days at the current revenue rate it would take to cover all expenses

#### Monthly Trend Chart

An interactive chart shows revenue, expenses, and net profit month by month over the selected period. This makes it easy to spot seasonal patterns, identify months where costs spiked, or see whether profitability is improving or declining over time.

## Per-Vehicle Profitability

A detailed table breaks down profitability for each vehicle individually:

- Revenue, expenses, and net profit per vehicle
- Profit margin per vehicle
- Distance driven per vehicle
- Profit per distance unit per vehicle

This helps users identify which vehicles are earning their keep and which are costing more than they bring in.

#### Revenue Breakdown

Revenue is broken down by category and sub-category (kind), showing:

- Total amount and number of records per category
- Percentage of total revenue each category represents
- A pie chart for visual comparison

This is useful for seeing which income sources contribute most — for example, comparing rideshare earnings versus delivery income.

#### Expense Breakdown

Expenses are broken down the same way — by category and sub-category — so users can see where their money is going. Refuels, maintenance, and other costs are each shown with their share of total expenses.

#### Per-Trip Profitability

For trips that have linked revenue records, the report shows per-trip profitability:

- Trip date, destination, and distance
- Revenue earned on the trip
- Linked refuels and expenses
- Net profit and profit per distance unit
- Tags associated with the trip

A totals row summarizes all trips with linked revenue. This table is especially useful for delivery drivers who want to evaluate individual runs.

#### Odometer Data Quality Warnings

Since distance-based metrics depend on accurate odometer readings, the report checks each vehicle's data quality and warns when:

- A vehicle has no odometer readings at all
- A significant percentage of records are missing odometer data
- There are unusually large gaps between consecutive readings

Warnings appear as an alert banner near the top of the report, with per-vehicle details and a severity level (low or high) so users know how much to trust the distance-based calculations.

#### Export Options

The report can be exported in several formats:

- **CSV — Summary** — all KPI metrics, daily averages, and break-even data
- **CSV — Per Vehicle** — the full vehicle profitability table
- **CSV — Monthly Trend** — month-by-month revenue, expenses, and profit
- **CSV — Per Trip** — the trip profitability table with all columns
- **Print / Save as PDF** — a formatted printable page with all sections, suitable for tax records or sharing with an accountant

#### Multi-Currency Support

Revenue and expenses recorded in different currencies are converted to the user's home currency for aggregation. Foreign currency totals are shown separately so users can see the original amounts alongside the converted values.

#### Unit Preferences

All distance values follow the user's preferred unit setting — kilometers or miles. Volume and currency formatting also respect user preferences, ensuring the report reads naturally regardless of locale.

---

## Weather Tracking (Premium Feature)

Automatically capture weather conditions for any record where location coordinates are available:

- **Supported records**: Refuels, expenses, checkpoints, travel starts, travel waypoints, travel ends
- **Data captured**: Temperature, conditions (sunny, cloudy, rain, snow, etc.), and other relevant weather data
- **How it works**: When you enter a location using Google Places autocomplete, coordinates are saved and weather data is fetched automatically
- **Analytics**: Use weather data in the Fuel Economy Report to understand how temperature and conditions affect your consumption
- **Availability**: Included in all paid plans (Family, Pro, Business)

---

## Multi-User & Roles

Share vehicle access with family members or team:

| Role       | Permissions                                   | Status    |
| ---------- | --------------------------------------------- | --------- |
| **Owner**  | Full access including subscription management | Available |
| **Admin**  | Full access except subscription settings      | Available |
| **Driver** | Manage only their assigned vehicles           | Available |
| **Viewer** | Read-only access to assigned vehicles         | Available |

**Capabilities:**

- Assign one vehicle to multiple drivers
- Assign multiple vehicles to one driver
- See who entered each expense
- Filter reports by user
- Invite Viewers for read-only access — perfect for spouses checking family car expenses, accountants reviewing records for tax prep, or business partners monitoring fleet costs. Viewers can browse all records related to assigned vehicle, use filters, export reports, and download documents, but cannot create, edit, or delete any data.

---

## Localization

- **Languages**: English, Russian, French, Spanish
- **Units**: Metric (km, liters) or Imperial (miles, gallons US, gallons UK)
- **Currency**: Multi-currency support with user-defined home currency
- **Unit conversion**: All data stored in metric; converted to user preference at display time

---

## Subscription Plans

| Plan         | Vehicles | Users | Storage | Price     |
| ------------ | -------- | ----- | ------- | --------- |
| **Free**     | 2        | 1     | 250 MB  | $0        |
| **Family**   | 5        | 5     | 2 GB    | $5/month  |
| **Pro**      | 10       | 10    | 3 GB    | $15/month |
| **Business** | 40       | 40    | 5 GB    | $60/month |

**Custom Plans**: Need more than 40 vehicles? We offer custom plans for larger fleets — whether you're managing 50, 100, or 500+ vehicles. Contact us to build a plan that fits your needs.

**Premium features** (all paid plans):

- Weather tracking for all records
- More vehicles and users
- Increased document storage
- Priority support

---

## Competitor Comparison

| App               | Platforms         | Multi-User         | Pricing                                     | Notes                                                                                     |
| ----------------- | ----------------- | ------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **CarExpenses**   | Web (PWA)         | ✓ (up to 40 users) | Free – $60/mo                               | True multi-user collaboration with roles, structured cost breakdowns, weather correlation |
| **Drivvo**        | Android, iOS      | ✓ (Fleet plans)    | Free w/ ads; ~$25/year Pro                  | Popular, good reports; Fleet Management for business users                                |
| **Fuelio**        | Android, iOS      | ✗                  | Free; ~$10/year Premium                     | Strong fuel tracking, crowdsourced gas prices; no ads; by Sygic                           |
| **Simply Auto**   | Android, iOS, Web | ✓ (Platinum)       | Free; Gold ~$5 one-time; Platinum ~$24/year | GPS trip tracking, business mileage deductions                                            |
| **Fuelly**        | iOS, Web          | ✗                  | Free; ~$5/year Premium                      | Web-first approach, community MPG comparisons                                             |
| **Road Trip MPG** | iOS only          | ✗                  | ~$6 one-time                                | No subscription, privacy-focused, excellent UI; iOS exclusive                             |
| **LubeLogger**    | Self-hosted (Web) | ✓                  | Free (open source)                          | For tech-savvy users; requires own server/Docker                                          |

### Key Differentiators

**CarExpenses stands out with:**

- **True multi-user collaboration** with role-based access (Owner/Admin/Driver/Viewer) — most competitors either don't support multiple users or charge significantly more for it
- **Built for families and teams** — shared vehicles with clear accountability for who entered what
- **Enterprise-grade cost breakdowns** (parts, labor, fees, taxes) — tax-ready and export-friendly
- **Revenue tracking** — track income alongside expenses for true profitability analysis (gig workers, delivery drivers)
- **Checkpoints** as a first-class feature — anchor odometer/fuel state, record milestones and incidents, maintain complete vehicle history
- **Travel with waypoints** — multiple stops per trip with map visualization
- **Per-trip cost tracking** — link lodging, meals, tolls, and other travel expenses directly to trips for accurate cost accounting
- **Multi-currency with home currency conversion** — essential for travelers and cross-border users
- **Vehicle recall alerts** — automatic safety recall checks using official NHTSA and Transport Canada databases
- **Digital Glove Box with equipment tracking** — store documents and track safety equipment with expiration reminders and country-specific compliance prompts
- **Weather correlation** — understand how conditions affect your costs (premium feature)
- **Web-based PWA** — works on any device without app store dependencies
- **Privacy-focused** — no background location tracking; you control what you share

---

## Free Tools

Standalone calculators available on the marketing website — no account required:

### Car Affordability Calculator

Discover your true car budget including fuel, maintenance, insurance, and loan payments — not just the sticker price.

- Factor in all ownership costs beyond purchase price
- Calculate monthly and annual total cost of ownership
- Determine affordable price range based on income
- Compare financing options and down payment scenarios

[Try the Car Affordability Calculator →](/tools/car-affordability-calculator/)

### Fuel Consumption Calculator

Calculate trip fuel costs, measure your real MPG or L/100km, and estimate driving range with real-world condition adjustments.

- Estimate fuel costs for any trip distance
- Calculate actual fuel economy from fill-up data
- Estimate driving range based on tank size and consumption
- Adjust for real-world conditions (weather, terrain, driving style)

[Try the Fuel Consumption Calculator →](/tools/fuel-consumption-calculator/)

### Mileage Tax Deduction Calculator

Calculate potential tax savings from business, charitable, and medical mileage. Supports US (IRS), Canada (CRA), and UK (HMRC) rates.

- Calculate deductions using official government mileage rates
- Support for business, medical, and charitable driving
- Compare standard mileage vs. actual expense methods
- Multi-country support: United States, Canada, United Kingdom

[Try the Mileage Tax Deduction Calculator →](/tools/mileage-tax-deduction-calculator/)
