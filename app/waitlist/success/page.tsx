import Link from "next/link";

export default function WaitlistSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-tx-surface/55 p-8 shadow-card backdrop-blur-xl">
          <div className="mb-4 inline-flex rounded-full border border-tx-neon/30 bg-tx-neon/10 px-3 py-1 text-xs font-medium text-tx-neon">
            Verified
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            You&apos;re on the waitlist
          </h1>
          <p className="mt-3 text-tx-muted">
            Your email has been confirmed successfully.
          </p>
          <Link
            className="mt-8 inline-flex text-sm font-medium text-tx-cyan underline decoration-tx-cyan/40 underline-offset-4 transition hover:text-tx-neon hover:decoration-tx-neon/50"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
