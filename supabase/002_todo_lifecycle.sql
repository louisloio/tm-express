-- TM Express — Todo lifecycle (spec section 7). Run this in the Supabase
-- SQL Editor after supabase/schema.sql.
--
-- How the three rules from the spec map to this file:
--
-- 1. "A todo appears when a document reaches its expiry date, or the
--     reminder lead time before it" — document expiry is a moving target
--     (today crossing a threshold), not a discrete event, so there's no
--     single INSERT/UPDATE to hang a trigger off. Per the spec's own
--     "on-demand, not a background job" design, reconcile_todos() below
--     scans for newly-due documents and creates todos for them. It's called
--     from the app every time a todo list is loaded (no cron/Edge Function).
--
-- 2. "Uploading a new document resolves the todo" — this IS a discrete
--     event (a documents INSERT), so it's a trigger: resolve_document_todos()
--     fires after every document upload and resolves any open todo for the
--     same vehicle/driver + doc_type.
--
-- 3. "Chasing snoozes the todo for 3 days; it reappears if nothing was
--     uploaded" — chasing is also a discrete event (an email_chases INSERT),
--     so apply_chase_cooling() sets todos.snoozed_until = sent_at + 3 days.
--     Reappearing needs no code at all: the app's todo-list query already
--     filters out snoozed_until > now(), so once that timestamp passes, the
--     same still-open todo just stops being filtered out.

-- ============================================================================
-- On-demand reconciliation (rule 1, plus a backfill for infringement todos
-- in case any were created before this file's trigger existed — e.g. seeded
-- data)
-- ============================================================================
create or replace function public.reconcile_todos()
returns void
language sql
as $$
  -- Only the current document per (parent, doc_type) is relevant — a doc
  -- history row that's been superseded by a fresh upload (and whose todo
  -- the resolve trigger already closed out) must NOT be re-scanned here,
  -- or it resurrects a todo for something that's already been dealt with.
  insert into public.todos (client_id, source_type, source_id, description, status)
  select
    d.client_id,
    'document',
    d.id,
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
      where t.source_type = 'document' and t.source_id = d.id and t.status = 'open'
    );

  insert into public.todos (client_id, source_type, source_id, description, status)
  select i.client_id, 'infringement', i.id, i.category || ': ' || i.type, 'open'
  from public.infringements i
  where i.resolved = false
    and not exists (
      select 1 from public.todos t
      where t.source_type = 'infringement' and t.source_id = i.id and t.status = 'open'
    );
$$;

grant execute on function public.reconcile_todos() to authenticated;

-- ============================================================================
-- Rule 2: uploading a document resolves the matching open todo
-- ============================================================================
create or replace function public.resolve_document_todos()
returns trigger
language plpgsql
as $$
begin
  update public.todos t
  set status = 'resolved', resolved_at = now()
  from public.documents d
  where t.source_type = 'document'
    and t.source_id = d.id
    and t.status = 'open'
    and d.parent_type = new.parent_type
    and d.parent_id = new.parent_id
    and d.doc_type = new.doc_type
    and d.id <> new.id;
  return new;
end;
$$;

drop trigger if exists documents_resolve_todos on public.documents;
create trigger documents_resolve_todos
  after insert on public.documents
  for each row execute function public.resolve_document_todos();

-- ============================================================================
-- Rule 3: chasing snoozes the todo for 3 days (infringement todos are exempt
-- per spec — they aren't document-driven, so cooling doesn't apply)
-- ============================================================================
create or replace function public.apply_chase_cooling()
returns trigger
language plpgsql
as $$
begin
  if new.scope = 'single_todo' and new.todo_id is not null then
    update public.todos
    set snoozed_until = new.sent_at + interval '3 days'
    where id = new.todo_id
      and source_type = 'document';
  elsif new.scope = 'all_outstanding' then
    update public.todos
    set snoozed_until = new.sent_at + interval '3 days'
    where client_id = new.client_id
      and source_type = 'document'
      and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists email_chases_apply_cooling on public.email_chases;
create trigger email_chases_apply_cooling
  after insert on public.email_chases
  for each row execute function public.apply_chase_cooling();

-- ============================================================================
-- Infringement todos: created the moment the infringement is logged,
-- resolved the moment `resolved` flips to true
-- ============================================================================
create or replace function public.create_infringement_todo()
returns trigger
language plpgsql
as $$
begin
  insert into public.todos (client_id, source_type, source_id, description, status)
  values (new.client_id, 'infringement', new.id, new.category || ': ' || new.type, 'open');
  return new;
end;
$$;

drop trigger if exists infringements_create_todo on public.infringements;
create trigger infringements_create_todo
  after insert on public.infringements
  for each row execute function public.create_infringement_todo();

create or replace function public.resolve_infringement_todo()
returns trigger
language plpgsql
as $$
begin
  if new.resolved = true and old.resolved is distinct from true then
    update public.todos
    set status = 'resolved', resolved_at = now()
    where source_type = 'infringement' and source_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists infringements_resolve_todo on public.infringements;
create trigger infringements_resolve_todo
  after update of resolved on public.infringements
  for each row execute function public.resolve_infringement_todo();
