"use client";

import { useActionState, useEffect, useState } from "react";

import {
  sendAdminLoginCodeAction,
  verifyAdminLoginCodeAction,
  type AdminLoginResult,
} from "@/app/admin/actions";

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
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>
        <form action={verifyAction} className="space-y-4">
          <input name="email" type="hidden" value={email} />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="code">
              Code
            </label>
            <input
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-center font-mono text-2xl tracking-[0.3em] text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50"
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
            className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            disabled={verifyPending}
            type="submit"
          >
            {verifyPending ? "Checking…" : "Sign in"}
          </button>
        </form>
        {verifyState && !verifyState.ok && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {verifyState.message}
          </p>
        )}
        <button
          className="text-sm text-neutral-500 underline"
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
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Access denied.
        </p>
      )}
      <form action={sendAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Admin email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50"
            disabled={sendPending}
            id="email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <button
          className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          disabled={sendPending}
          type="submit"
        >
          {sendPending ? "Sending…" : "Send login code"}
        </button>
      </form>
      {sendState && !sendState.ok && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {sendState.message}
        </p>
      )}
      {sendState?.ok && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300" role="status">
          {sendState.message}
        </p>
      )}
    </div>
  );
}
