import Link from "next/link";
import { redirect } from "next/navigation";

import { adminSignOut } from "@/app/admin/actions";
import { getAdminEmail } from "@/lib/admin-auth";
import { getAdminSessionEmail } from "@/lib/admin/session-cookie";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const configured = getAdminEmail();
  if (!configured) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="mx-auto max-w-6xl flex-1 px-4 py-10">
          <p className="text-red-400">
            Set{" "}
            <code className="rounded-md border border-white/10 bg-tx-elevated px-1.5 py-0.5 text-slate-200">
              ADMIN_EMAIL
            </code>{" "}
            in the environment.
          </p>
        </main>
      </div>
    );
  }

  const sessionEmail = await getAdminSessionEmail();
  if (!sessionEmail) {
    redirect("/admin/login?next=/admin/waitlist");
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("waiting_list")
    .select("id, email, status, created_at, verified_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[waitlist] admin list failed", error.message);
    return (
      <div className="flex min-h-screen flex-col">
        <main className="mx-auto max-w-6xl flex-1 px-4 py-10">
          <p className="text-red-400">Failed to load waitlist.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Waitlist</h1>
            <p className="mt-1 text-sm text-tx-muted">
              Signed in as {sessionEmail}. Newest first.
            </p>
          </div>
          <form action={adminSignOut}>
            <button
              className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/[0.07]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-white/10 bg-tx-surface/40 shadow-card backdrop-blur-sm">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-tx-elevated/80">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-300">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">
                  Created
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-300">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(rows ?? []).map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">
                    {row.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs">
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-tx-muted">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-tx-muted">
                    {row.verified_at
                      ? new Date(row.verified_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Link
          className="mt-8 inline-flex text-sm text-tx-muted transition hover:text-tx-cyan"
          href="/"
        >
          ← Home
        </Link>
      </main>
    </div>
  );
}
