-- Splits the old single 'Licence check' driver doc slot into two:
--   - 'Licence validity' — the driver's actual driving licence document,
--     tracked the same expiry-driven way as MOT/VED/etc.
--   - 'Licence check' — the DVLA licence-check result (a "Licence summary"
--     PDF from https://www.gov.uk/check-driving-licence), which already
--     carries the 'Date checked' field added in 011_driver_fields.sql.
-- Run after supabase/011_driver_fields.sql.

alter table public.documents drop constraint documents_doc_type_check;
alter table public.documents add constraint documents_doc_type_check check (doc_type in (
  'PMI', 'Brake test', 'MOT', 'VED', 'Insurance',
  'Licence validity', 'Licence check', 'CPC', 'Infringement report', 'Depot visit note', 'Other'
));

-- Every document previously logged under 'Licence check' was tracking the
-- licence document's own validity (the 'Date checked' field didn't exist
-- until 011) — backfill those rows to the new, more accurate name. Going
-- forward 'Licence check' means only a DVLA check result.
update public.documents set doc_type = 'Licence validity' where doc_type = 'Licence check';
update public.todos set doc_type = 'Licence validity' where doc_type = 'Licence check';
update public.todos
set description = replace(description, 'Licence check', 'Licence validity')
where doc_type = 'Licence validity' and description like '%Licence check%';

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
  cross join (values ('Licence validity'), ('Licence check'), ('CPC')) as dt(doc_type)
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
