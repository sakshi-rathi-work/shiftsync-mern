# ShiftSync 🗓️⚡

> Enterprise multi-tenant workforce shift, leave, and overtime management platform.

ShiftSync is a multi-tenant B2B application designed for operations managers to build weekly shift rosters, handle employee leave and shift swap requests, and automatically catch scheduling conflicts, understaffing risks, and overtime compliance issues *before* publishing rosters.

---

## 🌟 Key Features

- **Multi-Tenant Architecture**: Strict data isolation per organization via JWT claims.
- **Roster & Shift Management**: Drag-and-drop / weekly view roster builder with optimistic locking.
- **Automated Conflict Detection**: Detects double-booking, rest period violations, and understaffing automatically.
- **Leave & Shift Swap Workflows**: Server-side state machine enforcement for request lifecycles.
- **Labor Rule Compliance**: Configurable max weekly hours and staffing requirements per region.
- **Audit Logging**: Comprehensive logging for critical operations (Roster publish, shift changes, leave approvals).
- **Dark Mode UI**: Modern dark-themed dashboard tailored for operations teams.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, TanStack Query, Tailwind CSS, Recharts, Zustand.
- **Backend**: Node.js, Express.js, TypeScript, Zod.
- **Database & ORM**: MySQL 8 with Prisma ORM.
- **Caching & Rate Limiting**: Redis.
- **Authentication**: JWT access tokens (15-min) + rotated HttpOnly refresh cookies (7-day), `bcrypt` password hashing.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **MySQL Server**: `v8.0` running locally (or accessible via network)
- **Redis Server**: Running locally on `localhost:6379` (or accessible via network)

---

## 🚀 Quick Startup Guide

Follow these steps to get ShiftSync running locally:

### 1. Install Dependencies
From the repository root (uses `npm` workspaces):
```bash
npm install
```

### 2. Configure Environment Variables

#### Backend Environment Variables
Copy the backend environment file template:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your MySQL connection string and secrets:
```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/shiftsync"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="your_secure_access_secret_at_least_32_chars"
JWT_REFRESH_SECRET="your_secure_refresh_secret_at_least_32_chars"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

#### Frontend Environment Variables
Copy the frontend environment file template:
```bash
cp frontend/.env.example frontend/.env.local
```
Ensure `frontend/.env.local` contains:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

### 3. Setup Database & Seed Data
Run Prisma migrations to create the database schema:
```bash
npx prisma migrate dev --schema=backend/prisma/schema.prisma
```
*(Alternatively, run `npm run db:migrate --workspace=backend`)*

Seed the database with initial demo data (organization, admin account, and labor rules):
```bash
npm run db:seed --workspace=backend
```

### 4. Start Development Servers

You can start both backend and frontend servers from the root workspace:

**Terminal 1 — Backend (Express server on port 4000):**
```bash
npm run dev:backend
```

**Terminal 2 — Frontend (Next.js server on port 3000):**
```bash
npm run dev:frontend
```

---

## 🔑 Demo Login Credentials

After seeding the database, log in with the default administrator credentials:

| Field | Value |
|---|---|
| **URL** | [http://localhost:3000](http://localhost:3000) |
| **Email** | `admin@shiftsync.demo` |
| **Password** | `Admin@123!` |
| **Organization** | Acme Corp (`org-demo-001`) |

---

## 📜 Available NPM Scripts

Run these from the repository root:

| Command | Description |
|---|---|
| `npm run dev:backend` | Starts the Express backend server with hot-reloading (`:4000`) |
| `npm run dev:frontend` | Starts the Next.js frontend dev server (`:3000`) |
| `npm run test:backend` | Runs backend Jest unit & integration tests |
| `npm run test:frontend` | Runs frontend Jest unit & component tests |

### Additional Backend Scripts
Run from `backend/` directory or with `--workspace=backend`:

| Command | Description |
|---|---|
| `npm run db:migrate --workspace=backend` | Applies pending Prisma schema migrations |
| `npm run db:seed --workspace=backend` | Seeds initial organization, admin user & labor rules |
| `npm run db:studio --workspace=backend` | Opens Prisma Studio GUI to inspect DB records |

---

## 📚 Project Documentation

Detailed architecture and design specifications are available in the root directory:

- [architecture.md](file:///c:/Users/Sakshi/Desktop/shiftsync-mern/architecture.md) — Tech stack rationale, monorepo structure, ORM strategy, security & caching.
- [business-context.md](file:///c:/Users/Sakshi/Desktop/shiftsync-mern/business-context.md) — Roles, permissions, tenancy rules, roster state machines & conflict engine specs.
- [api-reference.md](file:///c:/Users/Sakshi/Desktop/shiftsync-mern/api-reference.md) — Endpoint documentation, payload schemas, and error responses.
- [style-guide.md](file:///c:/Users/Sakshi/Desktop/shiftsync-mern/style-guide.md) — Dark mode design tokens, layout specifications, and onboarding UI design.
