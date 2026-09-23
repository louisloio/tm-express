-- TM Express — schema support for the real EmailChase modal. Run after
-- supabase/007_profile_update_reevaluates_clients.sql.

-- Optional alternate address the user can set on their profile — used as
-- the Reply-To on chase emails when they pick it in the modal instead of
-- their account email.
alter table public.profiles add column if not exists send_from_email text;

-- Records which address was actually used (account email or the alternate)
-- for each chase, for the sent history.
alter table public.email_chases add column if not exists from_email text;
