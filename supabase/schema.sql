-- TM Express schema — run this in the Supabase SQL Editor.
-- Data model per spec section 9, with row-level security so each user only
-- sees their own clients and everything hanging off them.

create extension if not exists pgcrypto;

-- ============================================================================
-- CLIENTS
-- ============================================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_name text not null,
  ol_number text,
  address text,
  operating_centre text,
  onboarding_status text not null default 'In Progress'
    check (onboarding_status in ('In Progress', 'Approved')),
  created_at timestamptz not null default now()
);

create index clients_user_id_idx on public.clients(user_id);

alter table public.clients enable row level security;

create policy "clients_select_own" on public.clients
  for select to authenticated using (user_id = auth.uid());
create policy "clients_insert_own" on public.clients
  for insert to authenticated with check (user_id = auth.uid());
create policy "clients_update_own" on public.clients
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clients_delete_own" on public.clients
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================================
-- CLIENT CONTACTS (Client.contacts[] from the spec, normalized to a table)
-- ============================================================================
create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now()
);

create index client_contacts_client_id_idx on public.client_contacts(client_id);

alter table public.client_contacts enable row level security;

create policy "client_contacts_select_own" on public.client_contacts
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = client_contacts.client_id and c.user_id = auth.uid())
  );
create policy "client_contacts_insert_own" on public.client_contacts
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = client_contacts.client_id and c.user_id = auth.uid())
  );
create policy "client_contacts_update_own" on public.client_contacts
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = client_contacts.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = client_contacts.client_id and c.user_id = auth.uid())
  );
create policy "client_contacts_delete_own" on public.client_contacts
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = client_contacts.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- VEHICLES
-- ============================================================================
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  registration text not null,
  type text,
  created_at timestamptz not null default now()
);

create index vehicles_client_id_idx on public.vehicles(client_id);

alter table public.vehicles enable row level security;

create policy "vehicles_select_own" on public.vehicles
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = vehicles.client_id and c.user_id = auth.uid())
  );
create policy "vehicles_insert_own" on public.vehicles
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = vehicles.client_id and c.user_id = auth.uid())
  );
create policy "vehicles_update_own" on public.vehicles
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = vehicles.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = vehicles.client_id and c.user_id = auth.uid())
  );
create policy "vehicles_delete_own" on public.vehicles
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = vehicles.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- DRIVERS
-- ============================================================================
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index drivers_client_id_idx on public.drivers(client_id);

alter table public.drivers enable row level security;

create policy "drivers_select_own" on public.drivers
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = drivers.client_id and c.user_id = auth.uid())
  );
create policy "drivers_insert_own" on public.drivers
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = drivers.client_id and c.user_id = auth.uid())
  );
create policy "drivers_update_own" on public.drivers
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = drivers.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = drivers.client_id and c.user_id = auth.uid())
  );
create policy "drivers_delete_own" on public.drivers
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = drivers.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- VISITS
-- ============================================================================
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index visits_client_id_idx on public.visits(client_id);

alter table public.visits enable row level security;

create policy "visits_select_own" on public.visits
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );
create policy "visits_insert_own" on public.visits
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );
create policy "visits_update_own" on public.visits
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );
create policy "visits_delete_own" on public.visits
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- INFRINGEMENTS
-- ============================================================================
create table public.infringements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category text not null check (category in (
    'Driver Hours & Tachograph',
    'Vehicle Roadworthiness & Maintenance',
    'Operational Loading & Weight',
    'Licence & Operator Infrastructure'
  )),
  type text not null,
  driver_id uuid references public.drivers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  date date not null,
  notes text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index infringements_client_id_idx on public.infringements(client_id);
create index infringements_driver_id_idx on public.infringements(driver_id);
create index infringements_vehicle_id_idx on public.infringements(vehicle_id);

alter table public.infringements enable row level security;

create policy "infringements_select_own" on public.infringements
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = infringements.client_id and c.user_id = auth.uid())
  );
create policy "infringements_insert_own" on public.infringements
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = infringements.client_id and c.user_id = auth.uid())
  );
create policy "infringements_update_own" on public.infringements
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = infringements.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = infringements.client_id and c.user_id = auth.uid())
  );
create policy "infringements_delete_own" on public.infringements
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = infringements.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- DOCUMENTS
-- Polymorphic parent (vehicle/driver/visit/client) per spec, plus a
-- denormalized client_id so CompanyPage's flat "Documents" list (section 4)
-- and RLS can both be a single-join query instead of branching per parent_type.
-- ============================================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  parent_type text not null check (parent_type in ('vehicle', 'driver', 'visit', 'client')),
  parent_id uuid not null,
  doc_type text not null check (doc_type in (
    'PMI', 'Brake test', 'MOT', 'VED', 'Insurance',
    'Licence check', 'CPC', 'Infringement report', 'Depot visit note', 'Other'
  )),
  file_path text,
  expiry_date date,
  reminder_days_before integer,
  uploaded_at timestamptz not null default now()
);

create index documents_client_id_idx on public.documents(client_id);
create index documents_parent_idx on public.documents(parent_type, parent_id);

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = documents.client_id and c.user_id = auth.uid())
  );
create policy "documents_insert_own" on public.documents
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = documents.client_id and c.user_id = auth.uid())
  );
create policy "documents_update_own" on public.documents
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = documents.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = documents.client_id and c.user_id = auth.uid())
  );
create policy "documents_delete_own" on public.documents
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = documents.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- TODOS
-- ============================================================================
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source_type text not null check (source_type in ('document', 'infringement')),
  source_id uuid not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index todos_client_id_idx on public.todos(client_id);

alter table public.todos enable row level security;

create policy "todos_select_own" on public.todos
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = todos.client_id and c.user_id = auth.uid())
  );
create policy "todos_insert_own" on public.todos
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = todos.client_id and c.user_id = auth.uid())
  );
create policy "todos_update_own" on public.todos
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = todos.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = todos.client_id and c.user_id = auth.uid())
  );
create policy "todos_delete_own" on public.todos
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = todos.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- EMAIL CHASES
-- ============================================================================
create table public.email_chases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scope text not null check (scope in ('single_todo', 'all_outstanding')),
  todo_id uuid references public.todos(id) on delete set null,
  recipients text[] not null default '{}',
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

create index email_chases_client_id_idx on public.email_chases(client_id);

alter table public.email_chases enable row level security;

create policy "email_chases_select_own" on public.email_chases
  for select to authenticated using (
    exists (select 1 from public.clients c where c.id = email_chases.client_id and c.user_id = auth.uid())
  );
create policy "email_chases_insert_own" on public.email_chases
  for insert to authenticated with check (
    exists (select 1 from public.clients c where c.id = email_chases.client_id and c.user_id = auth.uid())
  );
create policy "email_chases_update_own" on public.email_chases
  for update to authenticated using (
    exists (select 1 from public.clients c where c.id = email_chases.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = email_chases.client_id and c.user_id = auth.uid())
  );
create policy "email_chases_delete_own" on public.email_chases
  for delete to authenticated using (
    exists (select 1 from public.clients c where c.id = email_chases.client_id and c.user_id = auth.uid())
  );

-- ============================================================================
-- VOL_OPERATORS
-- A local cache of DVSA's public Vehicle Operator Licensing register, used to
-- power the Add Client dialog's search. DVSA doesn't expose a live queryable
-- API for this (the interactive gov.uk search is bot-gated and session-based),
-- but they do publish the full register as CSVs under the Open Government
-- Licence, refreshed weekly — see scripts/import-vol-register.mjs. This table
-- mirrors that data. It's public reference data, not user-owned, so RLS just
-- gates it to signed-in users rather than scoping by owner.
-- ============================================================================
create table public.vol_operators (
  licence_number text primary key,
  geographic_region text,
  licence_type text,
  operator_name text not null,
  operator_type text,
  correspondence_address text,
  oc_address text,
  transport_manager text,
  vehicles_authorised integer,
  trailers_authorised integer,
  vehicles_specified integer,
  trailers_specified integer,
  director_or_partner text,
  licence_status text,
  continuation_date date,
  company_reg_number text,
  updated_at timestamptz not null default now()
);

create index vol_operators_operator_name_idx on public.vol_operators
  using gin (to_tsvector('simple', operator_name));

alter table public.vol_operators enable row level security;

create policy "vol_operators_select_authenticated" on public.vol_operators
  for select to authenticated using (true);

-- No insert/update/delete policies for regular users — the import script
-- uses the service role key, which bypasses RLS.

-- ============================================================================
-- STORAGE
-- Bucket for document uploads (VehiculePage/DriverPage/etc., not wired up
-- yet, but created now so the schema matches section 9 in full).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents_storage_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents_storage_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "documents_storage_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
