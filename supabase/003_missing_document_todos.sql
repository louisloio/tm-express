-- TM Express — missing-document todos. Run after supabase/002_todo_lifecycle.sql.
--
-- Until now, a document todo could only exist for a document that had
-- actually been uploaded (todos.source_id pointed at a documents.id) — so a
-- vehicle/driver that never had a document uploaded for an expected type
-- (e.g. no MOT on file at all) produced no todo and showed as plain "Not on
-- file" rather than red. That's wrong: a missing compliance document is at
-- least as urgent as an expired one.
--
-- Fix: todos gain parent_type/parent_id/doc_type columns (the identity of
-- "which document slot this is about"), populated for every document-sourced
-- todo — both the existing overdue/due-soon case AND a new missing-document
-- case. source_id becomes nullable (a missing document has no document row
-- to point to) and matching for resolution moves from "same document id" to
-- "same parent_type/parent_id/doc_type", which uniformly handles both cases
-- with one trigger.

alter table public.todos
  alter column source_id drop not null,
  add column if not exists parent_type text check (parent_type in ('vehicle', 'driver', 'visit', 'client')),
  add column if not exists parent_id uuid,
  add column if not exists doc_type text;

alter table public.todos drop constraint if exists todos_source_id_required_for_infringement;
alter table public.todos add constraint todos_source_id_required_for_infringement
  check (source_type <> 'infringement' or source_id is not null);

-- Backfill: every existing document-sourced todo was created before these
-- columns existed, so parent_type/parent_id/doc_type are NULL on them right
-- now. Without this, the redefined trigger/reconcile below (which match on
-- those columns instead of source_id) would silently stop resolving them AND
-- reconcile_todos() would insert duplicates alongside them, since a NULL
-- parent_type never equals anything in a NOT EXISTS check.
update public.todos t
set parent_type = d.parent_type, parent_id = d.parent_id, doc_type = d.doc_type
from public.documents d
where t.source_type = 'document' and t.source_id = d.id and t.parent_type is null;

-- ============================================================================
-- Resolution now matches on the document "slot" (parent + doc_type), not a
-- specific document id — this is what lets a fresh upload resolve BOTH an
-- "overdue" todo (from an old document) and a "missing" todo (from no
-- document) with the same trigger.
-- ============================================================================
create or replace function public.resolve_document_todos()
returns trigger
language plpgsql
as $$
begin
  update public.todos t
  set status = 'resolved', resolved_at = now()
  where t.source_type = 'document'
    and t.status = 'open'
    and t.parent_type = new.parent_type
    and t.parent_id = new.parent_id
    and t.doc_type = new.doc_type;
  return new;
end;
$$;

-- ============================================================================
-- reconcile_todos(): existing overdue/due-soon branch now also stamps
-- parent_type/parent_id/doc_type, plus a new branch for doc types that have
-- never had a single document uploaded. The expected-doc-type lists here
-- mirror the frontend's DOC_TYPES constants (VehicleRow/VehiculePage,
-- DriverRow/DriverPage) — if those ever change, update both places.
-- ============================================================================
create or replace function public.reconcile_todos()
returns void
language sql
as $$
  -- Overdue / due-soon: current (latest) document per slot, past its
  -- reminder threshold.
  insert into public.todos (client_id, source_type, source_id, parent_type, parent_id, doc_type, description, status)
  select
    d.client_id,
    'document',
    d.id,
    d.parent_type,
    d.parent_id,
    d.doc_type,
    trim(
      coalesce(p.label || ': ', '') || d.doc_type ||
      case when d.expiry_date < current_date then ' overdue' else ' due soon' end
    ),
    'open'
  from (
    select distinct on (parent_type, parent_id, doc_type) *
    from public.documents
    order by parent_type, parent_id, doc_type, uploaded_at desc
  ) d
  join public.clients c on c.id = d.client_id
  left join lateral (
    select case d.parent_type
      when 'vehicle' then (select registration from public.vehicles v where v.id = d.parent_id)
      when 'driver' then (select name from public.drivers dr where dr.id = d.parent_id)
      when 'client' then c.company_name
      else null
    end as label
  ) p on true
  where d.expiry_date is not null
    and d.reminder_days_before is not null
    and (d.expiry_date - d.reminder_days_before) <= current_date
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'document' and t.status = 'open'
        and t.parent_type = d.parent_type and t.parent_id = d.parent_id and t.doc_type = d.doc_type
    );

  -- Missing: vehicle doc types with zero document rows ever uploaded.
  insert into public.todos (client_id, source_type, parent_type, parent_id, doc_type, description, status)
  select v.client_id, 'document', 'vehicle', v.id, dt.doc_type,
    v.registration || ': ' || dt.doc_type || ' missing', 'open'
  from public.vehicles v
  cross join (values ('MOT'), ('VED'), ('Insurance'), ('PMI'), ('Brake test')) as dt(doc_type)
  where not exists (
      select 1 from public.documents d
      where d.parent_type = 'vehicle' and d.parent_id = v.id and d.doc_type = dt.doc_type
    )
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'document' and t.status = 'open'
        and t.parent_type = 'vehicle' and t.parent_id = v.id and t.doc_type = dt.doc_type
    );

  -- Missing: driver doc types with zero document rows ever uploaded.
  insert into public.todos (client_id, source_type, parent_type, parent_id, doc_type, description, status)
  select dr.client_id, 'document', 'driver', dr.id, dt.doc_type,
    dr.name || ': ' || dt.doc_type || ' missing', 'open'
  from public.drivers dr
  cross join (values ('Licence check'), ('CPC')) as dt(doc_type)
  where not exists (
      select 1 from public.documents d
      where d.parent_type = 'driver' and d.parent_id = dr.id and d.doc_type = dt.doc_type
    )
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'document' and t.status = 'open'
        and t.parent_type = 'driver' and t.parent_id = dr.id and t.doc_type = dt.doc_type
    );

  -- Infringement todos: unchanged, backfills anything created before the
  -- trigger existed (e.g. seeded data).
  insert into public.todos (client_id, source_type, source_id, description, status)
  select i.client_id, 'infringement', i.id, i.category || ': ' || i.type, 'open'
  from public.infringements i
  where i.resolved = false
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'infringement' and t.source_id = i.id and t.status = 'open'
    );
$$;
