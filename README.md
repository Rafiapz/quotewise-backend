# QuoteWise Backend

Production-ready backend API service for RFQ and Supplier Quotation management, built with Clean Architecture, Express.js, TypeScript, PostgreSQL, and Prisma ORM.

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Language:** TypeScript (strict mode enabled)
- **Database ORM:** PostgreSQL + Prisma ORM
- **Validation:** Zod schemas
- **Security & Utilities:** Helmet, CORS, Morgan
- **Testing:** Vitest + Supertest

## Clean Architecture Design

The backend strictly adheres to Clean Architecture and Dependency Inversion:

```
backend/
├── prisma/
│   ├── schema.prisma              # Database schema definitions
│   └── migrations/                # Database migrations
├── src/
│   ├── config/                    # Environment variables & database client
│   ├── modules/
│   │   ├── rfq/                   # RFQ domain module
│   │   │   ├── domain/            # Entities, domain logic, repository interfaces
│   │   │   ├── application/       # Use-cases and DTO validation schemas
│   │   │   ├── infrastructure/    # Prisma repository implementations
│   │   │   └── presentation/      # Express controllers and route definitions
│   │   └── quotation/             # Quotation domain module
│   │       ├── domain/            # Entities and repository interfaces
│   │       ├── application/       # Use-cases and DTO validation schemas
│   │       ├── infrastructure/    # Prisma repository implementations
│   │       └── presentation/      # Express controllers and route definitions
│   ├── shared/                    # Centralized errors, middleware, types, logger
│   ├── app.ts                     # Express app configuration & middleware
│   └── server.ts                  # HTTP server listener
├── tests/                         # Vitest unit & integration test suites
├── .env.example
├── package.json
└── tsconfig.json
```

### Key Principles

1. **Dependency Inversion:** Domain and application layers have zero dependencies on Express or Prisma.
2. **Dynamic Calculations:** RFQ status (`OPEN`, `QUOTED`, `EXPIRED`) and best quotations are dynamically calculated by domain entities rather than stored as manually maintained database flags.
3. **Zod Validation:** All incoming HTTP payloads and params are validated prior to controller invocation.
4. **Centralized Error Handling:** Operational and validation errors are converted to uniform API response structures.

## Getting Started

### Prerequisites

- Node.js (>= 18)
- PostgreSQL database instance

### Installation

```bash
cd quotewise-backend
npm install
```

### Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the database connection string:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/quotewise"
FRONTEND_URL=http://localhost:5173
```

### Prisma Client Generation

Generate the Prisma client types:

```bash
npm run prisma:generate
```

### Running Locally

```bash
# Start development server with hot-reload
npm run dev

# Run automated tests
npm run test

# Compile TypeScript to production bundle
npm run build

# Start production build
npm start
```

### API Endpoints Overview

- `GET /api/health` - Service health status
- `GET /api/rfqs` - List all RFQs with dynamic statuses and best quotation summaries
- `POST /api/rfqs` - Create a new RFQ
- `GET /api/rfqs/:id` - Get RFQ by ID with attached quotes
- `GET /api/quotations` - List all supplier quotations
- `POST /api/quotations` - Submit a quotation for an existing RFQ
- `GET /api/quotations/rfq/:rfqId` - List quotations for a specific RFQ
