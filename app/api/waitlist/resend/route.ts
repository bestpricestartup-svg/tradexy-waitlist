import { NextResponse } from "next/server";

import { sendWaitlistCode } from "@/lib/waitlist/code-service";
import { getRequestIpFromHeaders } from "@/lib/utils/request";

/** Same as POST /api/waitlist/join: new code, invalidates previous rows for email. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: "invalid_email", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, status: "invalid_email", message: "Invalid request." },
      { status: 400 }
    );
  }

  const email =
    "email" in body && typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";

  const ip = getRequestIpFromHeaders(request.headers);
  const result = await sendWaitlistCode(email, ip);

  if (!result.ok) {
    const status =
      result.status === "invalid_email"
        ? 400
        : result.status === "rate_limited"
          ? 429
          : result.status === "email_send_failed"
            ? 502
            : 500;

    const messages: Record<string, string> = {
      invalid_email: "Please enter a valid email.",
      rate_limited: "Too many attempts. Please try again later.",
      error: "Something went wrong. Please try again.",
      email_send_failed: "Could not send email. Please try again later.",
    };

    const payload: Record<string, unknown> = {
      ok: false,
      status: result.status,
      message: messages[result.status] ?? "Something went wrong.",
    };
    if (
      process.env.NODE_ENV === "development" &&
      "debug" in result &&
      result.debug
    ) {
      payload.debug = result.debug;
    }

    return NextResponse.json(payload, { status });
  }

  if (result.status === "already_joined_verified") {
    return NextResponse.json({
      ok: true,
      status: "already_joined_verified",
      message: "This email is already verified.",
    });
  }

  return NextResponse.json({
    ok: true,
    status: "verification_sent",
    message: "A new code was sent to your email.",
  });
}
