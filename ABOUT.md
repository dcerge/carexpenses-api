# CarExpenses

**The vehicle expense tracker built for families and teams.**

CarExpenses is a mobile-friendly Progressive Web Application (PWA) that helps drivers, families, and small businesses understand the true cost of vehicle ownership. Unlike single-user apps that leave families juggling separate accounts, CarExpenses is built for how people actually live — with shared vehicles, multiple drivers, and the need to stay tax-ready year-round.

Track fuel consumption, maintenance costs, travel logs, and every vehicle-related expense in one place. See where your money actually goes, collaborate with family members or team drivers, and generate tax-compliant reports when you need them.

An internet connection is required.

---

## Who CarExpenses Is For

**Multi-Vehicle Families**
Parents sharing cars with teen drivers. Partners tracking household vehicle costs. Families who want consolidated expense management without spreadsheet chaos.

**Gig Economy Workers**
Delivery drivers, rideshare operators, and contractors who need every deductible mile documented. Track business vs. personal use, link revenue to trips, and stay audit-ready for IRS/CRA.

**Small Fleet Operators**
Businesses with 5–40 vehicles who need affordable fleet management. Role-based access lets owners maintain oversight while drivers log their own expenses.

**Car Enthusiasts & Meticulous Owners**
Drivers who want a complete vehicle history — from purchase to eventual sale. Checkpoints, maintenance records, and documents that preserve (and prove) your vehicle's story.

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

Record maintenance, repairs, and all other vehicle costs:

- **Reading**: Odometer and date/time
- **Fuel tank level**: Current tank percentage (0–100%)
- **Expense kind**: Oil change, tire rotation, filter change, part replacement, car wash, parking, toll, towing, fine, insurance payment, registration, and more (with additional kinds like lodging and food coming soon)
- **Description**: Short summary and detailed notes
- **Cost breakdown**: Parts, labor, fees, taxes, and total
- **Multi-currency**: Foreign currency support with home currency conversion
- **Location**: Service provider name and address (with Google Places autocomplete)
- **Weather conditions**: Automatically captured when location coordinates are available (premium feature)
- **Attachments**: Invoices, photos, PDFs
- **Tags**: Custom tags for flexible categorization and reporting

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
4. **Trip summary**: View all expenses and revenue linked to the trip
5. **Tags**: Assign custom tags for reporting and organization
6. **Trip categorization**: Assign trip type (business, personal, medical, charity, other) for tax deductions (IRS/CRA)

**Travel features:**

- **Multiple waypoints**: Add as many intermediate stops as needed
- **Map visualization**: View your entire route with all waypoints on Google Maps
- **Location detection**: Optionally pre-fill coordinates based on your current location
- **Weather tracking**: Weather conditions captured for travel start, waypoints, and end points when coordinates are available (premium feature)
- **In-app travel widget**: Quickly add waypoints or stop trips from any screen in the app — no need to navigate away from what you're doing
- **Linked expenses**: Associate refuels, meals, tolls, and other costs directly to the trip
- **Linked revenue**: Connect earnings to specific trips for profitability tracking

---

## Digital Glove Box

Store important vehicle and driver documents digitally:

- Insurance policies with expiration date tracking
- Registration and title documents
- Warranty information
- Road assistance card (membership number, phone number, expiration date)
- Driver license and ID documents
- Any other vehicle or driver-related paperwork
- Expiration reminders before documents lapse

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
- **Breakdown by category**: Administrative & Fees, Comfort & Cleaning, Maintenance & Repairs, Safety & Compliance, etc. with amounts, record counts, and percentage shares
- **Breakdown by type**: Detailed view by specific expense type (oil change, parking, car wash, traffic ticket, etc.)
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
- **Expense allocation**: See refuels, maintenance, and other expenses directly linked to each trip
- **Revenue tracking**: Track earnings from gig work or delivery services alongside expenses
- **Time tracking**: Active driving time and total time (including waiting) for gig economy workers (_coming soon_)
- **Trip type breakdown**: Visual breakdown showing distance and percentage for each travel type (business, personal, medical, charity, commute)
- **Multi-vehicle support**: Combine trips from multiple vehicles in a single report
- **Filtering**: By date range, vehicle, travel type, or tags
- **Tax-ready output**: All the information needed for IRS Schedule C or CRA T2125 vehicle expense claims

### Upcoming Services

- View all scheduled maintenance and their due dates
- See what's coming up based on distance or time triggers
- Never miss an oil change, tire rotation, or inspection

### Data Export

- Export any report to CSV
- Print any report (to paper or PDF)
- Your data is always yours — export anytime, no restrictions

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

| Role       | Permissions                                   | Status       |
| ---------- | --------------------------------------------- | ------------ |
| **Owner**  | Full access including subscription management | Available    |
| **Admin**  | Full access except subscription settings      | Available    |
| **Driver** | Manage only their assigned vehicles           | Available    |
| **Viewer** | Read-only access to all data                  | Coming soon  |

**Capabilities:**

- Assign one vehicle to multiple drivers
- Assign multiple vehicles to one driver
- See who entered each expense
- Filter reports by user

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

| App               | Platforms         | Multi-User         | Pricing                                     | Notes                                                                                           |
| ----------------- | ----------------- | ------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **CarExpenses**   | Web (PWA)         | ✓ (up to 40 users) | Free – $60/mo                               | True multi-user collaboration with roles, structured cost breakdowns, weather correlation       |
| **Drivvo**        | Android, iOS      | ✓ (Fleet plans)    | Free w/ ads; ~$25/year Pro                  | Popular, good reports; Fleet Management for business users                                      |
| **Fuelio**        | Android, iOS      | ✗                  | Free; ~$10/year Premium                     | Strong fuel tracking, crowdsourced gas prices; no ads; by Sygic                                 |
| **Simply Auto**   | Android, iOS, Web | ✓ (Platinum)       | Free; Gold ~$5 one-time; Platinum ~$24/year | GPS trip tracking, business mileage deductions                                                  |
| **Fuelly**        | iOS, Web          | ✗                  | Free; ~$5/year Premium                      | Web-first approach, community MPG comparisons                                                   |
| **Road Trip MPG** | iOS only          | ✗                  | ~$6 one-time                                | No subscription, privacy-focused, excellent UI; iOS exclusive                                   |
| **LubeLogger**    | Self-hosted (Web) | ✓                  | Free (open source)                          | For tech-savvy users; requires own server/Docker                                                |

### Key Differentiators

**CarExpenses stands out with:**

- **True multi-user collaboration** with role-based access (Owner/Admin/Driver/Viewer) — most competitors either don't support multiple users or charge significantly more for it
- **Built for families and teams** — shared vehicles with clear accountability for who entered what
- **Enterprise-grade cost breakdowns** (parts, labor, fees, taxes) — tax-ready and export-friendly
- **Revenue tracking** — track income alongside expenses for true profitability analysis (gig workers, delivery drivers)
- **Checkpoints** as a first-class feature — anchor odometer/fuel state, record milestones and incidents, maintain complete vehicle history
- **Travel with waypoints** — multiple stops per trip with map visualization
- **Multi-currency with home currency conversion** — essential for travelers and cross-border users
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

---

## Roadmap

### Near-Term (In Progress)

- **Recurring expenses**: Schedule automatic expense entries by day(s) of week, month, or year
- **Recurring revenues**: Schedule automatic revenue entries for regular income
- **Revenue reports**: Profitability per vehicle, per trip, per distance; net profit calculations
- **Viewer role**: Read-only access for family members or stakeholders who need visibility without edit permissions
- **Monthly budget estimator**: Historical-based cost projections in Yearly Report

### Mid-Term (Planned)

- **Checklists**: Pre/post-travel and maintenance checklists with photo attachments
- **Data import**: Import from Fuelio, Drivvo, Simply Auto, and other apps
- **Time tracking for travel**: Active driving time and total time (including waiting) for gig workers
- **Additional expense kinds**: Lodging, food, and other travel-related categories

### Future Considerations

- **Map visualization page**: View all records on a map with temperature data for selected vehicles and date range
- **Nearby gas stations**: Find nearby stations with current fuel prices
- **Real-time travel tracking**: Background location tracking to automatically record routes, with near real-time driver position for fleet owners (requires native app wrapper)
- **OBD-II integration**: Connect to vehicle diagnostics via Bluetooth for automatic mileage and fuel data (requires native app)
