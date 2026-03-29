import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminLoginEmail } from "@/lib/resend/emails";
import { generateSixDigitCode } from "@/lib/waitlist/code-service";
import {
  checkWaitlistRateLimit,
  recordWaitlistAttempt,
} from "@/lib/utils/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/utils/validators";

import { getAdminEmail, isAdminUserEmail } from "@/lib/admin-auth";
import {
  adminOtpMemoryDelete,
  adminOtpMemorySet,
  adminOtpMemoryVerify,
} from "@/lib/admin/otp-memory";
import {
  isMissingTableError,
  logMissingTableProduction,
} from "@/lib/supabase/errors";

const MAX_VERIFY_ATTEMPTS = 5;
const CODE_TTL_MS = 10 * 60 * 1000;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

export type AdminRequestCodeResult =
  | { ok: true }
  | { ok: false; message: string };

export async function requestAdminLoginCode(
  rawEmail: string,
  ip: string
): Promise<AdminRequestCodeResult> {
  const email = normalizeEmail(rawEmail ?? "");
  const adminEmail = getAdminEmail();

  if (!adminEmail) {
    return { ok: false, message: "Admin email is not configured." };
  }

  if (!isValidEmail(email) || !isAdminUserEmail(email)) {
    return { ok: false, message: "You are not allowed to sign in here." };
  }

  const admin = createAdminClient();
  const rate = await checkWaitlistRateLimit(admin, email, ip);
  if (!rate.allowed) {
    return { ok: false, message: "Too many attempts. Please try again later." };
  }

  const { error: delErr } = await admin
    .from("admin_login_codes")
    .delete()
    .eq("email", email);
  if (delErr && !isMissingTableError(delErr)) {
    console.error("[admin] admin_login_codes delete", delErr.message);
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error: ins } = await admin.from("admin_login_codes").insert({
    email,
    code,
    expires_at: expiresAt,
    verify_attempts: 0,
  });

  let usedMemory = false;

  if (ins) {
    if (isMissingTableError(ins) && isDev()) {
      adminOtpMemorySet(email, code);
      usedMemory = true;
      console.warn(
        "[admin] admin_login_codes missing — dev memory:",
        ins.message
      );
    } else {
      if (isMissingTableError(ins)) {
        logMissingTableProduction("admin_login_codes insert", ins);
      }
      console.error("[admin] admin_login_codes insert", ins.message);
      return { ok: false, message: "Something went wrong. Try again." };
    }
  }

  try {
    await sendAdminLoginEmail(email, code);
  } catch (e) {
    console.error("[admin] Resend failed", e);
    if (!usedMemory) {
      await admin.from("admin_login_codes").delete().eq("email", email);
    } else {
      adminOtpMemoryDelete(email);
    }
    return { ok: false, message: "Could not send email. Try again." };
  }

  await recordWaitlistAttempt(admin, email, ip);
  return { ok: true };
}

export type AdminVerifyCodeResult =
  | { ok: true }
  | { ok: false; message: string; status?: string; debug?: string };

export async function verifyAdminLoginCode(
  rawEmail: string,
  rawCode: string
): Promise<AdminVerifyCodeResult> {
  const email = normalizeEmail(rawEmail ?? "");
  const code = String(rawCode ?? "").replace(/\D/g, "").slice(0, 6);

  if (!isValidEmail(email) || code.length !== 6 || !isAdminUserEmail(email)) {
    return { ok: false, message: "Invalid code or email.", status: "invalid" };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error: selErr } = await admin
    .from("admin_login_codes")
    .select("id, code, expires_at, verify_attempts")
    .eq("email", email)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selErr) {
    if (isMissingTableError(selErr) && isDev()) {
      const v = adminOtpMemoryVerify(email, code);
      if (v === "ok") {
        return { ok: true };
      }
      if (v === "invalid") {
        return {
          ok: false,
          message: "Invalid code.",
          status: "invalid_code",
          ...(isDev() && { debug: selErr.message }),
        };
      }
      if (v === "locked") {
        return {
          ok: false,
          message: "Too many wrong attempts. Request a new code.",
          status: "locked",
          ...(isDev() && { debug: selErr.message }),
        };
      }
      return {
        ok: false,
        message: "Code expired. Request a new one.",
        status: "expired",
        ...(isDev() && { debug: selErr.message }),
      };
    }
    if (isMissingTableError(selErr) && !isDev()) {
      logMissingTableProduction("admin_login_codes select", selErr);
    }
    console.error("[admin] admin_login_codes select", selErr.message);
    return {
      ok: false,
      message: "Something went wrong.",
      ...(isDev() && { debug: selErr.message }),
    };
  }

  const row = rows?.[0];
  if (!row?.id) {
    if (isDev()) {
      const v = adminOtpMemoryVerify(email, code);
      if (v === "ok") {
        return { ok: true };
      }
      if (v === "invalid") {
        return { ok: false, message: "Invalid code.", status: "invalid_code" };
      }
      if (v === "locked") {
        return {
          ok: false,
          message: "Too many wrong attempts. Request a new code.",
          status: "locked",
        };
      }
    }
    return {
      ok: false,
      message: "Code expired. Request a new one.",
      status: "expired",
    };
  }

  if (row.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      message: "Too many wrong attempts. Request a new code.",
      status: "locked",
    };
  }

  if (row.code !== code) {
    await admin
      .from("admin_login_codes")
      .update({ verify_attempts: row.verify_attempts + 1 })
      .eq("id", row.id);
    return { ok: false, message: "Invalid code.", status: "invalid_code" };
  }

  await admin.from("admin_login_codes").delete().eq("email", email);
  return { ok: true };
}
