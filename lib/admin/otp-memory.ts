/** Dev fallback kai nėra `admin_login_codes` lentelės. */
type Entry = {
  code: string;
  expiresAt: number;
  verifyAttempts: number;
};

const memory = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function adminOtpMemorySet(email: string, code: string): void {
  const e = email.trim().toLowerCase();
  memory.set(e, {
    code,
    expiresAt: Date.now() + TTL_MS,
    verifyAttempts: 0,
  });
  console.warn(
    "[admin] OTP stored in dev memory for",
    e,
    "(run schema.sql for admin_login_codes in production)"
  );
  if (process.env.NODE_ENV === "development") {
    console.log("[admin][dev] OTP:", code);
  }
}

export function adminOtpMemoryVerify(
  email: string,
  code: string
): "ok" | "invalid" | "expired" | "locked" {
  const e = email.trim().toLowerCase();
  const row = memory.get(e);
  if (!row) return "expired";
  if (row.expiresAt < Date.now()) {
    memory.delete(e);
    return "expired";
  }
  if (row.verifyAttempts >= MAX_ATTEMPTS) return "locked";
  if (row.code !== code) {
    row.verifyAttempts += 1;
    return "invalid";
  }
  memory.delete(e);
  return "ok";
}

export function adminOtpMemoryDelete(email: string): void {
  memory.delete(email.trim().toLowerCase());
}
