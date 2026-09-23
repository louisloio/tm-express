-- TM Express — soft delete ("archive") for every entity, plus todo cleanup
-- when an archived row was the reason a todo existed. Run after
-- supabase/003_missing_document_todos.sql.
--
-- "Delete" in the app never removes a row — it sets archived_at, and every
-- query in the app filters archived_at is null. This keeps history intact
-- (todos, infringements, documents already reference these rows by id) while
-- making archived items disappear from the UI, per the request: "we don't
-- really delete we archive it and don't show it to the user".

alter table public.clients add column if not exists archived_at timestamptz;
alter table public.vehicles add column if not exists archived_at timestamptz;
alter table public.drivers add column if not exists archived_at timestamptz;
alter table public.visits add column if not exists archived_at timestamptz;
alter table public.infringements add column if not exists archived_at timestamptz;
alter table public.documents add column if not exists archived_at timestamptz;

-- ============================================================================
-- reconcile_todos(): archived vehicles/drivers/documents must not generate
-- or count toward todos.
-- ============================================================================
create or replace function public.reconcile_todos()
returns void
language sql
as $$
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
    where archived_at is null
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

  insert into public.todos (client_id, source_type, parent_type, parent_id, doc_type, description, status)
  select v.client_id, 'document', 'vehicle', v.id, dt.doc_type,
    v.registration || ': ' || dt.doc_type || ' missing', 'open'
  from public.vehicles v
  cross join (values ('MOT'), ('VED'), ('Insurance'), ('PMI'), ('Brake test')) as dt(doc_type)
  where v.archived_at is null
    and not exists (
      select 1 from public.documents d
      where d.parent_type = 'vehicle' and d.parent_id = v.id and d.doc_type = dt.doc_type
        and d.archived_at is null
    )
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'document' and t.status = 'open'
        and t.parent_type = 'vehicle' and t.parent_id = v.id and t.doc_type = dt.doc_type
    );

  insert into public.todos (client_id, source_type, parent_type, parent_id, doc_type, description, status)
  select dr.client_id, 'document', 'driver', dr.id, dt.doc_type,
    dr.name || ': ' || dt.doc_type || ' missing', 'open'
  from public.drivers dr
  cross join (values ('Licence check'), ('CPC')) as dt(doc_type)
  where dr.archived_at is null
    and not exists (
      select 1 from public.documents d
      where d.parent_type = 'driver' and d.parent_id = dr.id and d.doc_type = dt.doc_type
        and d.archived_at is null
    )
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'document' and t.status = 'open'
        and t.parent_type = 'driver' and t.parent_id = dr.id and t.doc_type = dt.doc_type
    );

  insert into public.todos (client_id, source_type, source_id, description, status)
  select i.client_id, 'infringement', i.id, i.category || ': ' || i.type, 'open'
  from public.infringements i
  where i.resolved = false
    and i.archived_at is null
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'infringement' and t.source_id = i.id and t.status = 'open'
    );
$$;

-- ============================================================================
-- Archiving a vehicle/driver/document/infringement clears its open todos —
-- an archived item shouldn't keep nagging. (Visits and clients don't
-- currently drive todos directly, so no trigger needed for those.)
-- ============================================================================
create or replace function public.resolve_todos_on_vehicle_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.todos set status = 'resolved', resolved_at = now()
    where parent_type = 'vehicle' and parent_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_archive_resolves_todos on public.vehicles;
create trigger vehicles_archive_resolves_todos
  after update of archived_at on public.vehicles
  for each row execute function public.resolve_todos_on_vehicle_archive();

create or replace function public.resolve_todos_on_driver_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.todos set status = 'resolved', resolved_at = now()
    where parent_type = 'driver' and parent_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_archive_resolves_todos on public.drivers;
create trigger drivers_archive_resolves_todos
  after update of archived_at on public.drivers
  for each row execute function public.resolve_todos_on_driver_archive();

-- Archiving a document resolves its slot's open todo (if any); if another
-- non-archived document still covers that slot, reconcile_todos() will
-- naturally leave things alone; if not, it'll recreate a "missing" todo next
-- load — no special-casing needed for that half.
create or replace function public.resolve_todos_on_document_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.todos set status = 'resolved', resolved_at = now()
    where source_type = 'document' and status = 'open'
      and parent_type = new.parent_type and parent_id = new.parent_id and doc_type = new.doc_type;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_archive_resolves_todos on public.documents;
create trigger documents_archive_resolves_todos
  after update of archived_at on public.documents
  for each row execute function public.resolve_todos_on_document_archive();

create or replace function public.resolve_todos_on_infringement_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.todos set status = 'resolved', resolved_at = now()
    where source_type = 'infringement' and source_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists infringements_archive_resolves_todos on public.infringements;
create trigger infringements_archive_resolves_todos
  after update of archived_at on public.infringements
  for each row execute function public.resolve_todos_on_infringement_archive();
