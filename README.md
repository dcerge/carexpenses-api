# CarExpenses

An web app for tracking your vehicles, their expenses and travels and get spending insights.

## How does CarExpenses work?

## 🚀 Quick Start

### Prerequisites

- Node.js 22.0.0+
- npm 8+

### Installation

1. **Clone the repository**

```bash
   git clone https://github.com/dcerge/carexpenses-app.git
   cd carexpenses-app
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

4. **Start development server**

```bash
   npm run dev
```

5. **Open in browser**
   - App: http://localhost:3000

## 📁 Project Structure

```
src/
├── assets/             # Assets like logos, etc
│   └── images/         # Static images
├── components/         # Reusable UI components
│   ├── generic/        # Generic components (AppButton, AppCard, etc.)
│   └── features/       # Feature-specific components
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── utils/              # Helper functions and utilities
│   └── api/            # API services
├── pages/              # Application pages
│   ├── public/         # Public pages (login, TV activation)
│   └── private/        # Protected pages (dashboard, management)
├── graphql/            # GraphQL queries, mutations, subscriptions
├── types/              # TypeScript type definitions
├── styles/             # Theme and styling configuration
└── config/             # App configuration files
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript 5.8.3 + Vite
- **UI Framework**: Mantine UI v8
- **Routing**: @sdflc/react-router-pages
- **State Management**: React Context + Apollo Client
- **API**: GraphQL with Apollo Client 4.12.0
- **Styling**: Mantine theme system
- **PWA**: Vite PWA plugin for offline support

## 🔧 Development Guidelines

- All components must be typed with TypeScript
- Use Mantine theme system - no inline styles
- Create generic reusable components in `components/generic/`
- Create feature related reusable components in `components/features/`
- Follow folder structure conventions
- Export all components as named exports
- Page components must have 'Page' suffix

## 🚗 Vehicle Recalls Integration

CarExpenses integrates with government recall databases to alert users about safety recalls affecting their vehicles.

### Data Sources

| Source                    | Region        | API Type     | Auth Required |
| ------------------------- | ------------- | ------------ | ------------- |
| **NHTSA**                 | United States | REST API     | No            |
| **Transport Canada VRDB** | Canada        | CSV Download | No            |

### NHTSA (US Recalls)

The NHTSA API is accessed directly in real-time. No configuration required.

- **API Endpoint**: `https://api.nhtsa.gov/recalls/recallsByVehicle`
- **Documentation**: https://www.nhtsa.gov/nhtsa-datasets-and-apis

### Transport Canada VRDB (Canadian Recalls)

Transport Canada's Vehicle Recalls Database API was discontinued in September 2023. We now use the monthly CSV export from the Open Government Portal.

#### Data Source

| Resource                   | URL                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **CSV Download**           | https://opendatatc.tc.canada.ca/vrdb_full_monthly.csv                                        |
| **XML Alternative**        | https://opendatatc.tc.canada.ca/vrdb_full_monthly.xml                                        |
| **Data Dictionary**        | https://opendatatc.blob.core.windows.net/opendatatc/recalls_variables.txt                    |
| **Open Government Portal** | https://open.canada.ca/data/en/dataset/1ec92326-47ef-4110-b7ca-959fab03f96d                  |
| **License**                | [Open Government Licence - Canada](https://open.canada.ca/en/open-government-licence-canada) |
| **Update Frequency**       | Monthly (by Transport Canada)                                                                |

#### Environment Configuration

Add the following to your `.env` file:

```bash
# Transport Canada Vehicle Recalls Database
# Path to the downloaded VRDB CSV file (relative to project root or absolute)
VRDB_CSV_FILE_PATH=temp/downloads/vrdb_full_monthly.csv
```

#### Directory Setup

Create the download directory:

```bash
mkdir -p temp/downloads
mkdir -p logs
```

#### Manual Download

To download the file manually:

```bash
curl -o temp/downloads/vrdb_full_monthly.csv \
  https://opendatatc.tc.canada.ca/vrdb_full_monthly.csv
```

#### Automated Download (Cron)

Set up a cron job to download the CSV file every 2 days. The file is ~15-20 MB.

**Option 1: Using the provided script**

A download script is provided at `scripts/download-vrdb.sh`. Make it executable and add to cron:

```bash
# Make executable
chmod +x scripts/download-vrdb.sh

# Test the script
./scripts/download-vrdb.sh

# Add to crontab (every 2 days at 3:00 AM)
crontab -e
```

Add this line:

```cron
0 3 */2 * * /path/to/carexpenses/scripts/download-vrdb.sh
```

**Option 2: Simple crontab entry**

If you prefer a minimal setup without the script:

```bash
crontab -e
```

Add this line:

```cron
0 3 */2 * * /usr/bin/curl -sf -o /home/appsuer/projects/carexpenses/tc-vrdb/vrdb_full_monthly.csv https://opendatatc.tc.canada.ca/vrdb_full_monthly.csv >> /var/log/vrdb-download.log 2>&1
```

**Option 3: Using systemd timer (recommended for production)**

Create `/etc/systemd/system/vrdb-download.service`:

```ini
[Unit]
Description=Download Transport Canada VRDB CSV
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=carexpenses
ExecStart=/path/to/carexpenses/scripts/download-vrdb.sh
StandardOutput=journal
StandardError=journal
```

Create `/etc/systemd/system/vrdb-download.timer`:

```ini
[Unit]
Description=Download VRDB CSV every 2 days

[Timer]
OnCalendar=*-*-01,03,05,07,09,11,13,15,17,19,21,23,25,27,29,31 03:00:00
Persistent=true
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vrdb-download.timer
sudo systemctl start vrdb-download.timer

# Check status
sudo systemctl list-timers | grep vrdb
```

#### Verifying the Setup

Check that the file is accessible:

```bash
# Check file exists and has content
wc -l temp/downloads/vrdb_full_monthly.csv
# Expected: ~50,000+ lines

# Check file structure (should show CSV headers)
head -1 temp/downloads/vrdb_full_monthly.csv
# Expected: "RECALL_NUMBER_NUM","YEAR","MANUFACTURER_RECALL_NO_TXT",...

# Check the latest recalls in the file
tail -5 temp/downloads/vrdb_full_monthly.csv
```

#### How It Works

1. The CSV file is loaded into memory and indexed by make/model/year on first access
2. Index automatically refreshes when the file modification time changes (after a new download)
3. Recall lookups are O(1) after initial indexing (~50ms for full file load)
4. If the CSV file is missing, Canadian recalls are silently skipped (US recalls still work)

#### CSV File Format

| Column                       | Description                           | Example                    |
| ---------------------------- | ------------------------------------- | -------------------------- |
| `RECALL_NUMBER_NUM`          | Transport Canada recall number        | `2024-123`                 |
| `YEAR`                       | Model year affected                   | `2020`                     |
| `MANUFACTURER_RECALL_NO_TXT` | Manufacturer's internal recall number | `N232431050`               |
| `CATEGORY_ETXT`              | Vehicle category in English           | `Car`, `Light Truck & Van` |
| `MAKE_NAME_NM`               | Vehicle make (uppercase)              | `HONDA`, `FORD`            |
| `MODEL_NAME_NM`              | Vehicle model (uppercase)             | `CIVIC`, `F-150`           |
| `UNIT_AFFECTED_NBR`          | Number of units affected in Canada    | `27,500`                   |
| `SYSTEM_TYPE_ETXT`           | Affected system in English            | `Steering`, `Brakes`       |
| `NOTIFICATION_TYPE_ETXT`     | Type of notification                  | `Safety Mfr`, `Compliance` |
| `COMMENT_ETXT`               | Recall description in English         | Full description text      |
| `RECALL_DATE_DTE`            | Date recall was issued                | `2024-02-15`               |

#### Troubleshooting

**CSV file not loading:**

- Check `VRDB_CSV_FILE_PATH` is set correctly in `.env`
- Verify file permissions: `ls -la temp/downloads/vrdb_full_monthly.csv`
- Check logs: `cat logs/vrdb-download.log`

**No Canadian recalls showing:**

- Run the download script manually: `./scripts/download-vrdb.sh`
- Restart the application to reload the CSV index
- Check that vehicle make/model names match (they're normalized to uppercase)

**Download failing:**

- Check network connectivity to `opendatatc.tc.canada.ca`
- The server occasionally has downtime; the script will retry automatically
- Check if a firewall is blocking outbound HTTPS connections

## 🚀 Deployment

Build the project:

```bash
npm run build
```

The `dist/` folder contains the production-ready files.

### Production Checklist for Vehicle Recalls

- [ ] Create `temp/downloads` and `logs` directories
- [ ] Set `VRDB_CSV_FILE_PATH` in production `.env`
- [ ] Download initial VRDB CSV file
- [ ] Set up cron job or systemd timer for automated downloads
- [ ] Verify recalls appear for test vehicles

## 🌐 Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- TV browsers (optimized for large screens)

## 📄 License

**Proprietary and Confidential**

Copyright © 2024 GrassEqual (9246401 Canada Inc). All rights reserved.

This software and associated documentation files are proprietary to GrassEqual. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without express written permission from GrassEqual.

This software is provided for authorized use only. No license or rights are granted except as explicitly stated in a separate written agreement.

For licensing inquiries, contact: [services@grassequal.com]

---

**Built with ❤️ by GrassEqual**
