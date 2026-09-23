-- TM Express — user profiles (first/last name, avatar) and automatic
-- onboarding approval when a client's Transport Manager matches the current
-- user's profile name. Run after supabase/005_transport_manager.sql.

-- ============================================================================
-- Profiles: one row per auth user, created automatically on signup
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- Auto-create a blank profile row whenever a new user signs up. This needs
-- SECURITY DEFINER because the trigger fires on auth.users, a schema regular
-- authenticated requests can't write to directly — this is the standard
-- Supabase pattern for syncing auth.users into a public profile table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for accounts that signed up before this migration existed.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ============================================================================
-- Avatar storage — public read (it's just a profile picture), write
-- restricted to the user's own folder, same pattern as the documents bucket.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select to public using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_update_own" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Auto-approval: a client's onboarding_status flips from 'In Progress' to
-- 'Approved' the moment its Transport Manager text contains both the owning
-- user's first AND last name as whole words, in either order (e.g. profile
-- "Malcolm Eley" matches "MALCOLM ROBERT ELEY" or "ELEY, MALCOLM"). This is
-- one-directional by design — editing Transport Manager away from a match
-- never reverts an already-Approved status, so a deliberate manual approval
-- is never silently undone.
-- ============================================================================
create or replace function public.contains_name_word(haystack text, needle text)
returns boolean
language sql
immutable
as $$
  select needle is not null and trim(needle) <> '' and position(
    ' ' || lower(trim(needle)) || ' ' in
    ' ' || lower(regexp_replace(coalesce(haystack, ''), '[.,]', ' ', 'g')) || ' '
  ) > 0
$$;

create or replace function public.auto_approve_on_transport_manager_match()
returns trigger
language plpgsql
as $$
declare
  p_first text;
  p_last text;
begin
  if new.onboarding_status = 'In Progress' and new.transport_manager is not null then
    select first_name, last_name into p_first, p_last
    from public.profiles where id = new.user_id;

    if public.contains_name_word(new.transport_manager, p_first)
       and public.contains_name_word(new.transport_manager, p_last) then
      new.onboarding_status := 'Approved';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_auto_approve on public.clients;
create trigger clients_auto_approve
  before insert or update of transport_manager on public.clients
  for each row execute function public.auto_approve_on_transport_manager_match();
