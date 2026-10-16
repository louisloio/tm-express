-- Driver postcode (optional), alongside licence number and date of birth.
-- Run after supabase/014_current_document_by_expiry.sql.

alter table public.drivers
  add column if not exists postcode text;
