import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMissingTableError,
  logMissingTableProduction,
} from "@/lib/supabase/errors";

/**
 * Rate limiting uses `waitlist_attempts`:
 * - Before each OTP send (join / resend), COUNT recent rows by email and by IP.
 * - After a successful send, `recordWaitlistAttempt` inserts one row.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 15;

export async function checkWaitlistRateLimit(
  admin: SupabaseClient,
  email: string | null,
  ip: string
): Promise<{ allowed: true } | { allowed: false; reason: "email" | "ip" }> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  if (email) {
    const { count, error } = await admin
      .from("waitlist_attempts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("email", email);

    if (error) {
      if (isMissingTableError(error)) {
        logMissingTableProduction("waitlist_attempts (email count)", error);
      }
      console.error("[waitlist] rate_limit email count error", error.message);
      return { allowed: false, reason: "email" };
    }
    if ((count ?? 0) >= MAX_PER_EMAIL) {
      return { allowed: false, reason: "email" };
    }
  }

  if (ip && ip !== "unknown") {
    const { count, error } = await admin
      .from("waitlist_attempts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("ip", ip);

    if (error) {
      if (isMissingTableError(error)) {
        logMissingTableProduction("waitlist_attempts (ip count)", error);
      }
      console.error("[waitlist] rate_limit ip count error", error.message);
      return { allowed: false, reason: "ip" };
    }
    if ((count ?? 0) >= MAX_PER_IP) {
      return { allowed: false, reason: "ip" };
    }
  }

  return { allowed: true };
}

export async function recordWaitlistAttempt(
  admin: SupabaseClient,
  email: string,
  ip: string
): Promise<void> {
  const { error } = await admin.from("waitlist_attempts").insert({
    email,
    ip: ip || null,
  });
  if (error) {
    if (isMissingTableError(error)) {
      logMissingTableProduction("waitlist_attempts insert", error);
    }
    console.error("[waitlist] waitlist_attempts insert failed", error.message);
  }
}
