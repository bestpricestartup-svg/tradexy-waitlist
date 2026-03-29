import { Resend } from "resend";

const RESEND_TEST_FROM = "Tradexy <onboarding@resend.dev>";

/**
 * Logo turi būti viešai pasiekiamas (Gmail/Outlook krauna iš URL).
 * Jei `NEXT_PUBLIC_SITE_URL` yra localhost – naudojamas tradexyai.com.
 * Override: NEXT_PUBLIC_EMAIL_LOGO_URL=https://tradexyai.com/logo.png
 */
function logoAbsoluteUrl(): string {
  const override = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (
    base &&
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)
  ) {
    return `${base}/logo.png`;
  }
  return "https://tradexyai.com/logo.png";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

async function sendWithResendDevFallbacks(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
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
      html: params.html,
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
  console.log("│ --- text ---");
  console.log(params.text.split("\n").map((l) => "│ " + l).join("\n"));
  console.log("└────────────────────────────────────────\n");
}

/** Waitlist: šviesus šablonas, lentelėmis Outlook suderinamumui. */
function buildWaitlistVerificationHtml(safeCode: string): string {
  const logo = escapeHtml(logoAbsoluteUrl());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
</head>
<body style="margin:0;padding:0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;background:#f6f7f9;">
  <tr>
    <td align="center" style="padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;border-collapse:collapse;background:#ffffff;border-radius:12px;">
        <tr>
          <td style="padding:32px;text-align:center;">
            <img src="${logo}" alt="Tradexy" width="120" height="40" style="height:40px;width:auto;max-width:160px;margin:0 auto 24px auto;display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
            <h2 style="margin:0 0 16px;font-size:22px;color:#111111;line-height:1.3;">Your verification code</h2>
            <div style="font-size:32px;letter-spacing:6px;font-weight:600;color:#111111;background:#f1f3f5;padding:16px 24px;border-radius:8px;margin:20px 0;line-height:1.2;">${safeCode}</div>
            <p style="font-size:14px;color:#555555;margin:0 0 16px;line-height:1.5;">This code will expire in 10 minutes.</p>
            <p style="font-size:14px;color:#555555;margin:0 0 24px;line-height:1.5;">We built Tradexy to eliminate fake trading results and bring full transparency.<br/>All strategies will be backed by real performance data (Myfxbook verified).</p>
            <p style="font-size:13px;color:#888888;margin:0 0 24px;line-height:1.5;">You're early. First 500 users will get special access at launch.</p>
            <p style="font-size:12px;color:#aaaaaa;margin:0;">&#8211; Tradexy</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Admin: ta pati šviesi estetika, kompaktiškas turinys. */
function buildAdminLoginHtml(safeCode: string): string {
  const logo = escapeHtml(logoAbsoluteUrl());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
</head>
<body style="margin:0;padding:0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;background:#f6f7f9;">
  <tr>
    <td align="center" style="padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480" style="max-width:480px;width:100%;border-collapse:collapse;background:#ffffff;border-radius:12px;">
        <tr>
          <td style="padding:32px;text-align:center;">
            <img src="${logo}" alt="Tradexy" width="120" height="40" style="height:40px;width:auto;max-width:160px;margin:0 auto 24px auto;display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
            <h2 style="margin:0 0 16px;font-size:22px;color:#111111;line-height:1.3;">Your admin login code</h2>
            <div style="font-size:32px;letter-spacing:6px;font-weight:600;color:#111111;background:#f1f3f5;padding:16px 24px;border-radius:8px;margin:20px 0;line-height:1.2;">${safeCode}</div>
            <p style="font-size:14px;color:#555555;margin:0 0 16px;line-height:1.5;">This code will expire in 10 minutes.</p>
            <p style="font-size:13px;color:#888888;margin:0 0 24px;line-height:1.5;">If you did not request this code, you can ignore this email.</p>
            <p style="font-size:12px;color:#aaaaaa;margin:0;">&#8211; Tradexy</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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
    console.log("[waitlist] logo URL:", logoAbsoluteUrl());
  }

  const safe = escapeHtml(code);

  const textBody = `Your verification code: ${code}

This code will expire in 10 minutes.

We built Tradexy to eliminate fake trading results and bring full transparency.
All strategies will be backed by real performance data (Myfxbook verified).

You're early. First 500 users will get special access at launch.

– Tradexy`;

  await sendWithResendDevFallbacks({
    to,
    subject: "Your Tradexy verification code",
    text: textBody,
    html: buildWaitlistVerificationHtml(safe),
    logLabel: "waitlist",
  });
}

export async function sendAdminLoginEmail(to: string, code: string): Promise<void> {
  if (isDev()) {
    console.log("[admin] Sending email to:", to);
  }

  const safe = escapeHtml(code);

  const textBody = `Your admin login code: ${code}

This code will expire in 10 minutes.

If you did not request this code, you can ignore this email.

– Tradexy`;

  await sendWithResendDevFallbacks({
    to,
    subject: "Your Tradexy admin login code",
    text: textBody,
    html: buildAdminLoginHtml(safe),
    logLabel: "admin",
  });
}
