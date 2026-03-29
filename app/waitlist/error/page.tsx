import Link from "next/link";

export default function WaitlistErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Verification failed</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        This link is invalid or expired. Please try again.
      </p>
      <Link
        className="mt-8 text-sm font-medium text-neutral-900 underline underline-offset-4 dark:text-neutral-100"
        href="/"
      >
        Back to home
      </Link>
    </main>
  );
}
