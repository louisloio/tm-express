-- Connected SMTP mailboxes, replacing the Resend/Reply-To chase pipeline
-- with real per-TM sending. Split into two tables so the encrypted
-- password is never reachable through RLS from the browser client, even
-- by accident (e.g. a future `select('*')`) — mailbox_secrets has RLS
-- enabled with zero policies for anon/authenticated, so only the
-- service-role key (used exclusively inside Edge Functions) can touch it.

create table if not exists public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  label text,
  smtp_host text not null,
  smtp_port int not null,
  smtp_secure boolean not null default true,
  smtp_username text not null,
  is_default boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.mailboxes enable row level security;

create policy "mailboxes_select_own" on public.mailboxes
  for select using (user_id = auth.uid());
create policy "mailboxes_insert_own" on public.mailboxes
  for insert with check (user_id = auth.uid());
create policy "mailboxes_update_own" on public.mailboxes
  for update using (user_id = auth.uid());
create policy "mailboxes_delete_own" on public.mailboxes
  for delete using (user_id = auth.uid());

create table if not exists public.mailbox_secrets (
  mailbox_id uuid primary key references public.mailboxes(id) on delete cascade,
  encrypted_password text not null,
  iv text not null
);

alter table public.mailbox_secrets enable row level security;
-- Deliberately no policies for anon/authenticated.

-- Only one default mailbox per user.
create or replace function public.mailboxes_enforce_single_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.mailboxes
    set is_default = false
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

drop trigger if exists mailboxes_enforce_single_default_trigger on public.mailboxes;
create trigger mailboxes_enforce_single_default_trigger
  before insert or update of is_default on public.mailboxes
  for each row
  execute function public.mailboxes_enforce_single_default();

-- Archiving the default mailbox auto-promotes another one, so the chase
-- modal's pre-selected From never silently goes stale.
create or replace function public.mailboxes_promote_on_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
begin
  if new.archived_at is not null and old.archived_at is null and old.is_default then
    new.is_default := false;

    select id into next_id
    from public.mailboxes
    where user_id = new.user_id
      and id <> new.id
      and archived_at is null
    order by verified_at desc nulls last, created_at desc
    limit 1;

    if next_id is not null then
      update public.mailboxes set is_default = true where id = next_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists mailboxes_promote_on_archive_trigger on public.mailboxes;
create trigger mailboxes_promote_on_archive_trigger
  before update of archived_at on public.mailboxes
  for each row
  execute function public.mailboxes_promote_on_archive();

alter table public.profiles drop column if exists send_from_email;
