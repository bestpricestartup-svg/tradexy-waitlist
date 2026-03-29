import { Resend } from "resend";

const RESEND_TEST_FROM = "Tradexy <onboarding@resend.dev>";

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function requireApiKey(): string {
  const k = process.env.RESEND_API_KEY?.trim();
  if (!k) {
    const err = new Error("Missing RESEND_API_KEY");
    console.error("[resend]", err.message);
    throw err;
  }
  return k;
}

/**
 * Siunčia el. laišką: pirma FROM_EMAIL, dev'e — Resend test sender, paskui konsolėje (kad local flow veiktų be DNS).
 */
async function sendWithResendDevFallbacks(params: {
  to: string;
  subject: string;
  text: string;
  logLabel: string;
}): Promise<void> {
  let lastError: unknown;

  try {
    requireApiKey();
  } catch (e) {
    if (isDev()) {
      console.warn(
        `[resend] ${params.logLabel}: no API key — dev console fallback`
      );
      printDevConsoleEmail(params);
      return;
    }
    throw e;
  }

  const resend = new Resend(process.env.RESEND_API_KEY!.trim());
  const primaryFrom = process.env.FROM_EMAIL?.trim();

  const fromCandidates: string[] = [];
  if (primaryFrom) fromCandidates.push(primaryFrom);
  if (isDev() && !fromCandidates.includes(RESEND_TEST_FROM)) {
    fromCandidates.push(RESEND_TEST_FROM);
  }

  if (fromCandidates.length === 0) {
    if (isDev()) {
      console.warn("[resend] no FROM_EMAIL — using Resend test sender only");
      fromCandidates.push(RESEND_TEST_FROM);
    } else {
      throw new Error(
        "FROM_EMAIL is not set (e.g. Tradexy <hello@tradexyai.com>)"
      );
    }
  }

  for (const from of fromCandidates) {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });

    if (data && isDev()) {
      console.log(`[resend] ${params.logLabel} sent, id:`, data.id ?? "—");
    }

    if (!error) {
      return;
    }

    lastError = error;
    console.warn(`[resend] from="${from}" failed:`, JSON.stringify(error));
  }

  console.error(`RESEND ERROR (${params.logLabel}):`, lastError);

  if (isDev()) {
    console.warn(
      `[resend] ${params.logLabel}: all From addresses failed — dev console fallback`
    );
    printDevConsoleEmail(params);
    return;
  }

  throw new Error(
    lastError &&
      typeof lastError === "object" &&
      "message" in lastError &&
      typeof (lastError as { message: string }).message === "string"
      ? (lastError as { message: string }).message
      : "Resend send failed"
  );
}

function printDevConsoleEmail(params: {
  to: string;
  subject: string;
  text: string;
}): void {
  console.log("\n┌────────────────────────────────────────");
  console.log("│ TRADEXY DEV — email (not sent via API)");
  console.log("├────────────────────────────────────────");
  console.log("│ To:", params.to);
  console.log("│ Subject:", params.subject);
  console.log("│ ---");
  console.log(params.text.split("\n").map((l) => "│ " + l).join("\n"));
  console.log("└────────────────────────────────────────\n");
}

export function getResend(): Resend {
  return new Resend(requireApiKey());
}

export function requireFromEmail(): string {
  const f = process.env.FROM_EMAIL?.trim();
  if (!f) {
    throw new Error("FROM_EMAIL is not set");
  }
  return f;
}

export async function sendWaitlistVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  if (isDev()) {
    console.log("[waitlist] Sending email to:", to);
    console.log("[waitlist] FROM_EMAIL:", process.env.FROM_EMAIL ?? "(unset)");
  }

  await sendWithResendDevFallbacks({
    to,
    subject: "Your Tradexy verification code",
    text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    logLabel: "waitlist",
  });
}

export async function sendAdminLoginEmail(to: string, code: string): Promise<void> {
  if (isDev()) {
    console.log("[admin] Sending email to:", to);
  }

  await sendWithResendDevFallbacks({
    to,
    subject: "Your Tradexy admin login code",
    text: `Your admin login code is: ${code}\n\nThis code expires in 10 minutes.`,
    logLabel: "admin",
  });
}
