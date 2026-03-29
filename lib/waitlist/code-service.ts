import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistVerificationEmail } from "@/lib/resend/emails";
import {
  isMissingTableError,
  logMissingTableProduction,
} from "@/lib/supabase/errors";
import {
  otpMemoryDelete,
  otpMemorySet,
  otpMemoryVerify,
} from "@/lib/waitlist/otp-memory";
import {
  checkWaitlistRateLimit,
  recordWaitlistAttempt,
} from "@/lib/utils/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/utils/validators";

const MAX_VERIFY_ATTEMPTS = 5;
const CODE_TTL_MS = 10 * 60 * 1000;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

/** 6-digit code (100000–999999), per spec. */
export function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type SendCodeResult =
  | { ok: true; status: "verification_sent" | "already_joined_verified" }
  | {
      ok: false;
      status:
        | "invalid_email"
        | "rate_limited"
        | "error"
        | "email_send_failed";
      message: string;
      debug?: string;
    };

export async function sendWaitlistCode(
  rawEmail: string,
  ip: string
): Promise<SendCodeResult> {
  try {
    return await sendWaitlistCodeInner(rawEmail, ip);
  } catch (error) {
    console.error("WAITLIST ERROR (sendWaitlistCode top-level):", error);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: "error",
      message: "Something went wrong. Please try again.",
      ...(isDev() && { debug: msg }),
    };
  }
}

async function sendWaitlistCodeInner(
  rawEmail: string,
  ip: string
): Promise<SendCodeResult> {
  console.log("[waitlist] sendWaitlistCode start, ip:", ip);

  const email = normalizeEmail(rawEmail ?? "");

  if (!isValidEmail(email)) {
    return {
      ok: false,
      status: "invalid_email",
      message: "Please enter a valid email.",
    };
  }

  const admin = createAdminClient();

  const { data: row, error: selectError } = await admin
    .from("waiting_list")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (selectError) {
    console.error(
      "[waitlist] waiting_list select failed:",
      selectError.message,
      JSON.stringify(selectError)
    );
    return {
      ok: false,
      status: "error",
      message: "Something went wrong. Please try again.",
      ...(isDev() && { debug: `waiting_list select: ${selectError.message}` }),
    };
  }

  if (row?.status === "verified") {
    return {
      ok: true,
      status: "already_joined_verified",
    };
  }

  const rate = await checkWaitlistRateLimit(admin, email, ip);
  if (!rate.allowed) {
    return {
      ok: false,
      status: "rate_limited",
      message: "Too many attempts. Please try again later.",
    };
  }

  if (!row) {
    const { error: insertError } = await admin.from("waiting_list").insert({
      email,
      status: "pending",
    });

    if (insertError) {
      const code = "code" in insertError ? String(insertError.code) : "";
      const isDup =
        code === "23505" ||
        /duplicate|unique/i.test(insertError.message ?? "");

      if (!isDup) {
        console.error(
          "[waitlist] waiting_list insert failed:",
          insertError.message,
          JSON.stringify(insertError)
        );
        return {
          ok: false,
          status: "error",
          message: "Something went wrong. Please try again.",
          ...(isDev() && {
            debug: `waiting_list insert: ${insertError.message}`,
          }),
        };
      }
    }
  }

  const { error: delErr } = await admin
    .from("waitlist_codes")
    .delete()
    .eq("email", email);
  if (delErr && !isMissingTableError(delErr)) {
    console.error("[waitlist] waitlist_codes delete:", delErr.message);
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  console.log("[waitlist] generated OTP, expires_at:", expiresAt);

  const { error: codeInsertError } = await admin.from("waitlist_codes").insert({
    email,
    code,
    expires_at: expiresAt,
    verify_attempts: 0,
  });

  let usedMemoryOtp = false;

  if (codeInsertError) {
    if (isMissingTableError(codeInsertError) && isDev()) {
      otpMemorySet(email, code);
      usedMemoryOtp = true;
      console.warn(
        "[waitlist] waitlist_codes missing — using dev memory store:",
        codeInsertError.message
      );
    } else {
      if (isMissingTableError(codeInsertError)) {
        logMissingTableProduction("waitlist_codes insert", codeInsertError);
      }
      console.error(
        "[waitlist] waitlist_codes insert failed:",
        codeInsertError.message,
        JSON.stringify(codeInsertError)
      );
      return {
        ok: false,
        status: "error",
        message: "Something went wrong. Please try again.",
        ...(isDev() && {
          debug: `waitlist_codes insert: ${codeInsertError.message}`,
        }),
      };
    }
  }

  try {
    console.log("[waitlist] calling sendWaitlistVerificationEmail…");
    await sendWaitlistVerificationEmail(email, code);
  } catch (e) {
    console.error("WAITLIST ERROR (email send):", e);
    if (!usedMemoryOtp) {
      await admin.from("waitlist_codes").delete().eq("email", email);
    }
    otpMemoryDelete(email);
    return {
      ok: false,
      status: "email_send_failed",
      message: "Could not send email. Please try again later.",
      ...(isDev() && {
        debug: e instanceof Error ? e.message : String(e),
      }),
    };
  }

  await recordWaitlistAttempt(admin, email, ip);

  console.log("[waitlist] sendWaitlistCode completed OK");
  return { ok: true, status: "verification_sent" };
}

export type VerifyCodeResult =
  | { ok: true }
  | {
      ok: false;
      status:
        | "invalid_input"
        | "invalid_code"
        | "expired"
        | "locked"
        | "error";
      message: string;
      debug?: string;
    };

function memoryVerifyToResult(
  v: "invalid" | "expired" | "locked"
): VerifyCodeResult {
  if (v === "invalid") {
    return {
      ok: false,
      status: "invalid_code",
      message: "Invalid code. Try again or request a new code.",
    };
  }
  if (v === "locked") {
    return {
      ok: false,
      status: "locked",
      message: "Too many wrong attempts. Request a new code.",
    };
  }
  return {
    ok: false,
    status: "expired",
    message: "Code expired. Request a new code.",
  };
}

export async function verifyWaitlistCode(
  rawEmail: string,
  rawCode: string
): Promise<VerifyCodeResult> {
  const email = normalizeEmail(rawEmail ?? "");
  const code = String(rawCode ?? "").replace(/\D/g, "").slice(0, 6);

  if (!isValidEmail(email) || code.length !== 6) {
    return {
      ok: false,
      status: "invalid_input",
      message: "Enter the 6-digit code from your email.",
    };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  async function finishVerified(): Promise<VerifyCodeResult> {
    const verifiedAt = new Date().toISOString();

    const { error: wlErr } = await admin.from("waiting_list").update({
      status: "verified",
      verified_at: verifiedAt,
    }).eq("email", email);

    if (wlErr) {
      console.error(
        "[waitlist] waiting_list verify update failed",
        wlErr.message
      );
      return {
        ok: false,
        status: "error",
        message: "Something went wrong. Please try again.",
        ...(isDev() && { debug: `waiting_list update: ${wlErr.message}` }),
      };
    }

    const { error: delCodesErr } = await admin
      .from("waitlist_codes")
      .delete()
      .eq("email", email);
    if (delCodesErr && !isMissingTableError(delCodesErr)) {
      console.error("[waitlist] waitlist_codes delete after verify", delCodesErr);
    }
    otpMemoryDelete(email);

    return { ok: true };
  }

  const { data: rows, error: selErr } = await admin
    .from("waitlist_codes")
    .select("id, code, expires_at, verify_attempts")
    .eq("email", email)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (selErr) {
    if (isMissingTableError(selErr) && isDev()) {
      const v = otpMemoryVerify(email, code);
      if (v === "ok") return finishVerified();
      if (v === "invalid" || v === "locked" || v === "expired") {
        return {
          ...memoryVerifyToResult(v),
          ...(isDev() && { debug: `waitlist_codes: ${selErr.message}` }),
        };
      }
    }
    if (isMissingTableError(selErr) && !isDev()) {
      logMissingTableProduction("waitlist_codes select", selErr);
    }
    console.error("[waitlist] waitlist_codes select failed", selErr.message);
    return {
      ok: false,
      status: "error",
      message: "Something went wrong. Please try again.",
      ...(isDev() && { debug: `waitlist_codes select: ${selErr.message}` }),
    };
  }

  const active = rows?.[0];

  if (!active?.id) {
    if (isDev()) {
      const v = otpMemoryVerify(email, code);
      if (v === "ok") return finishVerified();
      if (v === "invalid" || v === "locked") {
        return memoryVerifyToResult(v);
      }
    }
    return {
      ok: false,
      status: "expired",
      message: "Code expired. Request a new code.",
    };
  }

  if (active.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      status: "locked",
      message: "Too many wrong attempts. Request a new code.",
    };
  }

  if (active.code !== code) {
    const next = active.verify_attempts + 1;
    await admin
      .from("waitlist_codes")
      .update({ verify_attempts: next })
      .eq("id", active.id);

    return {
      ok: false,
      status: "invalid_code",
      message: "Invalid code. Try again or request a new code.",
    };
  }

  return finishVerified();
}
