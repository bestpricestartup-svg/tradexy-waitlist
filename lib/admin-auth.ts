/** Server-only. `ADMIN_EMAIL` may be one address or several, comma-separated. */

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isAdminConfigured(): boolean {
  return parseAdminEmails().length > 0;
}

/** Legacy: first allowlisted admin, or null. */
export function getAdminEmail(): string | null {
  const list = parseAdminEmails();
  return list[0] ?? null;
}

/** Compare admin policy using normalized lowercase on both sides. */
export function isAdminUserEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const n = email.trim().toLowerCase();
  return parseAdminEmails().includes(n);
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
