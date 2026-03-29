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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-600">
          Set <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">ADMIN_EMAIL</code>{" "}
          in the environment.
        </p>
      </main>
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-600">Failed to load waitlist.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Waitlist</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Signed in as {sessionEmail}. Newest first.
          </p>
        </div>
        <form action={adminSignOut}>
          <button
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-600"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          <thead className="bg-neutral-50 dark:bg-neutral-900/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {(rows ?? []).map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  {row.email}
                </td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {row.created_at
                    ? new Date(row.created_at).toLocaleString()
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-600 dark:text-neutral-400">
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
        className="mt-8 inline-block text-sm text-neutral-600 underline dark:text-neutral-400"
        href="/"
      >
        ← Home
      </Link>
    </main>
  );
}
