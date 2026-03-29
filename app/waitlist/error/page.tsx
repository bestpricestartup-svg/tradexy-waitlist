import Link from "next/link";

export default function WaitlistErrorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-tx-surface/55 p-8 shadow-card backdrop-blur-xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Verification failed
          </h1>
          <p className="mt-3 text-tx-muted">
            This link is invalid or expired. Please try again.
          </p>
          <Link
            className="mt-8 inline-flex text-sm font-medium text-tx-cyan underline decoration-tx-cyan/40 underline-offset-4 transition hover:text-tx-neon"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
