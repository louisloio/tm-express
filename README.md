# TM Express (TMEX)

Compliance tracking platform for Transport Managers. See
[`tm-express-v2-rebuild-spec.md`](./tm-express-v2-rebuild-spec.md) for the full spec.

**Stack:** React + Vite + TypeScript + Tailwind, Supabase (auth + Postgres + storage), Vercel.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project's URL + anon key
   (Project Settings → API in the Supabase dashboard).
3. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) to create
   the tables and row-level security policies.
4. `npm run dev`

## Populating the DVSA operator register cache

The Add Client dialog searches a local cache of DVSA's public Vehicle Operator Licensing
register (see the comment at the top of `supabase/schema.sql` for why it's a cache rather
than a live query). To populate it:

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Project Settings → API → service_role —
   keep this out of the browser bundle, it's only used by this script).
2. `npm run import:vol`

Re-run it periodically — DVSA refreshes the source data weekly.

## Seeding sample data

Once you've signed up for a real account through the app:

1. Add `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` to `.env.local` (your app account, not Supabase's).
2. `npm run seed`

This loads the placeholder clients/vehicles/drivers/documents/infringements from
[`tm-express-figma-seed-data.md`](./tm-express-figma-seed-data.md), scoped to that account.
