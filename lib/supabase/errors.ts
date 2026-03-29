/** PostgREST / Supabase klaida, kai lentelės nėra schemoje. */
export function isMissingTableError(err: {
  message?: string;
  code?: string;
  details?: string;
}): boolean {
  const c = String(err.code ?? "");
  if (c === "PGRST205") return true;
  const m = String(err.message ?? "").toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("does not exist")
  );
}

/**
 * Aiškus serverio logas, kai lentelė trūksta ne development aplinkoje.
 * Memory OTP ir kiti bypass'ai leidžiami tik `NODE_ENV === "development"`.
 */
export function logMissingTableProduction(
  context: string,
  err: { message?: string; code?: string }
): void {
  if (process.env.NODE_ENV === "development") return;
  console.error(
    `[PRODUCTION][${context}] Required table missing or not in PostgREST schema cache. Apply supabase/schema.sql in Supabase SQL Editor.`,
    err.message ?? err
  );
}
