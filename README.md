# FormSubmits

**The Firewall for Headless Forms** - Server-side validation that stops garbage data before it reaches your systems.

## 🛡️ Why FormSubmits?

**The Problem:**
Client-side validation is easily bypassed by bots, scrapers, and malicious actors. Your CRM gets filled with garbage data, your team wastes time cleaning spam submissions, and your analytics become useless.

**The Solution:**
FormSubmits enforces strict server-side validation with 27 field types, bot protection, lookup dictionary validation, and geofencing. Only clean, structured data reaches your systems.

**Built for:**

- 🚀 **Developers** who need form backends without writing server code
- 🏢 **Agencies** managing forms for multiple clients with team collaboration
- 💼 **SMBs & Startups** collecting leads, applications, and customer data
- 🎨 **Marketing Teams** running campaigns with custom validation needs
- 📊 **SaaS Companies** with demo requests, trials, and feedback forms

**Perfect for React, Vue, Next.js, Astro, Hugo, and any frontend framework.**

---

## 🚀 Why FormSubmits vs. Competitors?

### Leading Form Backend Services

**Direct Competitors:**

- **Formspree** - Popular, 200K+ users, basic features + workflows
- **Formcarry** - Simple form handling
- **Basin** - Basic form backend
- **Formkeep** - Form storage service
- **Formspark** - Minimalist approach

### Head-to-Head: FormSubmits vs. Formspree

| Feature                 | FormSubmits                      | Formspree            |
| ----------------------- | -------------------------------- | -------------------- |
| **Free Plan**           | 200 submissions/mo               | 50 submissions/mo    |
| **Entry Price**         | $15/mo (1,000 subs)              | $15/mo (200 subs)    |
| **Mid Tier**            | $30/mo (3,000 subs)              | $30/mo (2,000 subs)  |
| **Business Tier**       | $90/mo (30,000 subs)             | $90/mo (20,000 subs) |
| **Field Types**         | 27 advanced types                | ~10 basic types      |
| **BYOE (Email)**        | ✅ $14+ (SendGrid/SES/SMTP)      | ❌ Only on $90+ plan |
| **BYOS (Storage)**      | ✅ $14+ (AWS/Azure/GCP)          | ❌ Not available     |
| **Lookup Dictionaries** | ✅ Validate against custom data  | ❌ Not available     |
| **Geofencing**          | ✅ Coordinate/region validation  | ❌ Not available     |
| **Virus Scanning**      | ✅ ClamAV + VirusTotal           | ❌ Not available     |
| **Team Roles**          | 5 roles (detailed access)        | 2-3 basic roles      |
| **Integrations**        | 28+ (Azure/AWS/GCP focus)        | 28 (different set)   |
| **File Uploads**        | Advanced validation + virus scan | Basic validation     |
| **Form Scheduling**     | ✅ Free plan+                    | ❌ Not available     |

### Key Competitive Advantages

**1. Better Value (5-7x More Submissions)**

- Free: 4x Formspree (200 vs 50 submissions)
- Starter: 5x Formspree at 7% cheaper price
- Pro: 50% more submissions at 10% cheaper
- Business: 50% more submissions at 10% cheaper

**2. White-Label at $14 (Not $90+)**

- BYOE: Use your SendGrid, AWS SES, or SMTP
- BYOS: Store files in your AWS/Azure/GCP
- Custom email domains starting at $14/month
- Competitors charge $90+ for similar features

**3. Unique Features**

- **Lookup Dictionaries** - Validate against product SKUs, employee IDs, promo codes (NO competitor has this)
- **Geofencing** - Restrict by coordinates, regions, polygons submitted in a form field. The frontent is responsible to passing the data
- **27 Field Types** - Most competitors: 10 basic types
- **Virus Scanning** - ClamAV (Pro/Business) + VirusTotal (Enterprise) _(coming some time in the future)_
- **Form Scheduling** - Enable/disable by date range (job postings, seasonal campaigns)

**4. Developer-Friendly**

- Clean Architecture codebase (not a black box)
- GraphQL + REST APIs
- Webhooks with retry logic
- 28+ integrations (Azure, AWS, GCP, Slack, HubSpot, etc.)
- Self-hosted option available

**5. True Team Collaboration**

- 5 detailed roles: Owner/Admin/Member/Support Agent/Viewer
- Members can create their own forms without Admin intervention
- Support Agents can review all submissions without form access
- Viewers for clients/auditors with read-only access

### Target Market: SMBs & Startups

**We're NOT (yet) targeting:**

- ❌ Enterprise with 100+ team members
- ❌ Fortune 500 compliance requirements
- ❌ Companies needing on-premise deployment
- ❌ Organizations with complex SSO requirements

**We ARE perfect for:**

- ✅ Startups with 1-20 team members
- ✅ Digital agencies managing 5-50 clients
- ✅ SaaS companies with demo/trial forms
- ✅ Marketing teams running campaigns
- ✅ Small businesses collecting leads
- ✅ Freelancers building client websites
- ✅ Development shops needing form backends

**Why SMBs & Startups Choose Us:**

- 💰 **Budget-Friendly** - Better pricing than competitors
- 🚀 **Quick Setup** - No coding required, 5-minute setup
- 🎨 **White-Label** - Professional branding at entry-level pricing
- 👥 **Team-Ready** - Role-based access from day one
- 🔗 **Integration-Rich** - Connect to tools you already use
- 📈 **Scalable** - Grow from Free to Business plan seamlessly

---

## 💻 Quick Examples

### Simple HTML Form

```html
<form action="https://api.formsubmits.com/submit/YOUR_FORM_ID" method="POST">
  <input type="email" name="email" required />
  <input type="text" name="company" />
  <button type="submit">Submit</button>
</form>
```

### AJAX/Fetch (Headless)

```javascript
const response = await fetch('https://api.formsubmits.com/submit/YOUR_FORM_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    company: 'Acme Inc',
  }),
});

const result = await response.json();
if (result.success) {
  console.log('Form submitted successfully!');
} else {
  console.error('Validation errors:', result.errors);
}
```

### With File Upload

```javascript
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('resume', fileInput.files[0]);

const response = await fetch('https://api.formsubmits.com/submit/YOUR_FORM_ID', {
  method: 'POST',
  body: formData,
});
```

### React Example

```jsx
import { useState } from 'react';

function ContactForm() {
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const response = await fetch('https://api.formsubmits.com/submit/YOUR_FORM_ID', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    setStatus(result.success ? 'Success!' : 'Error: ' + result.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" required />
      <input type="text" name="company" />
      <button type="submit">Submit</button>
      {status && <p>{status}</p>}
    </form>
  );
}
```

---

## 🚀 How It Works

1. **Create a Form** - Configure validation rules in the dashboard
2. **Point Your HTML Form** - Use the provided API endpoint
3. **Submit Data** - FormSubmits validates against your server-side rules
4. **Get Results** - Receive clean data or actionable error messages

---

## ✨ Key Features

### 🔒 Advanced Validation Engine

**27 Field Types Supported:**

**Text & Content**

- **Short Text** - Single-line text with min/max length limits
- **Long Text** - Multi-line textarea with min/max length limits

**Numbers**

- **Number** - Numeric values with min/max range; options: integer or decimal mode, decimal places precision
- **Age** - Positive numbers with age range validation

**Date & Time**

- **Date** - YYYY-MM-DD format; options: min/max date range
- **Time** - 12-hour (hh:mm AM/PM) or 24-hour (HH:mm) format with optional time range
- **Date & Time** - Combined ISO 8601 format with optional datetime range
- **Birthdate** - Full date YYYY-MM-DD with age calculation; options: min/max age restrictions
- **Birthday** - Month and day only (MM-DD format)

**Contact**

- **Email** - RFC 5322 validation; options: domain existence check (DNS), MX record validation, plus addressing control (allow/forbid/strip), blocked domains list, allowed domains list
- **Phone** - International format support; options: require international format, allowed area codes list, area code length, min/max digit length

**Identity & Authentication**

- **Username** - Username validation; options: allowed characters (alphanumeric, underscore, hyphen), force lowercase, must start with letter, disallow consecutive special chars, stop words dictionary
- **Password** - Password strength validation; options: require uppercase/lowercase/numbers/symbols, custom allowed symbols, disallow common passwords, disallow sequential chars, disallow repeated chars, max repeated chars limit, stop passwords dictionary

**Selection**

- **Boolean** - Checkbox values accepting yes/no, true/false, 1/0
- **Single/Multiple Choice** - Single or multiple selection from predefined options; options: allowed values list, min/max selection limits

**Web & Technical**

- **URL** - Web address validation; options: domain existence check (DNS), URL liveness check, URL format (any/domain only/with path), allow/disallow query params, allow/disallow hash fragment
- **Slug** - URL-friendly identifier; options: separator type (hyphen/underscore/both), allow numbers, trim separators, disallow consecutive separators
- **UUID** - Standard UUID format; options: allowed versions filter (1-5), allow nil UUID
- **Hex Color** - Color codes; options: format (short #RGB/long #RRGGBB/both), require hash prefix, allow alpha channel (#RRGGBBAA)
- **Regular Expression** - Custom regex pattern matching for specialized formats

**Financial & Location**

- **Credit Card** - Luhn algorithm validation; options: allowed card types (Visa, MC, Amex, etc.), return detected card type, mask number in response
- **Currency** - Monetary values with decimal precision
- **Coordinates** - Geographic lat/lng; options: format (decimal/DMS), decimal precision, allowed regions, bounding box restriction, polygon containment, radius center + km restriction

**Data Validation**

- **Lookup** - Dictionary-based validation; options: lookup dictionary ID, filter parameters, supports both local dictionaries and external HTTP validation
- **File** - File upload validation; options: max quantity, allowed extensions, max file size
- **Hidden** - Hidden fields for workflow data (not visible in forms)

**Security & Bot Protection**

- **Honeypot** - Hidden field bot detection (must be empty on submission)
- **reCAPTCHA v2** - Google checkbox challenge
- **reCAPTCHA v3** - Invisible score-based protection (0.0-1.0 threshold)
- **reCAPTCHA Enterprise** - Advanced bot detection; options: project ID, site key, API key, min score threshold, expected action

**Validation Features:**

- Min/max length and value constraints
- Regex pattern matching
- Allowed/blocked value lists
- Custom error messages per field
- Uniqueness validation (prevent duplicate submissions)
- Type-specific validation logic with 100+ configurable options

---

### 📚 Lookup Dictionaries (Unique Feature)

**Validate form inputs against custom data lists - a feature NO competitor offers.**

**What Are Lookup Dictionaries?**
Validate user input against your own datasets:

- Product SKUs / Catalog codes
- Employee directories / ID numbers
- Department codes / Cost centers
- Promo codes / Discount vouchers
- Client lists / Account numbers
- Zip codes / Postal codes
- Membership IDs / License numbers

**How It Works:**

1. **Create Dictionary** - Add items manually or import from CSV
2. **Configure Field** - Set field type to "Lookup" and select dictionary
3. **Validate Submissions** - Only matching values are accepted

**Data Sources:**

- **Manual Entry** - Add items one by one in dashboard
- **CSV Import** - Bulk import thousands of records
- **Expiration Dates** - Auto-expire outdated entries (promo codes, temporary access)
- **External HTTP API** - Live validation against your own API endpoint

**Plan Limits:**

| Plan       | Dictionaries | Records/Dict | Total Records |
| ---------- | :----------: | :----------: | :-----------: |
| Free       |      1       |     100      |      100      |
| Starter    |      3       |     500      |     1,500     |
| Pro        |      10      |    2,000     |    20,000     |
| Business   |      30      |    10,000    |    300,000    |
| Enterprise |  Unlimited   |  Unlimited   |   Unlimited   |

**Member Limits (Team Plans):**
On Pro/Business plans, Members can create personal dictionaries:

- Pro Members: 2 dictionaries, 200 records each
- Business Members: 5 dictionaries, 1,000 records each
- Members can use all shared dictionaries created by Admins

**Real-World Examples:**

_Example 1: E-commerce Promo Codes_

```
Dictionary: "Black Friday 2024"
Items: SAVE20, FREESHIP, EARLYBIRD
Expiration: 2024-11-30
Result: Only valid codes accepted, auto-expire after sale
```

_Example 2: Employee Verification_

```
Dictionary: "Company Employees"
Items: EMP001, EMP002, EMP003...
External API: https://hr.company.com/api/validate-employee
Result: Verify employee IDs against live HR system
```

_Example 3: Regional Product Availability_

```
Dictionary: "Available Zip Codes - Canada"
Items: M5H, M5J, M5K... (Toronto postal codes)
Result: Only accept orders from serviceable regions
```

---

### 🛡️ Security Features

**Bot Protection:**

- **Native Honeypot** - Invisible bot trap with zero user friction
- **Google reCAPTCHA v2** - Checkbox challenge
- **Google reCAPTCHA v3** - Invisible score-based protection (configurable threshold)
- **Google reCAPTCHA Enterprise** - Advanced bot detection with custom rules

**Email & URL Security:**

- **Domain Verification** - DNS existence checks for email/URL fields
- **MX Record Validation** - Verify email domains can receive mail
- **Plus Addressing Control** - Allow/forbid/strip email aliases (user+tag@domain.com)
- **Domain Allowlists/Blocklists** - Restrict to specific domains
- **URL Liveness Checks** - Verify URLs are reachable over HTTP

**File Upload Security:**

- **Extension Whitelist** - Only allow specific file types
- **Size Limits** - Per-file and total submission limits
- **Quantity Restrictions** - Limit number of files per submission
- **Virus Scanning** - ClamAV (Pro/Business), VirusTotal API (Enterprise) - _(coming some time in the future)_
- **Polyglot Detection** - Detect files with multiple format signatures
- **SVG Script Scanning** - Block malicious scripts in SVG files
- **Macro Blocking** - Detects Office files with macros
- **ZIP Bomb Detection** - Prevent decompression attacks

**Access Control:**

- **Referrer/Origin Checks** - Prevent form submissions from unauthorized websites
- **Geofencing** - Restrict submissions by country/region/coordinates (Starter+ plans)
- **IP Blocking** - Block specific IP addresses or ranges (Pro+ plans) - _(Coming Soon)_
- **Rate Limiting** - Protect against abuse _(Coming Soon)_

**Data Protection:**

- **Field-Level Encryption** - Encrypt form data at rest _(coming soon)_
- **Credential Security** - AES-256-GCM encryption for connector settings and credentials
- **SSRF Prevention** - Validate all external URLs to prevent attacks
- **Prototype Pollution Protection** - Sanitize field names
- **CSV Injection Prevention** - Sanitize exports _(coming soon)_

**Compliance Features:** _(coming soon)_

- **GDPR Compliant** - Data portability, right to deletion (all plans)
- **HIPAA BAA Available** - Business Associate Agreement (Enterprise only)
- **SOC 2 Compliance** - Type II certification (Enterprise only)
- **Data Residency** - Choose storage region (Enterprise only)

---

### 🔗 28+ Integrations

Connect FormSubmits to your existing tools:

**Cloud Storage (13 platforms)**

- Azure Blob Storage, Azure Queue, Azure Table Storage
- Azure Service Bus, Azure Event Grid
- AWS S3, AWS SQS, AWS SNS, AWS EventBridge, AWS DynamoDB
- Google Cloud Storage, Google Cloud Pub/Sub, Google Firestore

**Communication (4 channels)**

- Slack - Post to channels
- Discord - Send to webhooks
- Telegram - Bot notifications
- Custom Webhooks - Connect to Zapier, Make.com, n8n, etc.

**Email Providers (3 - BYOE)**

- SendGrid - Popular email service
- AWS SES - Amazon's email platform
- SMTP - Any email server (Gmail, Outlook, custom)

**Productivity (5 tools)**

- Google Sheets - Append rows automatically
- Notion - Add to databases
- Airtable - Create records
- Trello - Create cards
- GitHub Issues - Open issues

**Email Marketing (2 platforms)**

- Mailchimp - Add to audiences
- Kit (ConvertKit) - Subscriber management

**CRM (1 platform)**

- HubSpot - Create contacts/deals
- Zoho CRM _(Coming Soon)_

**Storage Features:**

- **BYOS (Bring Your Own Storage)** - Store files in your own AWS/Azure/GCP (Starter+ plans)
- **Multiple Storage Destinations** - Send to multiple buckets simultaneously by using workflows _(coming soon)_
- **Path Customization** - Organize files with custom folder structures

---

### 📧 Email & Notifications

**BYOE (Bring Your Own Email)**

Available on all paid plans starting at $14/month:

- ✅ **SendGrid** - Popular email service with analytics
- ✅ **AWS SES** - Cost-effective at scale ($0.10 per 1,000 emails)
- ✅ **SMTP** - Use any email server (Gmail, Outlook, your own)
- 🔜 **Mailgun** - High-performance email API _(Coming Soon)_
- 🔜 **Postmark** - Transactional email service _(Coming Soon)_

**Why BYOE Matters:**

- 💰 Save money at scale (AWS SES: $4 for 40,000 emails vs competitors at $20+)
- 🎨 Use your own domain from day one ($14 vs $90+ elsewhere)
- 📊 Keep your email analytics and reputation in your account
- 🔒 Full control over email deliverability and compliance
- 🏢 Perfect for agencies managing multiple client brands

**Email Features:**

- **Custom Templates** - Create branded email templates with variable substitution
- **Custom Layouts** - Design reusable email layouts (verified by admins)
- **Reply-To Support** - Set any confirmed email field as reply-to address
- **Confirmation Emails** - Send confirmations to form submitters (only with BYOE)
- **Multiple Recipients** - Send to multiple email addresses via workflows _(Coming Soon)_
- **Conditional Routing** - Route to different emails based on form data via workflows _(Coming Soon)_

---

### 👥 Team Collaboration & Roles

**5-Role System for Flexible Team Management**

**Owner (1 per account)**

- Full control including billing, subscription, user management
- Can transfer ownership
- Can delete entire account
- Ultimate decision-making authority

**Admin (plan limit)**

- Manages all forms, connectors, templates, dictionaries, workflows
- Invites Members, Support Agents, Viewers
- Views all submissions
- Views billing (read-only, cannot change)
- Cannot manage other Admins or Owner

**Member (plan limit)**

- Creates and manages own forms independently
- Adds and verifies own email recipients
- Creates connectors
- Creates lookup dictionaries (plan limits: Pro=2, Business=5)
- Creates email templates (plan limits: Pro=3, Business=5)
- Uses all shared resources (connectors, templates, dictionaries)
- Views submissions only from own forms
- **Cannot** create workflows, or access other Members' forms

**Support Agent (plan limit)**

- Views ALL submissions from ALL forms (primary function)
- Deletes submissions (spam cleanup, GDPR requests)
- Exports all submission data _(coming soon)_
- Adds notes and flags to submissions _(coming soon)_
- Views forms, connectors, workflows (read-only context)
- **Cannot** create or edit any configuration
- Perfect for customer support teams, data quality specialists

**Viewer (plan limit)**

- Read-only access to everything
- Views all forms, submissions, configurations
- Exports data for reporting
- **Cannot** create, edit, delete, or import anything
- Perfect for clients, auditors, stakeholders, board members

**Role Limits by Plan:**

| Plan       | Total |
| ---------- | :---: |
| Free       |   1   |
| Starter    |   1   |
| Pro        |   3   |
| Business   |  10   |
| Enterprise |   ?   |

\*Mix and match roles within total limit

**Why This Matters:**

_Scenario 1: Digital Agency_

- Owner: Agency CEO
- Admins: Account managers (2)
- Members: Marketing specialists (5) - each manages their own client forms
- Support Agent: Customer support reviewing inquiries (1)
- Viewers: Clients with read-only access (2)

_Scenario 2: SaaS Startup_

- Owner: Founder
- Admin: Head of Operations (1)
- Members: Marketing team (2) - each runs their own campaigns
- Viewer: Investor with board seat (1)

**Member Self-Sufficiency:**

Members can work independently without Admin intervention:

- ✅ Create unlimited forms (within plan limits)
- ✅ Add and verify email recipients (marketing@company.com, sarah@company.com)
- ✅ Create webhook connectors (Zapier, Make.com, n8n, custom endpoints)
- ✅ Create small lookup dictionaries for their forms
- ✅ Create basic email templates for their notifications
- ✅ Use all shared resources (Admins' connectors, templates, dictionaries)

Members cannot compromise security:

- ❌ Cannot create credential-based connectors (SendGrid, AWS, Slack) - requires Admin
- ❌ Cannot create/manage workflows - requires Admin
- ❌ Cannot see other Members' forms or submissions
- ❌ Cannot make their resources "shared" organization-wide

---

### 📊 Data Management

**Submission Archive:**

- View all submissions in dashboard
- Search and filter submissions
- Add internal notes to submissions
- Flag submissions for follow-up
- Status tracking (new, reviewed, completed)
- Retention periods by plan (30 days to Forever)

**Export Options:**

- CSV export with custom column selection
- PDF export for individual submissions
- Bulk export for reporting
- Webhook delivery to your systems
- Direct integration to Google Sheets, Airtable, Notion

**Print Views:**

- Print a single submission details _(coming soon)_
- Formatted submission reports _(coming some time in the future)_
- Customizable print templates _(coming some time in the future)_
- Print a list of submissions with specific fields _(coming some time in the future)_

**File Management:**

- Secure file hosting with configurable storage
- Virus scanning (ClamAV on Pro/Business, VirusTotal on Enterprise) _(coming some time in the future)_
- Download files individually
- Download files in bulk _(coming some time in the future)_
- BYOS: Store in your own AWS/Azure/GCP storage

**Privacy Features:**

- Option to not store submission data (stats only)
- GDPR-compliant data deletion _(coming some time in the future)_
- Export user data on request _(coming some time in the future)_
- Field-level encryption for sensitive data _(coming some time in the future)_

---

### 🎨 Developer Experience

**Multiple Integration Methods:**

- Standard HTML form submission
- AJAX/Fetch API for headless submissions
- FormData API for file uploads
- JSON payloads for structured data

**Response Handling:**

- Custom success redirects
- JSON error responses with field-level details
- Status codes: 200 (success), 400 (validation errors), 429 (rate limit)

**Webhooks:**

- JSON payload with all submission data
- Retry logic with exponential backoff
- Webhook signature verification _(coming some time in the future)_
- Delivery logs and debugging _(coming some time in the future)_

**API Features:**

- CORS-enabled endpoints
- RESTful API design _(coming some time in the future)_
- GraphQL API for advanced queries _(coming some time in the future)_
- Read-only API access (Pro+) _(coming some time in the future)_
- Full API access (Business+) _(coming some time in the future)_

**Configuration:**

- API-driven form configuration _(Coming Soon)_
- React/Vue SDK libraries _(Coming Soon)_
- Embed library (formsubmits-embed.js) _(Coming Soon)_

---

## 📊 Pricing Plans

**Target Market: SMBs & Startups**

We're optimized for teams of 1-20 people. Not yet ready for Enterprise with 100+ team members or Fortune 500 compliance needs.

| Plan           | Price  | Submissions | Forms     | Users     | Storage  | Best For                     |
| -------------- | ------ | ----------- | --------- | --------- | -------- | ---------------------------- |
| **Free**       | $0     | 200/mo      | 3         | 1         | No files | Testing & development        |
| **Starter**    | $14/mo | 1,000/mo    | 10        | 1         | 2 GB     | Solo developers, freelancers |
| **Pro**        | $27/mo | 3,000/mo    | 25        | 4         | 10 GB    | Small teams, startups        |
| **Business**   | $81/mo | 30,000/mo   | Unlimited | 12        | 100 GB   | Agencies, growing companies  |
| **Enterprise** | Custom | 100K+/mo    | Unlimited | Unlimited | Custom   | Large organizations          |

**All plans include:**

- Server-side validation (27 field types)
- Bot protection (Honeypot + reCAPTCHA)
- Form scheduling
- Submission archive
- CSV/PDF export _(coming soon)_
- Email notifications (via FormSubmits)

**Starter+ plans add:**

- BYOE (SendGrid, AWS SES, SMTP)
- BYOS (AWS, Azure, GCP)
- Webhooks
- Geofencing
- Verified email recipients

**Pro+ plans add:**

- Team collaboration (3 users)
- Virus scanning (ClamAV) _(coming soon)_
- External lookup dictionaries _(coming soon)_
- Workflow with conditional logic support
- Custom email layouts
- Custom email templates
- Multi-step forms _(coming soon)_
- IP blocking _(coming soon)_

**Business+ plans add:**

- Team collaboration (10 users)
- Priority support
- Higher file limits
- Longer retention

**Enterprise includes:**

- HIPAA BAA _(coming some time in the future)_
- SOC 2 compliance _(coming some time in the future)_
- Advanced virus scanning (VirusTotal) _(coming some time in the future)_
- Dedicated support
- Custom SLA _(coming some time in the future)_
- On-premise option _(coming some time in the future)_

For complete feature comparison, see: [PRICING.md](./PRICING.md)

---

## 🎯 Use Cases

**Lead Generation:**

- Contact forms with lead scoring
- Demo request forms with CRM integration
- Newsletter signups with email marketing integration
- Quote request forms with automatic routing

**Applications & Registrations:**

- Job applications with resume upload
- Event registration with capacity limits
- Course applications with document collection
- Vendor/partner applications with verification

**Customer Support:**

- Support ticket forms with file attachments
- Feedback and survey forms
- Bug report forms with screenshots
- Return/refund request forms

**E-commerce & Transactions:**

- Pre-order forms with inventory validation
- Product inquiry forms
- Bulk order forms
- Partnership inquiry forms

**Data Collection:**

- Client intake forms (legal, healthcare, consulting)
- Document collection (insurance, HR, finance)
- Survey and research forms
- Competition/giveaway entry forms

**Internal Tools:**

- Employee onboarding forms
- Equipment request forms
- PTO/vacation request forms
- Expense report forms

---

## 🏁 Quick Start

### Prerequisites

- Node.js 22.0.0+
- npm 8+
- PostgreSQL 14+
- Docker & Docker Compose (for development)

> **Windows Users:** Use Git Bash or WSL2 for best compatibility

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/dcerge/formsubmits-api.git
cd formsubmits
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker Compose**

```bash
docker-compose up -d
```

5. **Run database migrations**

```bash
npm run migrations
```

6. **Start development server**

```bash
npm run start:dev
```

The application will be available at:

- GraphQL Gateway: http://localhost:4000
- Main API: http://localhost:4100
- Auth Service: http://localhost:4010
- Storage Service: http://localhost:4060
- Sender Service: http://localhost:4030

---

## 📁 Architecture

### Backend Architecture

```
src/
├── app/                    # Application layer (API interfaces)
│   ├── cli/                # CLI commands
│   ├── graphql/            # GraphQL API (Apollo Federation)
│   └── restapi/            # REST API endpoints (Controllers)
├── boundary/               # Interface definitions between layers
├── core/                   # Business logic (Interactors)
│   ├── validators/         # Input validation for all API entry points
│   └── *Core.ts            # Core business logic files
├── gateways/               # Data persistence & external APIs
├── utils/                  # Helper functions
└── database/               # Migrations and seeds
    ├── migrations/         # Migration files
    └── seeds/              # Seed data
```

### Microservices Architecture

- **ms_auth** (Port 4010) - Authentication & authorization, user management
- **ms_storage** (Port 4060) - File storage management, virus scanning
- **ms_sender** (Port 4030) - Email and notification service
- **formsubmits** (Port 4100) - Main API service, form processing
- **GraphQL Gateway** (Port 4000) - Apollo Federation gateway

### Frontend Architecture

```
src/
├── assets/                 # Static assets (logos, images)
├── components/             # Reusable UI components
│   ├── generic/            # Generic components (buttons, cards)
│   └── features/           # Feature-specific components
├── contexts/               # React contexts for state management
├── hooks/                  # Custom React hooks
├── utils/                  # Helper functions
│   └── api/                # API services
├── pages/                  # Application pages
│   ├── public/             # Public pages (login)
│   └── private/            # Protected pages (dashboard)
├── graphql/                # GraphQL queries, mutations
├── types/                  # TypeScript type definitions
├── styles/                 # Theme and styling
└── config/                 # App configuration
```

---

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 22.0.0
- **Language**: TypeScript 5.8.3
- **API Layer**: GraphQL Server 4.12.0 (Apollo Federation) + REST API (Express)
- **Database**: PostgreSQL 14+ with Knex.js
- **Caching**: Redis
- **File Storage**: Local + Azure Storage + AWS S3 + GCP Storage
- **Validation**: Custom engine with 27 field types
- **Security**: reCAPTCHA, Honeypot, Origin checks, virus scanning
- **Container**: Docker + Docker Compose
- **Architecture**: Clean Architecture with microservices

### Frontend

- **Framework**: React 18 + TypeScript 5.8.3
- **Build Tool**: Vite
- **UI Framework**: Mantine UI v8
- **Routing**: @sdflc/react-router-pages
- **State**: React Context + Apollo Client
- **API**: GraphQL with Apollo Client 4.12.0
- **Date/Time**: dayjs
- **PWA**: Vite PWA plugin

---

## 🔧 Development Guidelines

### Code Organization

**Clean Architecture Principles:**

- **APP Layer** - HTTP/GraphQL request handlers
- **CORE Layer** - Business logic and validation
- **GATEWAY Layer** - Database and external API calls
- **BOUNDARY Layer** - Interface contracts

**Naming Conventions:**

- Database: `snake_case` for columns
- TypeScript: `camelCase` for variables/functions
- Tables: Plural names (`submissions`, `forms`)
- Files: PascalCase for classes, camelCase for utilities

### Coding Standards

- All code must be TypeScript with strict types
- Follow clean architecture principles
- Graceful error handling - log but don't break
- Security-first validation at multiple layers
- Write tests for business logic _(In Progress)_
- Document complex validation rules

### Database Conventions

- Migrations support PostgreSQL and Azure SQL
- Use Knex.js for queries
- Proper transaction management
- Schema isolation per microservice
- Foreign keys with proper cascading
- Indexes on frequently queried columns

### Frontend Guidelines

- Components must be typed with TypeScript
- Use Mantine theme system - no inline styles
- Generic components in `components/generic/`
- Feature components in `components/features/`
- Named exports only
- Page components have 'Page' suffix

---

## 🛠️ Available Scripts

**Development:**

```bash
npm run dev              # Start development server
npm run start:dev        # Alternative dev start
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
```

**Production:**

```bash
npm run build            # Build for production
npm start                # Start production server
```

**Database:**

```bash
npm run migrations       # Run database migrations
npm run migration-down   # Rollback last migration
npm run seed             # Seed database with test data
```

**Testing:**

```bash
npm test                 # Run test suite (coming soon)
npm run test:watch       # Watch mode (coming soon)
npm run test:coverage    # Coverage report (coming soon)
```

---

## 🌐 Deployment

### Production Build

```bash
# Build for production
npm run build

# Run migrations
npm run migrations

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t formsubmits:latest .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment-Specific Configs

```bash
# Development
docker-compose up -d

# Staging
docker-compose -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🎯 Roadmap

### Phase 1 - Core Features ✅

- [x] Form creation and management
- [x] 27 field type validation engine
- [x] File upload handling
- [x] Email notifications
- [x] Webhook support
- [x] REST API endpoints
- [x] GraphQL API

### Phase 2 - Advanced Features 🚧

**Plan & Limits Management**

- [x] Track submission stats for accounts and forms
- [x] Stop accepting submissions when plan limit reached
- [x] Plan limit checks on form creation, submissions, files, user invitations
- [ ] Decision: Track files against plan limits for BYOS?

**Form Configuration**

- [x] Allow/forbid file uploads per form
- [x] Include/skip fields not in configuration
- [x] Limit number of submissions per form
- [x] Form scheduling (enable/disable by date range)
- [x] Form cloning/templates
- [x] Option to not store submission data (stats only)
- [x] Custom messages for limit reached, scheduling, disabled states
- [ ] Workflow assignment per form

**Field Types & Validation**

- [x] Custom error messages per field
- [x] Unique value validation (prevent duplicates)
- [x] Multiple Choice with min/max selections
- [x] Hidden fields for workflow data
- [x] Lookup field type with dictionaries
- [x] Email domain validation (DNS, MX records, allowlists)
- [x] Number field: decimal/integer mode, precision control

**Email & Notifications**

- [x] Reply-to email field support
- [x] Verified email addresses to prevent abuse
- [x] Confirmation emails to submitters
- [x] Slack integration
- [x] Telegram integration
- [x] Discord integration
- [x] Custom email templates

**Data Management**

- [x] Print single submission
- [x] Download single submission as PDF
- [ ] Print list of submissions with field selection
- [ ] Submission editing via magic link

**Developer Tools**

- [x] Embed library (formsubmits-embed.js) - Can apply default minimal styling, Bootstrap v5, Tailwind CSS
- [x] Sandbox page where user can select a form, UI framework and see the HTML code for it and preview the form, enter and submit data as well.
- [ ] Spam scoring threshold customization
- [ ] Configuration via JSON API
- [x] Webhook/integration logs
- [ ] Retry failed webhooks
- [x] Connector logs and debugging
- [ ] Test connection for all connector types

### Phase 3 - Future Features 🔮

**Storage & Infrastructure**

- [x] Azure integrations (6 services)
- [x] AWS integrations (6 services)
- [x] GCP integrations (4 services)
- [x] BYOE (SendGrid, AWS SES, SMTP)
- [ ] BYOE (Mailgun, Postmark)

**Workflows & Automation**

- [ ] Conditional workflows (if/then logic)
- [ ] Data transformation
- [ ] Submission approval workflow
- [ ] Multi-step forms with progress indicator

**Integrations**

- [x] Productivity (Google Sheets, Notion, Airtable, Trello, GitHub)
- [x] Email Marketing (Mailchimp, Kit)
- [x] CRM (HubSpot)
- [ ] CRM (Zoho, Salesforce)
- [ ] React/Vue SDK libraries

**Security & Compliance**

- [ ] AI-powered spam detection
- [ ] Rate limiting per form
- [x] Geofencing (coordinates, regions, polygons)
- [ ] IP-based geofencing, do not allow to submit from certain IP addresses, or allow only from certain addresses
- [ ] Block/Allow submissions by IP addresses (allow/block lists via Lookup Dictionary)
- [ ] Block/Allow domains in URL/Email field types (allow/block mode and Lookup Dictionary)
- [ ] Form versioning
- [ ] Cloudflare Turnstile support
- [ ] HIPAA BAA (in progress)
- [ ] SOC 2 compliance (in progress)

**Analytics & Features**

- [x] Dashboard with usage stats
- [ ] Advanced analytics and reports
- [ ] Payment processing integration
- [ ] Built-in hosted pages with QR codes
- [ ] UTM source tracking

**Team & Collaboration**

- [x] Role-based access control (5 roles)
- [x] Team member invitations
- [x] Permission management

---

## 🔒 Security

### Current Implementation Status

**✅ Completed:**

- File upload polyglots & SVG script injection protection
- Prototype pollution prevention in field names
- Sanitized file names and paths
- ZIP bomb detection
- Temporary file cleanup on failure
- Macro file blocking (Office files)
- HTML file download-only with warnings
- SSRF prevention in webhook URLs
- Email header validation
- Credential encryption (AES-256-GCM)

**🚧 Planned:**

- CSV injection prevention in exports
- ReDoS prevention in custom regex fields
- IDOR authorization audit
- Webhook loop detection
- Scheduled temp file cleanup
- Total request size limits
- Extension/content mismatch detection

**Security Best Practices:**

- All credentials encrypted at rest
- Never log sensitive data (API keys, passwords)
- Rate limiting on authentication endpoints
- Proper CORS configuration
- Input validation at multiple layers
- Secure file upload handling
- Regular dependency updates

---

## 🤝 Contributing

This is a proprietary project. For internal development guidelines, please refer to the team documentation.

**For Internal Contributors:**

- Follow the coding standards above
- Write meaningful commit messages
- Create feature branches from `develop`
- Submit pull requests for review
- Update tests for new features
- Document breaking changes

---

## 📄 License

**Proprietary and Confidential**

Copyright © 2024-2025 GrassEqual (9246401 Canada Inc). All rights reserved.

This software and associated documentation files are the exclusive property of GrassEqual. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without express written permission from GrassEqual.

**Key Restrictions:**

- No unauthorized copying or distribution
- No reverse engineering or decompilation
- No removal of proprietary notices
- Use only as authorized in writing

This software is provided for authorized use only. No license or rights are granted except as explicitly stated in a separate written agreement.

**For licensing inquiries:** service@grassequal.com

---

## 📞 Support

**For Customers:**

- Documentation: https://docs.formsubmits.com
- Support Email: support@formsubmits.com
- Status Page: https://status.formsubmits.com

**For Internal Team:**

- Internal Wiki: [link]
- Slack Channel: #formsubmits-dev
- Weekly Standups: Mondays 10am

---

## 🏆 Why SMBs & Startups Love FormSubmits

**"Better than Formspree for half the price"**

- 5-7x more submissions at same or lower price
- White-label features starting at $14 (not $90+)
- More advanced field types (27 vs ~10)

**"The only form service with lookup dictionaries"**

- Validate against product SKUs, employee IDs, promo codes
- No competitor offers this feature
- Perfect for e-commerce and internal tools

**"Team collaboration actually works"**

- Members can work independently
- Support agents can review all submissions
- Viewers for clients and auditors
- Not just "add users" - real role separation

**"Integrations we actually use"**

- AWS, Azure, GCP - not just webhooks
- Slack, Discord, Telegram for teams
- Google Sheets, Notion, Airtable for workflows
- HubSpot for CRM

**"Security without enterprise pricing"**

- Virus scanning on Pro plan ($27/mo)
- Geofencing on Starter plan ($14/mo)
- File validation and bot protection on Free plan
- HIPAA/SOC2 available when you need it

---

**🛡️ Built with ❤️ by GrassEqual**

_FormSubmits - The form backend that doesn't treat you like garbage data._
