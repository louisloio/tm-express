-- TM Express — closes a gap in the Transport Manager auto-approval feature.
-- Run after supabase/006_profiles.sql.
--
-- 006's trigger only fires on the CLIENT's own insert/update, so a client
-- created (or last edited) before the user's profile name was set/changed to
-- match never gets re-evaluated — the match becomes true, but nothing
-- touches that client row to notice. Symptom: user sets their profile name
-- to match an existing client's Transport Manager, expects it to flip to
-- Approved, and it doesn't.
--
-- Fix: a second trigger that sweeps the user's own 'In Progress' clients
-- whenever their profile name changes, using the same contains_name_word()
-- match from 006. Same one-directional rule applies (only ever sets
-- Approved, never reverts).

create or replace function public.auto_approve_on_profile_update()
returns trigger
language plpgsql
as $$
begin
  update public.clients
  set onboarding_status = 'Approved'
  where user_id = new.id
    and onboarding_status = 'In Progress'
    and public.contains_name_word(transport_manager, new.first_name)
    and public.contains_name_word(transport_manager, new.last_name);
  return new;
end;
$$;

drop trigger if exists profiles_auto_approve on public.profiles;
create trigger profiles_auto_approve
  after update of first_name, last_name on public.profiles
  for each row execute function public.auto_approve_on_profile_update();

-- One-time sweep: catch any client whose Transport Manager already matched
-- a profile name that was set/changed before this trigger existed.
update public.clients c
set onboarding_status = 'Approved'
from public.profiles p
where c.user_id = p.id
  and c.onboarding_status = 'In Progress'
  and public.contains_name_word(c.transport_manager, p.first_name)
  and public.contains_name_word(c.transport_manager, p.last_name);
