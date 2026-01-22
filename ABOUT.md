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
- **Location**: Gas station name and address
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
- **Location**: Service provider name and address
- **Attachments**: Invoices, photos, PDFs
- **Tags**: Custom tags for flexible categorization and reporting

---

## Checkpoints

Capture point-in-time vehicle snapshots:

- Odometer reading and date/time
- Fuel tank level (0–100%)
- Notes and observations
- Document attachments
- Tags for categorization

---

## Service Intervals & Reminders

Configure recurring maintenance schedules to receive timely notifications:

- **Maintenance services**: Oil changes, tire rotations, brake inspections, etc.
- **Recurring expenses**: Car washes, insurance renewals, registration fees
- **Triggers**: Distance-based, time-based, or both
- **Notifications**: Alerts when service is due or approaching

---

## Travel Tracking

Log trips for mileage records, business expense reports, or personal tracking:

1. **Start travel**: Enter date/time, starting odometer, departure location, and trip purpose
2. **Add travel points**: Record intermediate checkpoints with odometer readings; automatic location detection available
3. **End travel**: Close the trip to calculate total distance and duration
4. **Trip summary**: View all expenses incurred during the trip
5. **Tags**: Assign custom tags for reporting and organization
6. **Trip Categorization**: Assign to the trip type like business, personal, medical, charity, other and the use the information to get taxe deductions from IRS/CRA.

---

## Digital Glove Box

Store important vehicle documents digitally:

- Insurance policies with expiration date tracking
- Registration and title documents
- Warranty information
- Any other vehicle or driver-related paperwork
- Driver license and other driver related documents

---

## Revenue Tracking

Track income generated through vehicle usage, with optional linkage to trips for accurate profit and tax reporting.

Revenue entries can exist independently or be associated with a specific travel record.

Revenue record includes:

-	Date/Time: When the revenue was earned or received
- Amount: Gross earned amount
- Currency: Multi-currency support with conversion to home currency
- Revenue type: Delivery, ride, service call, rental, mileage reimbursement, bonus, other (extensible)
- Description & notes: Short summary and detailed context
- Attachments: Invoices, payout statements, receipts, contracts
- Tags: Custom tags (e.g., Business, Taxable, Reimbursed, Cash, Platform:Uber)
- Linked travel (optional): Associate revenue with a specific travel to calculate per-trip or per-distance profitability. Potentially let user link several revenues for a single travel (_coming soon_)
- Vehicle: Selected manually or automatically derived from linked travel 

Reporting & Analytics (Revenue-aware): (_coming soon_)

- Revenue per vehicle
- Revenue per travel
- Revenue per distance (e.g., $/km or $/mile)
- Net profit calculations (revenue minus expenses)
- Yearly and monthly income summaries
- Export-ready records for accounting and tax filing (IRS / CRA)

## Checklists (_coming soon_)

Create structured, repeatable checklists to enforce consistency, safety, and compliance before or after vehicle usage.

Checklists can be attached to travels, vehicles, or triggered manually.

Checklist capabilities:

- Checklist types:
 - Pre-travel
 - Post-travel
 - Maintenance
 - Custom (user-defined)
- Checklist items:
 - Yes / No
 - Pass / Fail
 - Notes-required
- Attachments per item: Photos or documents as proof (e.g., tire condition, damage photos)
- Required vs optional items
- Reusable templates: Create once, reuse across vehicles or drivers

Assignment & Execution:
- Assign checklists to:
 - Specific vehicles
 - Specific drivers
 - Specific travel types (business, personal, medical, etc.)
- Enforce completion:
 - Block travel start until required pre-travel checklist is completed
 - Require post-travel checklist before closing a trip
 - Timestamped completion records with user attribution

Use cases:
- Safety verification before long trips
- Damage inspection before and after vehicle usage
- Business compliance for shared or fleet vehicles
- Driver accountability in multi-user setups
- Personal routines (e.g., “Did I lock the car?”, “Check child seat”)

---

## Tags

Create custom tags to organize and filter data:

- Assign tags to expenses, refuels, checkpoints, and travels
- Use tags in reports for flexible grouping and analysis
- Examples: "Business", "Vacation", "Tax Deductible", "Warranty Repair"

---

## Reports & Analytics

Gain insights into vehicle costs and usage:

- **Upcoming services**: View scheduled maintenance and due dates
- **Expense summary**: Total spending per vehicle or across all vehicles
- **Breakdown views**: By expense category, by expense kind, by tag
- **Fuel analysis**: Total volume, fuel consumption (L/100km or MPG), cost per distance
- **Yearly report**: Month-by-month expense breakdown for any year

---

## Multi-User & Roles (_coming soon_)

Share vehicle access with family members or team:

| Role       | Permissions                                   |
| ---------- | --------------------------------------------- |
| **Owner**  | Full access including subscription management |
| **Admin**  | Full access except subscription settings      |
| **Driver** | Manage only their assigned vehicles           |
| **Viewer** | Read-only access to all data                  |

---

## Localization

- **Languages**: English, Russian, French, Spanish
- **Units**: Metric (km, liters) or Imperial (miles, gallons)
- **Currency**: Multi-currency support with user-defined home currency

---

## Subscription Plans

| Plan         | Vehicles | Users | Storage | Price     |
| ------------ | -------- | ----- | ------- | --------- |
| **Free**     | 2        | 1     | 250 MB  | $0        |
| **Family**   | 5        | 5     | 2 GB    | $5/month  |
| **Pro**      | 10       | 10    | 3 GB    | $15/month |
| **Business** | 40       | 40    | 5 GB    | $35/month |

---

## Competitor Comparison

| App               | Platforms         | Multi-User         | Pricing                                     | Notes                                                                      |
| ----------------- | ----------------- | ------------------ | ------------------------------------------- | -------------------------------------------------------------------------- |
| **CarExpenses**   | Web (PWA)         | ✓ (up to 30 users) | Free – $35/mo                               | Tank % tracking, structured cost breakdowns, true multi-user collaboration |
| **Drivvo**        | Android, iOS      | ✓ (Fleet plans)    | Free w/ ads; ~$25/year Pro                  | Popular, good reports; Fleet Management for business users                 |
| **Fuelio**        | Android, iOS      | ✗                  | Free; ~$10/year Premium                     | Strong fuel tracking, crowdsourced gas prices; no ads; by Sygic            |
| **Simply Auto**   | Android, iOS, Web | ✓ (Platinum)       | Free; Gold ~$5 one-time; Platinum ~$24/year | GPS trip tracking, business mileage deductions                             |
| **Fuelly**        | iOS, Web          | ✗                  | Free; ~$5/year Premium                      | Web-first approach, community MPG comparisons                              |
| **Road Trip MPG** | iOS only          | ✗                  | ~$6 one-time                                | No subscription, privacy-focused, excellent UI; iOS exclusive              |
| **LubeLogger**    | Self-hosted (Web) | ✓                  | Free (open source)                          | For tech-savvy users; requires own server/Docker                           |

### Key Differentiators

**CarExpenses stands out with:**

- **Fuel tank % tracking** on refuels, expenses, and checkpoints — enables genuinely accurate consumption calculations, not just rough averages
- **Enterprise-grade cost breakdowns** (parts, labor, fees, taxes) — tax-ready and export-friendly
- **True multi-user collaboration** with role-based access — most competitors either don't support multiple users or charge significantly more for it
- **Multi-currency with home currency conversion** — essential for travelers and cross-border users
- **Checkpoints** as a first-class feature — anchor odometer/fuel state, correct data drift, enable future automation
- **Web-based PWA** — works on any device without app store dependencies

# Roadmap

- Add tracking income 
- Add 2 tanks support for a vehicle
- Add AWD/FWD/etc for a vehicle
- Add more fuel types (in addition to petrol, etc)
- Add support of electrical vehicle
- Add weather info for refuel
