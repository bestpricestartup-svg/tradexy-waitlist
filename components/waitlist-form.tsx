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
      <div className="mt-10 w-full max-w-md space-y-4">
        <div
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-200"
          role="status"
        >
          <p className="font-semibold">Already on the waitlist</p>
          <p className="mt-1">{info}</p>
        </div>
        <p className="text-center text-xs text-neutral-500">
          Get early access when we launch
        </p>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form
        className="mt-10 w-full max-w-md space-y-4"
        onSubmit={onVerify}
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>
        <div>
          <label className="sr-only" htmlFor="code">
            Verification code
          </label>
          <input
            autoComplete="one-time-code"
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
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
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400" role="status">
            {info}
          </p>
        )}

        <button
          className="flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          disabled={loading || code.length !== 6}
          type="submit"
        >
          {loading ? "Checking…" : "Verify code"}
        </button>

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <button
            className="text-sm text-neutral-600 underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50 dark:text-neutral-400"
            disabled={resendSec > 0 || loading}
            onClick={onResend}
            type="button"
          >
            {resendSec > 0 ? `Resend code in ${resendSec}s` : "Resend code"}
          </button>
          <button
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
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

        <p className="text-center text-xs text-neutral-500">
          Get early access when we launch
        </p>
      </form>
    );
  }

  return (
    <form className="mt-10 w-full max-w-md space-y-4" onSubmit={onSubmitEmail}>
      <div>
        <label className="sr-only" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-100"
          disabled={loading}
          id="email"
          name="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {debugInfo && (
        <pre className="max-h-32 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-left text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {debugInfo}
        </pre>
      )}

      <button
        className="flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        disabled={loading}
        type="submit"
      >
        {loading ? "Sending…" : "Join waitlist"}
      </button>

      <p className="text-center text-xs text-neutral-500">
        Get early access when we launch
      </p>
    </form>
  );
}
