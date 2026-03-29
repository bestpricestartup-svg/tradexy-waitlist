-- =============================================================================
-- PRODUCTION (vienintelis kanoninis failas naujam deploy / trūkstamoms lentelėms)
-- =============================================================================
-- Paleiskite ŠĮ failą vieną kartą: Supabase Dashboard → SQL → New query → Run.
-- Sukuria (CREATE IF NOT EXISTS): waiting_list, waitlist_codes, admin_login_codes,
-- waitlist_attempts — tai vienintelis „source of truth“ šiai aplikacijai.
--
-- Jei jau turite seną `waiting_list` su kita struktūra, PRIEŠ šį failą vieną kartą
-- paleiskite: supabase/migrate_legacy_waiting_list.sql (tada vėl šį schema.sql — saugu).
--
-- Kiti `supabase/migrate_*.sql` failai yra tik istoriniai / daliniai; naujiems projektams
-- pakanka tik šio failo.
-- =============================================================================

-- Waiting list + OTP — serveris naudoja service role (PostgREST); RLS įjungta, politikos — pagal poreikį

create table if not exists public.waiting_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'verified')),
  created_at timestamptz not null default now(),
  verified_at timestamptz null
);

create unique index if not exists waiting_list_email_unique
  on public.waiting_list (lower(email));

create index if not exists waiting_list_status_idx
  on public.waiting_list (status);

create index if not exists waiting_list_created_at_idx
  on public.waiting_list (created_at desc);

alter table public.waiting_list enable row level security;

-- 6-digit OTP (server-only)
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

-- Admin prisijungimas (OTP per Resend, ne Supabase email)
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

-- Rate limiting (send / join / resend)
create table if not exists public.waitlist_attempts (
  id uuid primary key default gen_random_uuid(),
  email text null,
  ip text null,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_attempts_created_at_idx
  on public.waitlist_attempts (created_at desc);

create index if not exists waitlist_attempts_email_created_idx
  on public.waitlist_attempts (lower(email), created_at desc);

create index if not exists waitlist_attempts_ip_created_idx
  on public.waitlist_attempts (ip, created_at desc);

alter table public.waitlist_attempts enable row level security;
