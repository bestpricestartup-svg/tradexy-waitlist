import { NextResponse } from "next/server";

import { verifyWaitlistCode } from "@/lib/waitlist/code-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: "invalid_input", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, status: "invalid_input", message: "Invalid request." },
      { status: 400 }
    );
  }

  const email =
    "email" in body && typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";
  const code =
    "code" in body && typeof (body as { code: unknown }).code === "string"
      ? (body as { code: string }).code
      : "";

  const result = await verifyWaitlistCode(email, code);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      status: "verified",
      message: "Verified.",
    });
  }

  const statusMap: Record<string, number> = {
    invalid_input: 400,
    invalid_code: 401,
    expired: 410,
    locked: 429,
    error: 500,
  };

  const payload: Record<string, unknown> = {
    ok: false,
    status: result.status,
    message: result.message,
  };
  if (
    process.env.NODE_ENV === "development" &&
    "debug" in result &&
    result.debug
  ) {
    payload.debug = result.debug;
  }

  return NextResponse.json(payload, { status: statusMap[result.status] ?? 400 });
}
