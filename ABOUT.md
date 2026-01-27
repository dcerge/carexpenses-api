# CarExpenses

**The most accurate fuel and car expense tracker — for people who actually care about numbers.**

CarExpenses is a mobile-friendly Progressive Web Application (PWA) built for drivers, families, and small businesses who want real precision in tracking vehicle costs. Unlike apps that give you rough averages, CarExpenses captures the data that matters: fuel tank percentages for accurate consumption calculations, detailed cost breakdowns for tax-ready records, and structured expense tracking that scales from a single car to a shared fleet.

An internet connection is required.

---

## Vehicle Management

Add and manage multiple vehicles (quantity depends on subscription plan):

- **Basic info**: Display name, make, model, year, color, VIN
- **Specifications**: Trim, transmission type, engine type and displacement, fuel tank volume
- **Odometer**: Initial mileage reading with support for metric (km) or imperial (miles) units
- **Purchase details**: Price, date, seller information
- **Media**: Vehicle photo and attached documents (registration, title, etc.)
- **Notes**: Free-form notes field
- **Designated Drivers**: Assign users to vehicles as drivers or owners so only they can add records (_coming soon_)

---

## Refuel Tracking

Log every fill-up with comprehensive details:

- **Reading**: Odometer and date/time
- **Fuel**: Volume purchased, fuel tank level after refueling (0–100% for accurate consumption calculations)
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

Understand exactly how your vehicles consume fuel:

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
- **Filtering**: By year, vehicle, or tags

### Upcoming Services

- View all scheduled maintenance and their due dates
- See what's coming up based on distance or time triggers
- Never miss an oil change, tire rotation, or inspection

### Data Export

- Export any report to CSV
- PDF export (_coming soon_)
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

## Multi-User & Roles (_coming soon_)

Share vehicle access with family members or team:

| Role       | Permissions                                   |
| ---------- | --------------------------------------------- |
| **Owner**  | Full access including subscription management |
| **Admin**  | Full access except subscription settings      |
| **Driver** | Manage only their assigned vehicles           |
| **Viewer** | Read-only access to all data                  |

**Capabilities:**

- Assign one vehicle to multiple drivers
- Assign multiple vehicles to one driver
- See who entered each expense
- Filter reports by user

---

## Localization

- **Languages**: English, Russian, French, Spanish
- **Units**: Metric (km, liters) or Imperial (miles, gallons)
- **Currency**: Multi-currency support with user-defined home currency
- **Unit conversion**: All data stored in metric; converted to user preference at display time

---

## Subscription Plans

| Plan         | Vehicles | Users | Storage | Price     |
| ------------ | -------- | ----- | ------- | --------- |
| **Free**     | 2        | 1     | 250 MB  | $0        |
| **Family**   | 5        | 5     | 2 GB    | $5/month  |
| **Pro**      | 10       | 10    | 3 GB    | $15/month |
| **Business** | 40       | 40    | 5 GB    | $35/month |

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
| **CarExpenses**   | Web (PWA)         | ✓ (up to 40 users) | Free – $35/mo                               | Tank % tracking, structured cost breakdowns, true multi-user collaboration, weather correlation |
| **Drivvo**        | Android, iOS      | ✓ (Fleet plans)    | Free w/ ads; ~$25/year Pro                  | Popular, good reports; Fleet Management for business users                                      |
| **Fuelio**        | Android, iOS      | ✗                  | Free; ~$10/year Premium                     | Strong fuel tracking, crowdsourced gas prices; no ads; by Sygic                                 |
| **Simply Auto**   | Android, iOS, Web | ✓ (Platinum)       | Free; Gold ~$5 one-time; Platinum ~$24/year | GPS trip tracking, business mileage deductions                                                  |
| **Fuelly**        | iOS, Web          | ✗                  | Free; ~$5/year Premium                      | Web-first approach, community MPG comparisons                                                   |
| **Road Trip MPG** | iOS only          | ✗                  | ~$6 one-time                                | No subscription, privacy-focused, excellent UI; iOS exclusive                                   |
| **LubeLogger**    | Self-hosted (Web) | ✓                  | Free (open source)                          | For tech-savvy users; requires own server/Docker                                                |

### Key Differentiators

**CarExpenses stands out with:**

- **Fuel tank % tracking** on refuels, expenses, and checkpoints — enables genuinely accurate consumption calculations, not just rough averages
- **Weather correlation** — understand how temperature and conditions affect your fuel economy (premium feature)
- **Revenue tracking** — track income alongside expenses for true profitability analysis
- **Enterprise-grade cost breakdowns** (parts, labor, fees, taxes) — tax-ready and export-friendly
- **True multi-user collaboration** with role-based access — most competitors either don't support multiple users or charge significantly more for it
- **Multi-currency with home currency conversion** — essential for travelers and cross-border users
- **Checkpoints** as a first-class feature — anchor odometer/fuel state, record milestones and incidents, maintain complete vehicle history
- **Travel with waypoints** — multiple stops per trip with map visualization
- **Web-based PWA** — works on any device without app store dependencies
- **Privacy-focused** — no background location tracking; you control what you share

---

## Roadmap

- Revenue reports (profitability per vehicle, per trip, per distance)
- PDF export for all reports
- Checklists for pre/post-travel and maintenance
- AWD/FWD/RWD drivetrain tracking
- 2 tanks support for a vehicle
- Electric vehicle support (kWh tracking, charging stations)
- Additional fuel types
- Data import from Fuelio, Drivvo, and other apps