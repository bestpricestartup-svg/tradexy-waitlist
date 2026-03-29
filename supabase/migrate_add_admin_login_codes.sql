-- (Istorinis) Įtraukta į supabase/schema.sql — naujiems deploy naudokite tik schema.sql

create table if not exists public.admin_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  verify_attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_codes_email_idx
  on public.admin_login_codes (email);

alter table public.admin_login_codes enable row level security;
