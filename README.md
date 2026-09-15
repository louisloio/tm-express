# TM Express

Phase 1 build: a manual compliance-tracking portal for Transport Managers — client/vehicle/driver records with due-date tracking. No email integration yet (see [tm-express-platform-spec.md](tm-express-platform-spec.md) for the full product spec and phased roadmap).

## Stack
- **server/** — Node + Express + TypeScript + Prisma + PostgreSQL (REST API)
- **web/** — React + TypeScript + Vite (SPA)

## Prerequisites
- Node.js 20+
- PostgreSQL running locally (this was built against Postgres 16 installed via `brew install postgresql@16` / `brew services start postgresql@16`)

## Setup

```bash
# 1. Create the database
createdb tm_express_dev

# 2. Server
cd server
cp .env.example .env   # edit DATABASE_URL to match your Postgres user
npm install
npx prisma migrate dev
npm run dev             # http://localhost:4000

# 3. Web (separate terminal)
cd web
npm install
npm run dev              # http://localhost:5173, proxies /api to :4000
```

## Seed data

`server/prisma/seed.ts` seeds the real first client (PR PROTRANS LTD), extracted from forwarded emails. Two data points were ambiguous in the source emails and resolved as follows — see comments in the seed file:
- OL number: seeded as `OF2068326` (a second email thread referenced `OK2049916` — unconfirmed, worth checking with the client)
- Two driver documents (initials "GI" and "AS") couldn't be matched to a named driver, so they're seeded as placeholder driver records pending confirmation

Run it with:

```bash
cd server
npm run seed
```

## Data model

See the `Phase 1 build plan` section of [tm-express-platform-spec.md](tm-express-platform-spec.md). The Prisma schema (`server/prisma/schema.prisma`) defines the full Phase 1 model — Client, Vehicle, Driver, Document, DepotVisit, Todo — but only Client/Vehicle/Driver have CRUD screens so far. Document upload, freshness/status logic, depot visits, and the todo queue are built out in later steps of the same build order.

## What's deliberately missing (Phase 1 scope)
- Email integration (parsing, chasing, DVLA onboarding detection)
- VOL/OCRS pull
- Document upload UI and the computed Green/Amber/Red compliance status
- Multi-tenant support — this is a single-account tool for now
