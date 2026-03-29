import { NextResponse } from "next/server";

function safeOriginFromSiteBase(siteBase: string): string {
  try {
    return new URL(siteBase.replace(/\/$/, "")).origin;
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * Redirect only to the same origin as `siteBase` + path (and optional query).
 * Path must start with `/` and must not be an open redirect (`//`, `://`, `..`).
 */
export function redirectSameOrigin(
  siteBase: string,
  pathWithOptionalQuery: string
): NextResponse {
  const origin = safeOriginFromSiteBase(siteBase);
  const fallback = `${origin}/waitlist/error`;

  if (
    !pathWithOptionalQuery.startsWith("/") ||
    pathWithOptionalQuery.startsWith("//")
  ) {
    return NextResponse.redirect(fallback);
  }
  if (
    pathWithOptionalQuery.includes("..") ||
    pathWithOptionalQuery.includes("\\") ||
    pathWithOptionalQuery.includes("://")
  ) {
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(`${origin}${pathWithOptionalQuery}`);
}
