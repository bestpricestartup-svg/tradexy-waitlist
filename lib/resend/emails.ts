import { readFile } from "fs/promises";
import path from "path";

import { Resend } from "resend";

const RESEND_TEST_FROM = "Tradexy <onboarding@resend.dev>";

/** Vienintelis leistinas el. laiško logotipas — `public/` aplanke, inline per Resend. */
const EMAIL_LOGO_FILENAME = "tradexy-email-logo.png";
/** Inline MIME Content-ID (must match `img src="cid:…"`). Keisk, jei Gmail rodo seną paveikslėlį. */
const EMAIL_LOGO_CID = "tradexy-wordmark";
/** `tradexy-email-logo.png` natūralūs px (wordmark); atvaizdavimas išlaiko proporciją. */
const LOGO_SRC_W = 715;
const LOGO_SRC_H = 182;
const LOGO_DISPLAY_W = 360;
const LOGO_DISPLAY_H = Math.round((LOGO_SRC_H * LOGO_DISPLAY_W) / LOGO_SRC_W);

async function requireEmailLogoForSend(): Promise<{
  logoSrc: string;
  attachments: {
    filename: string;
    content: Buffer;
    contentType: string;
    contentId: string;
  }[];
}> {
  const filePath = path.join(process.cwd(), "public", EMAIL_LOGO_FILENAME);
  let buf: Buffer;
  try {
    buf = await readFile(filePath);
  } catch {
    throw new Error(
      `Missing email logo: place ${EMAIL_LOGO_FILENAME} in the public/ folder (only this file is used).`
    );
  }
  if (buf.length === 0) {
    throw new Error(`Email logo file is empty: ${filePath}`);
  }
  return {
    logoSrc: `cid:${EMAIL_LOGO_CID}`,
    attachments: [
      {
        filename: EMAIL_LOGO_FILENAME,
        content: buf,
        contentType: "image/png",
        contentId: EMAIL_LOGO_CID,
      },
    ],
  };
}

/** Lentelė + aiškūs matmenys — Gmail kitaip gali „suskleisti“ platų PNG į kvadratą. */
function emailLogoBlock(logoSrc: string): string {
  const src = logoSrc.startsWith("cid:") ? logoSrc : escapeHtml(logoSrc);
  const w = LOGO_DISPLAY_W;
  const h = LOGO_DISPLAY_H;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td align="center" style="padding:0;line-height:0;mso-line-height-rule:exactly;">
      <img src="${src}" alt="Tradexy" width="${w}" height="${h}" border="0" style="display:block;width:${w}px;max-width:100%;height:auto;margin:0;padding:0;border:0;outline:none;text-decoration:none;vertical-align:top;-ms-interpolation-mode:bicubic;" />
    </td>
  </tr>
</table>`;
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
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
    contentId: string;
  }[];
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
      attachments: params.attachments,
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
function buildWaitlistVerificationHtml(safeCode: string, logoSrc: string): string {
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
          <td style="padding:32px 24px;text-align:center;">
            ${emailLogoBlock(logoSrc)}
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
function buildAdminLoginHtml(safeCode: string, logoSrc: string): string {
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
          <td style="padding:32px 24px;text-align:center;">
            ${emailLogoBlock(logoSrc)}
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
  }

  const safe = escapeHtml(code);
  const { logoSrc, attachments: logoAttachments } =
    await requireEmailLogoForSend();

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
    html: buildWaitlistVerificationHtml(safe, logoSrc),
    logLabel: "waitlist",
    attachments: logoAttachments,
  });
}

export async function sendAdminLoginEmail(to: string, code: string): Promise<void> {
  if (isDev()) {
    console.log("[admin] Sending email to:", to);
  }

  const safe = escapeHtml(code);
  const { logoSrc, attachments: logoAttachments } =
    await requireEmailLogoForSend();

  const textBody = `Your admin login code: ${code}

This code will expire in 10 minutes.

If you did not request this code, you can ignore this email.

– Tradexy`;

  await sendWithResendDevFallbacks({
    to,
    subject: "Your Tradexy admin login code",
    text: textBody,
    html: buildAdminLoginHtml(safe, logoSrc),
    logLabel: "admin",
    attachments: logoAttachments,
  });
}
