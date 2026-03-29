# Tradexy waitlist — Resend OTP + Supabase DB

Visi **el. laiškai** (waitlist kodas + admin prisijungimo kodas) siunčiami per **Resend** su tavo domeno adresu **`FROM_EMAIL`** (pvz. `Tradexy <hello@tradexyai.com>`). **Supabase Auth email / magic link** waitlist ir admin nebenaudojami.

## Kur naudojamas Resend

| Failas | Paskirtis |
|--------|-----------|
| `lib/resend/emails.ts` | `getResend()`, `requireFromEmail()`, `sendWaitlistVerificationEmail()`, `sendAdminLoginEmail()` — visi `emails.send({ from: process.env.FROM_EMAIL, ... })` |
| `lib/waitlist/code-service.ts` | Waitlist OTP siuntimas → `sendWaitlistVerificationEmail` |
| `lib/admin/otp-service.ts` | Admin OTP siuntimas → `sendAdminLoginEmail` |

**Priklausomybė:** npm paketas `resend` (oficialus SDK).

## Env

```env
ADMIN_EMAIL=bestpricestartup@gmail.com
RESEND_API_KEY=re_...
FROM_EMAIL=Tradexy <hello@tradexyai.com>
```

- **`ADMIN_EMAIL`** — vienintelis el. paštas, kuriuo galima prisijungti prie `/admin/login` (OTP ateina į šį dėžutę).
- **`FROM_EMAIL`** privalomas — be jo siuntimas meta klaidą (nėra fallback į `onboarding@resend.dev`).
- **Resend** projekte turi būti patvirtintas domenas `tradexyai.com` ir siuntimas iš `hello@...`.

## Admin prisijungimas

1. `/admin/login` → įvedi **`ADMIN_EMAIL`** (pvz. `bestpricestartup@gmail.com`) → gauni **6 skaitmenų kodą** el. paštu (Resend).
2. Įvedus teisingą kodą → pasirašytas **httpOnly slapukas** (`lib/admin/session-cookie.ts`).
3. **Supabase `signInWithOtp` pašalintas**; failas `lib/supabase/auth-email.ts` ištrintas.

Papildomai: `ADMIN_SESSION_SECRET` (arba fallback `SUPABASE_SERVICE_ROLE_KEY` slapuko HMAC).

## DB

- `waitlist_codes`, `waiting_list`, `waitlist_attempts` — kaip anksčiau.
- **Nauja:** `admin_login_codes` — žr. `supabase/schema.sql` arba `migrate_add_admin_login_codes.sql`.

## Seni magic link URL

`/auth/callback` nebetvirtina waitlist/admin per Supabase — nukreipia į `/waitlist/error`. Supabase **Redirect URLs** gali pašalinti arba palikti (nieko neperlaužia srauto).

## Lokalus testas

1. SQL paleistas (įskaitant `admin_login_codes`).
2. `.env.local` su `ADMIN_EMAIL`, `RESEND_API_KEY`, `FROM_EMAIL`; Resend domenas patvirtintas.
3. `npm run dev` — laiškai „from“ rodo `FROM_EMAIL` (pvz. `hello@tradexyai.com`); admin OTP ateina į `ADMIN_EMAIL` dėžutę.

## Vercel (production)

Nustatyk tuos pačius env kaip `.env.local` (**Settings → Environment Variables**), ypač **`ADMIN_EMAIL=bestpricestartup@gmail.com`**, tada **Redeploy**.

## Spam / inbox

- SPF, DKIM, DMARC `tradexyai.com` Resend DNS nustatymuose.
- Subject: `Your Tradexy verification code` (waitlist) ir `Your Tradexy admin login code` (admin).
- Body aiškiai rodo kodą monospace laukų formoje UI.
