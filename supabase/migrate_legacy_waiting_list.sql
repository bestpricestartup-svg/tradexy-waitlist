-- =============================================================================
-- Migracija: sena `public.waiting_list` → suderinama su minimalia app schema
-- Paleiskite vieną kartą Supabase SQL Editor, kai jau turite seną lentelę.
-- Pirmiausia backup / snapshot (pvz. Table Editor → export).
-- =============================================================================

-- 1) Užtikrinti, kad egzistuoja pagrindiniai stulpeliai (additive, saugu)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'waiting_list' AND column_name = 'email'
  ) THEN
    RAISE EXCEPTION 'waiting_list.email missing — check table name';
  END IF;
END $$;

ALTER TABLE public.waiting_list
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.waiting_list
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.waiting_list
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 2) Jei status buvo kitoks, nustatyti default ir apriboti reikšmes
--    Jei turite kitas reikšmes nei pending/verified, prieš CHECK pridėkite UPDATE, pvz.:
--    UPDATE public.waiting_list SET status = 'verified' WHERE status IN ('done','active');
UPDATE public.waiting_list
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE public.waiting_list
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.waiting_list
  DROP CONSTRAINT IF EXISTS waiting_list_status_check;

ALTER TABLE public.waiting_list
  ADD CONSTRAINT waiting_list_status_check
  CHECK (status IN ('pending', 'verified'));

-- 3) created_at — jei trūko, užpildyti iš kitų laukų arba now()
UPDATE public.waiting_list
SET created_at = COALESCE(created_at, now());

ALTER TABLE public.waiting_list
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.waiting_list
  ALTER COLUMN created_at SET NOT NULL;

-- 4) Email visada lowercase (unikalumas per lower(email))
UPDATE public.waiting_list
SET email = lower(trim(email))
WHERE email IS DISTINCT FROM lower(trim(email));

-- 5) Unikalus indeksas ant lower(email), jei dar nėra
CREATE UNIQUE INDEX IF NOT EXISTS waiting_list_email_unique
  ON public.waiting_list (lower(email));

-- 6) Papildomi indeksai (jei jau yra iš seno — IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS waiting_list_status_idx
  ON public.waiting_list (status);

CREATE INDEX IF NOT EXISTS waiting_list_created_at_idx
  ON public.waiting_list (created_at DESC);

-- 7) RLS (jei dar neįjungta)
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- 8) Pasirenkamai: pasenusieji stulpeliai (auth_user_id, source, utm, …) gali likti —
--    aplikacija jų nenaudoja. Jei norite išvalyti:
-- ALTER TABLE public.waiting_list DROP COLUMN IF EXISTS utm_source;
-- (atkomentuokite tik sąmoningai)

-- =============================================================================
-- `waitlist_attempts` (rate limit) — jei lentelės nėra, paleiskite ir `schema.sql`
-- arba šį bloką:
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.waitlist_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NULL,
  ip text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_attempts_created_at_idx
  ON public.waitlist_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS waitlist_attempts_email_created_idx
  ON public.waitlist_attempts (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS waitlist_attempts_ip_created_idx
  ON public.waitlist_attempts (ip, created_at DESC);

ALTER TABLE public.waitlist_attempts ENABLE ROW LEVEL SECURITY;
