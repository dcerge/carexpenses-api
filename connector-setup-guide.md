# FormSubmits Connector Setup Guide

Quick setup instructions for all available connectors.

**11 Connectors:** Slack, Telegram, Discord, HubSpot, Google Sheets, Notion, Airtable, Trello, GitHub, Mailchimp, ConvertKit

---

## Messaging Connectors

### Slack

**What it does:** Sends rich notifications to a Slack channel using Block Kit formatting.

**Setup:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create New App → From scratch
3. Go to **Incoming Webhooks** → Activate
4. Click **Add New Webhook to Workspace**
5. Select a channel → Allow
6. Copy the Webhook URL

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Webhook URL | ✅ | Starts with `https://hooks.slack.com/` |
| Header Pattern | ❌ | Custom title (default: "📬 New submission: {{formName}}") |
| Show Metadata | ❌ | Include timestamp and submission ID |
| Show Files | ❌ | List attached files |
| Show View Button | ❌ | Link to view submission |

---

### Telegram

**What it does:** Sends formatted notifications to a Telegram chat, group, or channel.

**Setup:**

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the bot token
4. Start a chat with your bot (or add to group)
5. Get your Chat ID:
   - Send a message to your bot
   - Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find `"chat":{"id": YOUR_CHAT_ID}`

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Bot Token | ✅ | From BotFather (format: `123456789:ABC...`) |
| Chat ID | ✅ | User/group ID or `@channelusername` |
| Header Pattern | ❌ | Custom title |
| Show Metadata | ❌ | Include timestamp and submission ID |
| Show Files | ❌ | List attached files |
| Show View Button | ❌ | Inline button to view submission |

---

### Discord

**What it does:** Sends rich embed notifications to a Discord channel.

**Setup:**

1. Open Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Choose channel, optionally rename
5. Click **Copy Webhook URL**

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Webhook URL | ✅ | Starts with `https://discord.com/api/webhooks/` |
| Header Pattern | ❌ | Custom embed title |
| Show Metadata | ❌ | Include timestamp and ID in footer |
| Show Files | ❌ | List attached files |
| Show View Link | ❌ | Make title clickable |

---

## CRM Connectors

### HubSpot

**What it does:** Creates/updates contacts and creates support tickets with submission details.

**Setup:**

1. Go to [HubSpot Private Apps](https://app.hubspot.com/private-apps/)
2. Click **Create a private app**
3. Name it (e.g., "FormSubmits Integration")
4. Under **Scopes**, enable:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `tickets`
5. Create app and copy the access token

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Access Token | ✅ | Private app token (starts with `pat-`) |
| Pipeline ID | ❌ | Numeric ID (default: `0` = Support Pipeline) |
| Stage ID | ❌ | Numeric ID (default: first stage) |
| Priority | ❌ | LOW, MEDIUM, or HIGH |
| Subject Pattern | ❌ | Ticket subject template |
| Update Existing | ❌ | Update contact if exists |

**Important:** Use numeric IDs, not names! Find IDs in Settings → Objects → Tickets → Pipelines (ID is in the URL).

**Requirements:** Form must have email or phone field. Contact lookup priority:

1. Email field marked as "Reply-To"
2. First email field
3. First phone field

---

## Productivity Connectors

### Google Sheets

**What it does:** Appends form submissions as new rows in a spreadsheet.

**Easy Setup (Recommended):**

1. Create a Google Sheet
2. Share it with `sheets@formsubmits.iam.gserviceaccount.com` (Editor access)
3. Copy the Spreadsheet ID from the URL

**Custom Setup (Own Service Account):**

1. Create Service Account in [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Enable **Google Sheets API**
3. Download JSON key
4. Share sheet with service account email

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Spreadsheet ID | ✅ | From URL: `/d/{SPREADSHEET_ID}/edit` |
| Sheet Name | ❌ | Tab name (default: "Sheet1") |
| Include Metadata | ❌ | Add Timestamp and Submission ID columns |
| Include Headers | ❌ | Auto-create header row if empty |

**Important:** Don't add/remove/reorder form fields after collecting data — it will misalign rows with headers.

---

### Notion

**What it does:** Creates pages in a Notion database with submission data.

**Setup:**

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it and submit
4. Copy the **Internal Integration Token**
5. Open your Notion database
6. Click **...** → **Connections** → Add your integration

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Integration Token | ✅ | Starts with `secret_` |
| Database ID | ✅ | 32-character ID from database URL |
| Title Property | ❌ | Property for page title (auto-detects if empty) |
| Include Metadata | ❌ | Map Timestamp, Submission ID, View URL |

**Database Setup:**

- Create properties with **same names** as form field labels or names
- Matching is case-insensitive
- For metadata: add "Timestamp" (Date), "Submission ID" (Text), "View URL" (URL)

---

### Airtable

**What it does:** Creates records in an Airtable table.

**Setup:**

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **Create new token**
3. Add scopes: `data.records:write`, `schema.bases:read`
4. Select the base(s) to grant access
5. Create and copy the token

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Access Token | ✅ | Starts with `pat.` |
| Base ID | ✅ | Starts with `app` (from URL) |
| Table Name | ✅ | Table name or ID (starts with `tbl`) |
| Include Metadata | ❌ | Add Timestamp, Submission ID, View URL |

**Table Setup:**

- Create columns with **same names** as form field labels or names
- For metadata: add "Timestamp", "Submission ID", "View URL" columns
- Unknown fields are silently ignored

---

### Trello

**What it does:** Creates cards on a Trello board with submission data in the description.

**Setup:**

1. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin)
2. Click on "API Key" section
3. Copy your API Key
4. Click "generate a Token" link and authorize
5. Copy the token

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| API Key | ✅ | 32-character key |
| API Token | ✅ | 64-character token |
| List ID | ✅ | ID of the list for new cards |
| Name Pattern | ❌ | Card title template |
| Include Metadata | ❌ | Add timestamp, ID, view link |

**How to find List ID:**

- Open your Trello board
- Add `.json` to the end of the URL
- Search for your list name and find its `"id"` value

---

### GitHub

**What it does:** Creates issues in a GitHub repository with submission data.

**Setup:**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** (classic or fine-grained)
3. For classic: select `repo` scope
4. For fine-grained: grant **Issues: Read and write** permission
5. Generate and copy the token

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| Access Token | ✅ | `ghp_` (classic) or `github_pat_` (fine-grained) |
| Owner | ✅ | Username or organization |
| Repo | ✅ | Repository name |
| Title Pattern | ❌ | Issue title template |
| Labels | ❌ | Comma-separated labels (must exist in repo) |
| Include Metadata | ❌ | Add timestamp, ID, view link |

---

## Email Marketing Connectors

### Mailchimp

**What it does:** Adds/updates subscribers to a Mailchimp audience and attaches a note with submission data.

**Setup:**

1. Go to [Mailchimp → Account → API Keys](https://admin.mailchimp.com/account/api/)
2. Click "Create A Key"
3. Copy the API key (ends with `-usXX`, e.g., `-us21`)

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| API Key | ✅ | Ends with data center (e.g., `-us21`) |
| Audience ID | ✅ | Found in Audience → Settings → Audience name and defaults |
| Status | ❌ | `subscribed` (immediate) or `pending` (double opt-in) |
| Existing Subscribers | ❌ | `update` or `skip` |
| Auto-Map Fields | ❌ | Map to FNAME, LNAME, PHONE, etc. |

**Requirements:**

- Form **must have an email field**
- For "subscribed" status, ensure you have user consent (GDPR)

**Auto-mapped merge fields:** FNAME, LNAME, PHONE, COMPANY, ADDRESS, BIRTHDAY

**Note format:** Each submission adds a note to the subscriber:

```
[Form Name] | Dec 2, 2024 at 3:45 PM UTC | #ID | Name: John | Email: john@example.com | 🔗 view-url
```

---

### ConvertKit

**What it does:** Adds subscribers to a ConvertKit form with optional tagging.

**Setup:**

1. Go to [ConvertKit → Settings → Advanced](https://app.convertkit.com/account_settings/advanced_settings)
2. Copy the **API Secret** (not API Key!)
3. Get Form ID from form URL: `/forms/{FORM_ID}/edit`

**Configuration:**
| Field | Required | Description |
|-------|----------|-------------|
| API Secret | ✅ | From Settings → Advanced |
| Form ID | ✅ | Numeric ID from form URL |
| Tag ID | ❌ | Optional tag to add to subscriber |
| Auto-Map Fields | ❌ | Map first_name automatically |

**Requirements:**

- Form **must have an email field**
- Custom fields must be pre-created in ConvertKit to store submission data

**Custom Fields (create in ConvertKit → Subscribers → Custom Fields):**

- `form_submission_id` - Submission ID
- `form_name` - Form name
- `submission_url` - Link to view submission

**Note:** ConvertKit only stores data in pre-defined custom fields. Unlike Mailchimp, arbitrary form fields won't transfer automatically.

---

## Placeholders

Available in header/subject patterns:

| Placeholder     | Description       |
| --------------- | ----------------- |
| `{{formName}}`  | Name of the form  |
| `{{formId}}`    | Form UUID         |
| `{{requestId}}` | Submission ID     |
| `{{date}}`      | Date (YYYY-MM-DD) |

---

## Field Mapping

All connectors automatically:

- Match by **field label first**, then **field name**
- Exclude hidden fields
- Exclude security fields (honeypot, reCAPTCHA)
- Exclude file fields (shown separately where supported)
