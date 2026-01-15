# CarExpenses

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
git clone https://github.com/dcerge/carexpenses-api.git
cd carexpenses
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
- **carexpenses** (Port 4100) - Main API service, form processing
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
- Tables: Plural names (`cars`, `expenses`, `expense_bases`)
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
docker build -t carexpenses:latest .

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

**🛡️ Built with ❤️ by GrassEqual**
