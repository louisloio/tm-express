-- Archiving a client clears its open todos, and reconcile_todos() stops
-- (re)creating todos for archived clients' vehicles/drivers/documents/
-- infringements — without that second half the todos would simply reappear
-- on the next Home/CompanyPage load, since a client's vehicles and drivers
-- aren't themselves archived when the client is. Run after
-- supabase/012_licence_validity.sql.

create or replace function public.resolve_todos_on_client_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.todos set status = 'resolved', resolved_at = now()
    where client_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_archive_resolves_todos on public.clients;
create trigger clients_archive_resolves_todos
  after update of archived_at on public.clients
  for each row execute function public.resolve_todos_on_client_archive();

-- Backfill: clients archived before this existed may still have open todos.
update public.todos set status = 'resolved', resolved_at = now()
where status = 'open'
  and client_id in (select id from public.clients where archived_at is not null);

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
  where c.archived_at is null
    and d.expiry_date is not null
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
    and exists (select 1 from public.clients c where c.id = v.client_id and c.archived_at is null)
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
  cross join (values ('Licence validity'), ('Licence check'), ('CPC')) as dt(doc_type)
  where dr.archived_at is null
    and exists (select 1 from public.clients c where c.id = dr.client_id and c.archived_at is null)
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
    and exists (select 1 from public.clients c where c.id = i.client_id and c.archived_at is null)
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'infringement' and t.source_id = i.id and t.status = 'open'
    );
$$;
