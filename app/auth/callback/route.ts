import { redirectSameOrigin } from "@/lib/internal-url";

/**
 * Seni Supabase magic link URL gali būti Redirect sąraše.
 * Waitlist ir admin naudoja Resend OTP — šis maršrutas tik saugiai nukreipia į klaidos puslapį.
 */
function siteBase(requestUrl: string): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(requestUrl).origin
  );
}

export async function GET(request: Request) {
  const base = siteBase(request.url);
  return redirectSameOrigin(base, "/waitlist/error");
}
