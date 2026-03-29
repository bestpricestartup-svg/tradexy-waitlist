"use client";

import { useActionState, useEffect, useState } from "react";

import {
  sendAdminLoginCodeAction,
  verifyAdminLoginCodeAction,
  type AdminLoginResult,
} from "@/app/admin/actions";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none transition focus:border-tx-neon/45 focus:ring-2 focus:ring-tx-neon/15";

const btnPrimaryClass =
  "w-full rounded-xl bg-gradient-cta py-3 text-sm font-semibold text-tx-bg shadow-neon-sm transition hover:brightness-105 disabled:opacity-50";

export function AdminLoginForm({ error }: { error?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [sendState, sendAction, sendPending] = useActionState(
    sendAdminLoginCodeAction,
    null as AdminLoginResult | null
  );

  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyAdminLoginCodeAction,
    null as AdminLoginResult | null
  );

  useEffect(() => {
    if (sendState?.ok) {
      setCode("");
      setStep(2);
    }
  }, [sendState]);

  if (step === 2) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <p className="text-sm text-tx-muted">
          Enter the 6-digit code sent to{" "}
          <strong className="text-slate-200">{email}</strong>
        </p>
        <form action={verifyAction} className="space-y-4">
          <input name="email" type="hidden" value={email} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="code">
              Code
            </label>
            <input
              autoComplete="one-time-code"
              className={`${inputClass} text-center font-mono text-2xl tracking-[0.3em]`}
              disabled={verifyPending}
              id="code"
              inputMode="numeric"
              maxLength={6}
              name="code"
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
          <button
            className={btnPrimaryClass}
            disabled={verifyPending}
            type="submit"
          >
            {verifyPending ? "Checking…" : "Sign in"}
          </button>
        </form>
        {verifyState && !verifyState.ok && (
          <p className="text-sm text-red-400" role="alert">
            {verifyState.message}
          </p>
        )}
        <button
          className="text-sm text-tx-cyan/90 underline decoration-tx-cyan/40 underline-offset-4"
          onClick={() => {
            setStep(1);
            setCode("");
          }}
          type="button"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {error === "forbidden" && (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          Access denied.
        </p>
      )}
      <form action={sendAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="email">
            Admin email
          </label>
          <input
            autoComplete="email"
            className={inputClass}
            disabled={sendPending}
            id="email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <button className={btnPrimaryClass} disabled={sendPending} type="submit">
          {sendPending ? "Sending…" : "Send login code"}
        </button>
      </form>
      {sendState && !sendState.ok && (
        <p className="text-sm text-red-400" role="alert">
          {sendState.message}
        </p>
      )}
      {sendState?.ok && (
        <p className="text-sm text-tx-muted" role="status">
          {sendState.message}
        </p>
      )}
    </div>
  );
}
