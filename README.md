# TM Express

A compliance-tracking portal for Transport Managers — client/vehicle/driver records, document evidence, OCRS tracking, an auto-generated todo queue, and read-only email account connections. See [tm-express-platform-spec.md](tm-express-platform-spec.md) for the full product spec and phased roadmap.

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
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env   # for email account credentials at rest
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

Following the build order in [tm-express-platform-spec.md](tm-express-platform-spec.md):

**Phase 1 + 2** — data model, compliance tracking, OCRS:
- **Client / Vehicle / Driver CRUD**, all-clients Dashboard with a client filter
- **Document upload** (`server/uploads/`), linked to a vehicle/driver, with an audit-ready "latest per type" view
- **Compliance status engine** (`server/src/lib/compliance.ts`) — computes each vehicle/driver/client's Green/Amber/Red status from due dates and the depot-visit cadence; uploading a document with a valid-until date pushes the linked due date forward
- **Todo queue** (`server/src/lib/todoSync.ts`) — auto-generated from missing/overdue items, kept in sync after every relevant mutation; resolves automatically when the underlying document/visit is supplied
- **Depot visit log**
- **OCRS tracking** — score history per client, with automatic band/score-movement detection that raises a todo item

**Phase 4 stage A** — email connections (read-only), skipping ahead of Phase 3:
- **Email account** model with IMAP/SMTP settings; passwords encrypted at rest with AES-256-GCM (`server/src/lib/crypto.ts`, key from `ENCRYPTION_KEY`)
- **Add account form** (`/email-connections`) — "Test connection" attempts a real IMAP login and previews the most recent messages before the account can be saved
- **Read-only inbox browser** (`/email-connections/:id`) — message list, full body (HTML sanitized with DOMPurify before rendering), and downloadable attachments, fetched live on demand via [imapflow](https://imapflow.com) + [mailparser](https://nodemailer.com/extras/mailparser/)
- No sending, no auto-matching to clients, no live/background sync — see the spec's "deliberately out of scope" list for this stage

"Chase" stays disabled everywhere — draft generation is Phase 3, not built yet.

## What's deliberately missing
- **Phase 3** (chase drafts, escalation, chase history) — specced but not built
- Sending email, auto-filing attachments into client documents, OAuth (Gmail/Outlook) — Phase 4 stage B
- VOL/OCRS automated pull — OCRS entries are manual, matching the spec's own scope
- Multi-tenant support — this is a single-account tool for now
