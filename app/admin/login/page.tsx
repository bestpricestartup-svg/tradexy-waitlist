import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import {
  getAdminEmail,
  safeAdminRedirectPath,
} from "@/lib/admin-auth";
import { getAdminSessionEmail } from "@/lib/admin/session-cookie";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const configured = getAdminEmail();

  if (!configured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="text-red-600">ADMIN_EMAIL is not set in the environment.</p>
      </main>
    );
  }

  const nextPath = safeAdminRedirectPath(sp.next ?? null) ?? "/admin/waitlist";
  const sessionEmail = await getAdminSessionEmail();
  if (sessionEmail) {
    redirect(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Admin sign in</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        We&apos;ll email you a 6-digit code (Tradexy, via Resend).
      </p>
      <div className="mt-8">
        <AdminLoginForm error={sp.error} />
      </div>
      <Link
        className="mt-10 text-sm text-neutral-600 underline dark:text-neutral-400"
        href="/"
      >
        ← Home
      </Link>
    </main>
  );
}
