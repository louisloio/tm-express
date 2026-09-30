-- Driver detail fields (spec section 9: Driver) + a "date checked" field on
-- documents for the Licence check slot. Run after supabase/010_mailbox_oauth.sql.

alter table public.drivers
  add column if not exists licence_number text,
  add column if not exists date_of_birth date;

-- "Date checked" drives the next-check reminder (expiry_date -
-- reminder_days_before, same mechanic as every other doc slot — see
-- src/lib/todos.ts). It's informational alongside the uploaded evidence,
-- not a new expiry mechanism, so it lives on `documents` generically rather
-- than only for 'Licence check' — no check constraint ties it to doc_type.
alter table public.documents
  add column if not exists checked_date date;

-- National Insurance number is a UK government identifier, not ordinary
-- contact info — it never goes on the `drivers` row at all (so a plain
-- `select('*')` from any list view can never return it), and this table
-- carries the encrypted value only. Same shape/rationale as
-- mailbox_secrets (see 009_mailboxes.sql): RLS enabled with zero
-- policies for anon/authenticated, so only the service-role key — used
-- exclusively inside the save-driver-ni / get-driver-ni Edge Functions,
-- which check driver ownership by hand before touching this table — can
-- ever read or write it.
create table if not exists public.driver_secrets (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  encrypted_ni text not null,
  iv text not null,
  updated_at timestamptz not null default now()
);

alter table public.driver_secrets enable row level security;
-- Deliberately no policies for anon/authenticated.
