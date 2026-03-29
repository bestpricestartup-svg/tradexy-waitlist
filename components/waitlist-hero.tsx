export function WaitlistHero() {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tx-neon/90">
        Early access
      </p>
      <h1 className="mt-4 bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl sm:leading-tight">
        Join the Tradexy waitlist
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-tx-muted">
        Transparent trading strategies backed by real performance data. Be among
        the first to get access when we launch.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
          Myfxbook-ready
        </span>
        <span className="rounded-full border border-tx-neon/25 bg-tx-neon/10 px-3 py-1 text-xs font-medium text-tx-neon">
          First 500 perks
        </span>
      </div>
    </div>
  );
}
