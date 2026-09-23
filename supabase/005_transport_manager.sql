-- TM Express — adds the Transport Manager field back to clients (dropped
-- during initial CompanyPage build since it wasn't in the section 9 data
-- model; adding it now that it's wanted on the edit form). Run after
-- supabase/004_archive.sql.

alter table public.clients add column if not exists transport_manager text;
