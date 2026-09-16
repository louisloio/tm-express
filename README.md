# TM Express

A compliance-tracking portal for Transport Managers — client/vehicle/driver records, document evidence, OCRS tracking, and an auto-generated todo queue, all currently manual entry (no email integration yet). See [tm-express-platform-spec.md](tm-express-platform-spec.md) for the full product spec and phased roadmap.

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

## What's built

Following the Phase 1 + 2 build order in [tm-express-platform-spec.md](tm-express-platform-spec.md):

- **Client / Vehicle / Driver CRUD**, all-clients Dashboard with a client filter
- **Document upload** (`server/uploads/`), linked to a vehicle/driver, with an audit-ready "latest per type" view
- **Compliance status engine** (`server/src/lib/compliance.ts`) — computes each vehicle/driver/client's Green/Amber/Red status from due dates and the depot-visit cadence; uploading a document with a valid-until date pushes the linked due date forward
- **Todo queue** (`server/src/lib/todoSync.ts`) — auto-generated from missing/overdue items, kept in sync after every relevant mutation; resolves automatically when the underlying document/visit is supplied
- **Depot visit log**
- **OCRS tracking** — score history per client, with automatic band/score-movement detection that raises a todo item

"Chase" stays disabled everywhere — draft generation is Phase 3, not built yet.

## What's deliberately missing
- Email integration (parsing, chasing, DVLA onboarding detection) — Phase 3 (chase drafts) and Phase 4 (IMAP/SMTP connections) are specced but not built
- VOL/OCRS automated pull — OCRS entries are manual, matching the spec's own scope
- Multi-tenant support — this is a single-account tool for now
