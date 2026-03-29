"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

function normalizeEmailClient(raw: string): string {
  return raw.trim().toLowerCase();
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-tx-neon/45 focus:ring-2 focus:ring-tx-neon/15";

const btnPrimaryClass =
  "flex w-full items-center justify-center rounded-xl border border-white/20 bg-gradient-cta px-4 py-4 text-[15px] font-bold text-[#050607] shadow-neon ring-1 ring-tx-neon/25 transition hover:brightness-110 hover:shadow-[0_0_28px_-4px_rgba(52,245,181,0.55)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:ring-0";

export function WaitlistForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "already">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = window.setInterval(() => {
      setResendSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendSec]);

  const startCooldown = useCallback(() => {
    setResendSec(60);
  }, []);

  async function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    const em = normalizeEmailClient(email);
    setError(null);
    setInfo(null);
    setDebugInfo(null);
    setLoading(true);
    try {
      const r = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        status?: string;
        message?: string;
        debug?: string;
      };

      if (j.debug) {
        setDebugInfo(j.debug);
      }

      if (!j.ok) {
        setError(j.message ?? "Something went wrong.");
        return;
      }

      if (j.status === "already_joined_verified") {
        setStep("already");
        setInfo(j.message ?? "Already on the waitlist.");
        return;
      }

      setEmail(em);
      setStep("code");
      setCode("");
      startCooldown();
      setInfo("Enter the code we sent to your email.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const digits = code.replace(/\D/g, "").slice(0, 6);
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const r = await fetch("/api/waitlist/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!r.ok || !j.ok) {
        setError(j.message ?? "Verification failed.");
        return;
      }

      router.push("/waitlist/success");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendSec > 0 || loading) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const r = await fetch("/api/waitlist/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await r.json()) as { ok?: boolean; message?: string };
      if (!r.ok || !j.ok) {
        setError(j.message ?? "Could not resend.");
        return;
      }
      setInfo("A new code was sent.");
      startCooldown();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "already") {
    return (
      <div className="w-full space-y-4">
        <div
          className="rounded-xl border border-white/10 bg-tx-elevated/60 p-4 text-sm text-slate-200"
          role="status"
        >
          <p className="font-semibold text-tx-neon">Already on the waitlist</p>
          <p className="mt-1 text-tx-muted">{info}</p>
        </div>
        <p className="text-center text-xs text-slate-500">
          We&apos;ll notify you when Tradexy opens up.
        </p>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form className="w-full space-y-4" onSubmit={onVerify}>
        <p className="text-sm text-tx-muted">
          Enter the 6-digit code sent to{" "}
          <strong className="text-slate-200">{email}</strong>
        </p>
        <div>
          <label className="sr-only" htmlFor="code">
            Verification code
          </label>
          <input
            autoComplete="one-time-code"
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`}
            disabled={loading}
            id="code"
            inputMode="numeric"
            maxLength={6}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            pattern="[0-9]*"
            placeholder="000000"
            required
            type="text"
            value={code}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-tx-muted" role="status">
            {info}
          </p>
        )}

        <button
          className={btnPrimaryClass}
          disabled={loading || code.length !== 6}
          type="submit"
        >
          {loading ? "Checking…" : "Verify code"}
        </button>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <button
            className="text-sm text-tx-cyan/90 underline decoration-tx-cyan/40 underline-offset-4 transition hover:text-tx-cyan disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
            disabled={resendSec > 0 || loading}
            onClick={onResend}
            type="button"
          >
            {resendSec > 0 ? `Resend code in ${resendSec}s` : "Resend code"}
          </button>
          <button
            className="text-sm text-slate-500 transition hover:text-slate-300"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              setInfo(null);
              setResendSec(0);
            }}
            type="button"
          >
            Change email
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-500 sm:text-xs">
          Only first 500 users get access at launch.
        </p>
      </form>
    );
  }

  return (
    <form
      className="w-full space-y-5 sm:space-y-4"
      onSubmit={onSubmitEmail}
    >
      <div>
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={inputClass}
          disabled={loading}
          id="email"
          name="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          type="email"
          value={email}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {debugInfo && (
        <pre className="max-h-32 overflow-auto rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-100">
          {debugInfo}
        </pre>
      )}

      <button className={btnPrimaryClass} disabled={loading} type="submit">
        {loading ? "Sending…" : "Get early access"}
      </button>

      <div className="space-y-0.5 pt-0.5 text-center text-[11px] leading-snug text-slate-500 sm:text-xs">
        <p>Only first 500 users get access at launch.</p>
        <p>~367 spots left.</p>
      </div>
    </form>
  );
}
