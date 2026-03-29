-- (Istorinis) Turinys įtrauktas į supabase/schema.sql — naujiems deploy naudokite tik schema.sql
-- Jei jau turite waiting_list be waitlist_codes — paleiskite vieną kartą

create table if not exists public.waitlist_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  verify_attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_codes_email_idx
  on public.waitlist_codes (email);

create index if not exists waitlist_codes_expires_idx
  on public.waitlist_codes (expires_at desc);

alter table public.waitlist_codes enable row level security;
