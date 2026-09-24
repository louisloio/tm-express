-- Adds Gmail/Microsoft OAuth as alternative mailbox-connection methods
-- alongside the existing generic SMTP path. See supabase/009_mailboxes.sql
-- for the base tables.

alter table public.mailboxes
  add column if not exists provider text not null default 'smtp'
    check (provider in ('smtp', 'google', 'microsoft'));

alter table public.mailboxes
  add column if not exists needs_reauth boolean not null default false;

alter table public.mailboxes alter column smtp_host drop not null;
alter table public.mailboxes alter column smtp_port drop not null;
alter table public.mailboxes alter column smtp_username drop not null;

-- Generic name: holds either an SMTP password or an OAuth refresh token,
-- depending on provider — the encryption handling is identical either way.
alter table public.mailbox_secrets
  rename column encrypted_password to encrypted_secret;
