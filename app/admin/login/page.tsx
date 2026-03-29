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
      <div className="flex min-h-screen flex-col">
        <main className="mx-auto max-w-lg flex-1 px-6 py-16">
          <p className="text-red-400">
            ADMIN_EMAIL is not set in the environment.
          </p>
        </main>
      </div>
    );
  }

  const nextPath = safeAdminRedirectPath(sp.next ?? null) ?? "/admin/waitlist";
  const sessionEmail = await getAdminSessionEmail();
  if (sessionEmail) {
    redirect(nextPath);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-tx-surface/55 p-8 shadow-card backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Admin sign in</h1>
          <p className="mt-2 text-sm text-tx-muted">
            We&apos;ll email you a 6-digit code (Tradexy, via Resend).
          </p>
          <div className="mt-8">
            <AdminLoginForm error={sp.error} />
          </div>
          <Link
            className="mt-10 inline-flex text-sm text-tx-muted transition hover:text-tx-cyan"
            href="/"
          >
            ← Home
          </Link>
        </div>
      </main>
    </div>
  );
}
