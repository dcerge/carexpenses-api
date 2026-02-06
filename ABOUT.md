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

| Role       | Permissions                                   | Status      |
| ---------- | --------------------------------------------- | ----------- |
| **Owner**  | Full access including subscription management | Available   |
| **Admin**  | Full access except subscription settings      | Available   |
| **Driver** | Manage only their assigned vehicles           | Available   |
| **Viewer** | Read-only access to all data                  | Coming soon |

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
- **Multi-currency with home currency conversion** — essential for travelers and cross-border users
- **Vehicle recall alerts** — automatic safety recall checks using official NHTSA and Transport Canada databases
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

# CarExpenses — Proposed Features Analysis

Effort estimates assume our current pace (one feature end-to-end in ~2 days). Priorities are rated **P1** (high value, do soon) through **P4** (nice-to-have, defer).

---

## 1. Voice Input for Expenses, Refuels, Checkpoints & Travels

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

### Why P2 (upgraded from P3)

The `MediaRecorder` approach eliminates the cross-browser limitation that made this risky before. Combined with the audio-as-attachment angle, this becomes a genuinely useful feature — not just a data entry shortcut, but a voice memo system for vehicle records. The "play back your own voice note on any record" capability is something no competitor offers. Implementation is straightforward since it builds on the existing attachment infrastructure.

---

## 2. AI Chatbot for Vehicle Troubleshooting

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

## 3. Receipt Scanning for Refuels

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

## 4. User Location for Regional Service Links

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

### Considerations

- Start with Canada and US (primary markets), expand to other countries based on demand
- Regional links change — build an admin interface or simple seed file that can be updated without code changes
- Some jurisdictions don't have online payment portals — gracefully handle missing data
- City-level is useful for some things (local parking authority) but state/province covers most use cases

### Why P2

Low implementation effort with high perceived value. It transforms CarExpenses from a passive tracker into an active assistant. Users get relevant links exactly when they need them (document expiring, fine logged, service due). The data is mostly static — seed it once per region and update occasionally. This also lays the groundwork for future region-specific features.

---

## 5. Loan/Lease Tracking with Dashboard Countdown

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

Loan and lease payments are often the single largest vehicle expense — yet most expense trackers ignore them entirely. The dashboard countdown creates daily engagement ("I'm 68% done paying off my car"). Lease mileage warnings are genuinely useful and something people currently track manually in spreadsheets. Implementation is primarily data model + dashboard widget + a bit of math. No external APIs needed.

---

## 6. Recurring Revenues

**Priority: P1 — High** | **Effort: ~1–2 days**

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

### Why P1

Near-zero incremental effort since it reuses the scheduled expenses infrastructure. Gig workers — a primary target audience — need this to calculate profitability. Without recurring revenues, revenue reports (Feature #7) have incomplete data. Ship this alongside or just before revenue reports for maximum impact.

---

## 7. Revenue Reports

**Priority: P1 — High** | **Effort: ~2–3 days**

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
4. Include financing costs from loan/lease data (Feature #5) when available
5. Export to CSV/PDF for tax reporting

### Considerations

- Distance-based calculations need reliable odometer data — warn if odometer gaps exist
- Multi-currency scenarios: convert all amounts to the user's home currency for aggregation
- Gig workers may want to see per-platform breakdown (Uber vs. Lyft vs. DoorDash) — this could be supported via revenue categories or tags

### Why P1

Revenue tracking without profitability reports is only half the story. Gig workers making financial decisions ("Should I keep driving for this platform?") need clear profit-per-km data. All the underlying data already exists — this is a reporting/UI layer on top. Pairs naturally with recurring revenues (Feature #6).

---

## 8. Viewer Role

**Priority: P1 — High** | **Effort: ~1–2 days**

### What it does

A read-only access role for family members, accountants, business partners, or stakeholders who need to see vehicle data without being able to edit or add records.

### How to build it

The role-based access system already exists (Owner, Admin, Driver). Adding Viewer is primarily a permissions check.

**Implementation:**

1. Add `'viewer'` to the role enum in the database and permission constants
2. Define Viewer permissions: can read all records (vehicles, expenses, refuels, travels, reports, documents), cannot create/update/delete any records, cannot manage users or account settings
3. Update GraphQL resolvers with permission checks — wrap mutation resolvers with a role guard that blocks Viewer
4. Frontend: hide or disable "Add", "Edit", "Delete" buttons and FABs when the current user's role is Viewer. Show a subtle indicator ("View only") in the header
5. Update the invitation flow to include Viewer as a role option

### Considerations

- Viewers should still be able to use filters, export reports, and download documents — these are read operations
- Consider whether Viewers can see financial data (costs, revenues) or just operational data (trips, mileage). Default to full visibility; a future enhancement could add "financial visibility" as a separate toggle
- The invitation UI should clearly explain what each role can do

### Why P1

Minimal effort since the role system is already built. Unlocks important use cases: a spouse who wants to see the family car expenses, a business partner monitoring fleet costs, or an accountant reviewing records for tax prep. Every competitor with multi-user support offers a read-only role — this is expected functionality.

---

## 9. Monthly Budget Estimator

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

## 10. Checklists (Pre/Post-Travel & Maintenance)

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

Strong differentiator for fleet operators and road-trip planners. Creates structured data about vehicle condition over time. Builds on existing infrastructure (attachments, drag-and-drop, travels). The audit trail aspect is valuable for business accounts — proof that a driver checked the vehicle before departure.

---

## 11. Data Import from Competitor Apps

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

## 12. Time Tracking for Travel

**Priority: P2 — Medium-High** | **Effort: ~2–3 days**

### What it does

Tracks active driving time and total elapsed time (including waiting, loading, breaks) for each travel record. Essential for gig workers who need to calculate effective hourly earnings and for fleet operators tracking driver productivity.

### How to build it

**Data model additions to the travel record:**

- `driving_start_at`, `driving_end_at` — timestamps when the vehicle is actually moving
- `total_elapsed_minutes` — wall-clock time from travel start to end
- `driving_minutes` — actual time spent driving (excluding stops)
- `waiting_minutes` — derived: total_elapsed - driving_minutes
- `time_tracking_mode` — enum: 'manual', 'automatic' (future: use GPS motion detection)

**Implementation approach:**

1. **Manual mode (MVP)**: Add start/stop timer controls to the active travel UI. A prominent "Driving" / "Waiting" toggle lets users switch state. The app records timestamps for each state change and sums driving vs. waiting time at the end
2. **Timer component**: Show a running clock on the active travel view (driving time in green, waiting time in amber). Persist state locally so refreshing the page doesn't lose the timer
3. **Post-entry mode**: For travels entered after the fact, add simple driving_minutes and total_minutes fields to the form
4. **Integration with revenue reports**: Hours worked per trip enables $/hour calculations. "You earned $45.60 on this trip in 1h 23m of driving (2h 10m total) = $21.06/driving-hour"

### Considerations

- GPS-based automatic driving detection (moving vs. stationary) is possible but only reliable in the native app wrapper (Capacitor) — keep it as a future enhancement
- Time zones matter: a gig worker might start a delivery in one time zone and end in another (rare but possible for long-haul)
- Battery-friendly: the timer itself doesn't consume resources, it just records timestamps
- Display driving efficiency as a percentage: "78% of your time was active driving"

### Why P2

Gig workers — a primary target audience — need $/hour to make informed decisions about which platforms and routes are profitable. Without time tracking, revenue reports can show $/km but not $/hour. Manual time tracking is simple to implement and immediately useful; automatic tracking can come later with the native app.

---

## 13. Additional Expense Categories (Lodging, Food, Travel-Related)

**Priority: P2 — Medium-High** | **Effort: ~1–2 days**

### What it does

Extends the expense system with categories specifically for travel-related costs: lodging/hotels, meals, tolls, visa/border fees, and other trip expenses. These are tied to specific travel records for accurate per-trip cost calculations.

### How to build it

**Implementation:**

1. Add new entries to the `expense_categories` lookup table: Lodging, Meals/Food, Tolls, Ferry, Border/Visa Fees, Equipment Rental (e.g., chains, cargo racks), and a generic "Travel Expense" catch-all
2. Add an optional `travel_id` foreign key to the expenses table — linking an expense to a specific travel record
3. Seed translations for all four languages (EN, RU, FR, ES)
4. Update the expense creation form: when the user has an active travel or selects a travel from a dropdown, the new travel-related categories appear in the category picker
5. Update travel detail view: show all linked expenses with subtotals by category
6. Update reports: include travel-linked expenses in per-trip profitability calculations

### Considerations

- Keep backward compatibility — existing expense categories remain unchanged
- The travel_id link should be optional: a user can log a meal expense without attaching it to a travel
- For tax purposes, some jurisdictions treat travel meals differently (e.g., 50% deductible in the US/Canada) — note this in reports without doing the tax calculation
- Consider whether lodging/food should be their own expense "kind" or remain under the generic "expense" kind with a sub-category. Sub-category (within the existing expense kind) is simpler and more consistent

### Why P2

Minimal implementation effort (mostly seed data and a foreign key). Enables accurate per-trip cost accounting that long-haul drivers and gig workers need. Without these categories, users either skip logging these expenses or lump them under "Other" — making reports less useful. Natural companion to time tracking (Feature #12) and revenue reports (Feature #7).

---

## 14. Map Visualization Page

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

### Considerations

- Only records with location data can be shown — add a "Records without location: X" indicator so users know the map isn't showing everything
- Google Maps API pricing: ~$7 per 1,000 map loads (Dynamic Maps), which adds up. Consider Mapbox ($0.60 per 1,000 loads on free tier, then $5/1,000) or a self-hosted option like MapLibre GL for cost control
- Mobile UX: the map should be full-screen with an expandable bottom sheet for filters and record details
- Performance: for users with thousands of records, implement server-side bounding-box queries and marker clustering
- Temperature correlation is a premium feature — gate behind paid plans

### Why P3

Visually impressive and useful for power users, but not essential for core expense tracking. Requires careful API cost management at scale. Best built after the core data is solid and enough location-enriched records exist to make the map meaningful. The weather correlation feature is a unique selling point that no competitor offers.

---

## 15. Nearby Gas Stations with Fuel Prices

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

## 16. Native App Wrapper (Capacitor)

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
- **Bluetooth**: Required for OBD-II integration (Feature #18). Web Bluetooth API has limited browser support; Capacitor's Bluetooth plugin works reliably on both platforms
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

The PWA works well today and should remain the primary experience. The native wrapper becomes important when features that require native APIs (background geolocation, OBD-II, push notifications on iOS) are ready to ship. There's no urgency to wrap just for App Store distribution — but when Features #17 or #18 are on the roadmap, Capacitor needs to be in place first.

---

## 17. Real-Time Travel Tracking

**Priority: P3 — Medium** | **Effort: ~5–7 days**

### What it does

Background location tracking that automatically records travel routes without manual odometer entry. For fleet owners, shows near real-time driver positions on a map. Requires the native app wrapper (Feature #16).

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

### Considerations

- Battery consumption is the #1 concern. Use motion detection to only track when the vehicle is moving. The Transistorsoft plugin's accelerometer-based approach is ideal — it powers down GPS when stationary
- Privacy: GPS tracking of employees is legally sensitive in many jurisdictions. Clearly communicate when tracking is active (persistent notification), allow drivers to see their own tracked routes, and provide opt-out controls
- Android's background execution limits (Android 8+) require a foreground service with a visible notification — this is standard but must be implemented correctly
- iOS background location requires "Always" permission, which triggers a stricter App Store review. The app must clearly justify why background location is needed
- Offline areas: buffer locations locally and sync when connectivity returns

### Why P3

Genuine value for fleet operators and gig workers, but requires the Capacitor wrapper to be in place first. The commercial plugin (Transistorsoft) adds cost but provides a significantly better experience than building from scratch. Best implemented as a phased rollout: basic route recording first, fleet real-time tracking second.

---

## 18. OBD-II Integration

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

| #   | Feature                            | Priority | Effort    | Key Dependencies                       |
| --- | ---------------------------------- | -------- | --------- | -------------------------------------- |
| 6   | **Recurring Revenues**             | **P1**   | 1–2 days  | Existing scheduled expenses system     |
| 8   | **Viewer Role**                    | **P1**   | 1–2 days  | Existing role system                   |
| 7   | **Revenue Reports**                | **P1**   | 2–3 days  | Existing data + Recharts               |
| 5   | **Loan/Lease Tracking**            | **P1**   | 3–4 days  | None (math only)                       |
| 13  | **Additional Expense Categories**  | **P2**   | 1–2 days  | Seed data + optional travel_id FK      |
| 9   | **Monthly Budget Estimator**       | **P2**   | 2–3 days  | 3+ months of historical data           |
| 4   | **User Location → Regional Links** | **P2**   | 2–3 days  | Manual seed data per region            |
| 12  | **Time Tracking for Travel**       | **P2**   | 2–3 days  | Existing travel records                |
| 1   | **Voice Input + Voice Memos**      | **P2**   | 3–4 days  | MediaRecorder API + Whisper + LLM      |
| 10  | **Checklists**                     | **P2**   | 3–4 days  | Existing attachment system             |
| 11  | **Data Import**                    | **P2**   | 3–5 days  | CSV parsers per competitor format      |
| 3   | **Receipt Scanning**               | **P2**   | 3–5 days  | Claude Vision API or OCR service       |
| 14  | **Map Visualization**              | **P3**   | 3–5 days  | Google Maps or Mapbox API              |
| 15  | **Nearby Gas Stations**            | **P3**   | 3–5 days  | Google Places API + fuel price sources |
| 16  | **Native App Wrapper**             | **P3**   | 3–5 days  | Capacitor + Xcode/Android Studio       |
| 17  | **Real-Time Travel Tracking**      | **P3**   | 5–7 days  | Feature #16 (Capacitor)                |
| 2   | **AI Troubleshooting Chatbot**     | **P4**   | 5–7 days+ | LLM API + data curation (ongoing)      |
| 18  | **OBD-II Integration**             | **P4**   | 5–7 days  | Feature #16 (Capacitor) + BT adapter   |

### Suggested implementation order

**Phase 1 — Core Value (P1, ~2–3 weeks)**

1. **Recurring Revenues** — Near-zero effort, enables revenue reports
2. **Viewer Role** — Quick win, completes the role system
3. **Revenue Reports** — Pairs with recurring revenues, key for gig workers
4. **Loan/Lease Tracking** — High engagement, no external deps

**Phase 2 — Enhanced Experience (P2, ~3–4 weeks)** 5. **Additional Expense Categories** — Tiny effort, unlocks per-trip cost tracking 6. **Time Tracking for Travel** — Essential for $/hour calculations 7. **Monthly Budget Estimator** — Forward-looking value, dashboard feature 8. **User Location / Regional Links** — Low effort, makes features contextually smart 9. **Data Import** — Removes the biggest barrier for competitor switchers 10. **Checklists** — Differentiator for fleet operators 11. **Voice Input + Voice Memos** — Unique feature, builds on attachments 12. **Receipt Scanning** — Biggest UX improvement, needs API cost planning

**Phase 3 — Platform Expansion (P3, ~3–4 weeks)** 13. **Native App Wrapper (Capacitor)** — Foundation for native-only features 14. **Map Visualization** — Rich data presentation, leverages existing location data 15. **Nearby Gas Stations** — Station finder first, prices later 16. **Real-Time Travel Tracking** — Requires Capacitor, huge for fleet operators

**Phase 4 — Advanced Features (P4, ongoing)** 17. **AI Troubleshooting Chatbot** — Start with simple MVP when user base justifies cost 18. **OBD-II Integration** — Power-user feature, requires Capacitor + hardware
