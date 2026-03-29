import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { getAdminEmail, isAdminUserEmail } from "@/lib/admin-auth";

const COOKIE_NAME = "tradexy_admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function signingSecret(): string {
  const s =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!s) {
    throw new Error(
      "Set ADMIN_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY as fallback) for admin session signing"
    );
  }
  return s;
}

export async function setAdminSessionCookie(email: string): Promise<void> {
  const admin = getAdminEmail();
  if (!admin || !isAdminUserEmail(email)) {
    throw new Error("Invalid admin email");
  }

  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payload = Buffer.from(
    JSON.stringify({ email: email.trim().toLowerCase(), exp })
  ).toString("base64url");
  const sig = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");
  const token = `${payload}.${sig}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function getAdminSessionEmail(): Promise<string | null> {
  const admin = getAdminEmail();
  if (!admin) return null;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { email?: string; exp?: number };
    if (!data.email || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    if (data.email.toLowerCase() !== admin) return null;
    return data.email;
  } catch {
    return null;
  }
}

export async function clearAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
