/** Server-only. `ADMIN_EMAIL` is normalized once via trim + lowercase. */
export function getAdminEmail(): string | null {
  const e = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return e || null;
}

/** Compare admin policy using normalized lowercase on both sides. */
export function isAdminUserEmail(email: string | undefined | null): boolean {
  const admin = getAdminEmail();
  if (!admin || !email) return false;
  return email.trim().toLowerCase() === admin;
}

/**
 * Only these paths may follow `?next=` on /auth/callback (blocks external URLs and //evil.com).
 */
export function safeAdminRedirectPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("..") || next.includes("\\")) return null;
  if (next.includes("://") || next.includes("%3a%2f%2f")) return null;
  const allowed = new Set(["/admin/waitlist", "/admin/login"]);
  if (allowed.has(next)) return next;
  return null;
}
