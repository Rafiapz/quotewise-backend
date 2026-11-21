# QuoteWise — Backend

A clean and scalable REST API service for RFQ (Request for Quotation) and Supplier Quotation management, built with Express.js, TypeScript, PostgreSQL (Prisma), Awilix, and Redis.

## Features

- **Authentication**: JWT-based authentication with secure HTTP-only cookies and bcrypt password hashing.
- **RFQ Management**: Create and track RFQs with dynamic statuses (`OPEN`, `QUOTED`, `EXPIRED`).
- **Supplier Quotations**: Submit quotes, validate deadlines and lead times, and automatically calculate the best quote.
- **Clean Architecture**: Domain, Application, Infrastructure, and Presentation layers powered by Awilix dependency injection.
- **Resilient Caching**: Redis caching with automated fallback to database queries if Redis is offline.

## Tech Stack

- **Runtime**: Node.js & Express.js
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL & Prisma ORM
- **Cache**: Redis (`ioredis`)
- **Validation**: Zod
- **Testing**: Vitest & Supertest

---

## Getting Started

### 1. Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database (local or hosted, e.g., Neon)
- **Redis** *(Optional)*

### 2. Installation

```bash
cd quotewise-backend
npm install
```

### 3. Environment Variables

Create a `.env` file in the root of `quotewise-backend`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/quotewise"
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
COOKIE_NAME=token
# REDIS_URL=redis://localhost:6379  # Optional
```

### 4. Database Setup

Generate the Prisma client and push the schema to your database:

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npx prisma db push
```

### 5. Run the Server

```bash
# Start development server with hot-reload
npm run dev

# Run test suite
npm run test

# Build for production
npm run build

# Start production server
npm start
```

The API will be available at: **http://localhost:5000**

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user & issue cookie/token |
| `POST` | `/api/auth/logout` | Clear auth cookie |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/rfqs` | List all RFQs with dynamic status |
| `POST` | `/api/rfqs` | Create a new RFQ |
| `GET` | `/api/rfqs/:id` | Get RFQ details and quotes |
| `GET` | `/api/quotations` | List all quotations |
| `POST` | `/api/quotations` | Submit a quote for an RFQ |
| `GET` | `/api/quotations/rfq/:rfqId` | List quotations for a specific RFQ |

---

## Folder Structure

```
quotewise-backend/
├── prisma/               # Schema and migrations
├── src/
│   ├── config/           # App, database, and Redis configuration
│   ├── modules/
│   │   ├── auth/         # Auth domain, use cases, controller
│   │   ├── rfq/          # RFQ domain, use cases, repository, controller
│   │   └── quotation/    # Quotation domain, use cases, repository, controller
│   ├── shared/           # Middlewares, errors, types, logger
│   ├── app.ts            # Express application setup
│   ├── container.ts      # Awilix DI container
│   └── server.ts         # Server entry point
└── tests/                # Unit & integration tests
```
